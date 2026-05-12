import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Save } from "lucide-react";
import { toast } from "sonner";
import { checkWorkoutBadges } from "@/lib/badges";

export const Route = createFileRoute("/_authenticated/coach")({
  head: () => ({ meta: [{ title: "Antrenor AI – SmartSpotter AI" }] }),
  component: CoachPage,
});

type Plan = {
  title: string;
  duration_min: number;
  notes: string;
  exercises: { name: string; sets: number; reps: number; weight_kg: number; rest_sec?: number; tip?: string }[];
};

function CoachPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [context, setContext] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);

  const { data: profile } = useQuery({
    enabled: !!user,
    queryKey: ["profile", user?.id],
    queryFn: async () => (await supabase.from("profiles").select("*").eq("user_id", user!.id).single()).data,
  });

  const generate = useMutation({
    mutationFn: async (ctx: string) => {
      const systemPrompt = `Ești un antrenor personal expert. Generează un plan de antrenament bazat pe cererea utilizatorului.
      Răspunde STRICT și DOAR cu un obiect JSON valid, care să respecte EXACT următoarea structură:
      {
        "title": "Nume scurt antrenament",
        "duration_min": 45,
        "notes": "Un scurt sfat general sau de încălzire",
        "exercises": [
          { "name": "Nume exercițiu", "sets": 3, "reps": 12, "weight_kg": 20, "rest_sec": 60, "tip": "sfat execuție" }
        ]
      }
      Nu scrie niciun alt text în afară de JSON. Cererea utilizatorului: `;

      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3',
          prompt: systemPrompt + ctx,
          stream: false,
          format: 'json',
          options: { temperature: 0.7 }
        })
      });

      if (!response.ok) throw new Error(
        response.status === 0 || !response.status
          ? "Ollama nu rulează! Pornește cu: OLLAMA_ORIGINS=* ollama serve"
          : "Eroare la conectarea cu Ollama"
      );

      const out = await response.json();
      return JSON.parse(out.response) as Plan;
    },
    onSuccess: (p) => setPlan(p),
    onError: (e: Error) => toast.error(
      e.message.includes("Failed to fetch")
        ? "Ollama nu rulează! Pornește cu: OLLAMA_ORIGINS=* ollama serve"
        : e.message
    ),
  });

  const saveAsWorkout = async () => {
    if (!plan || !user) return;
    const { data: w, error } = await supabase
      .from("workouts")
      .insert({ user_id: user.id, title: plan.title, notes: plan.notes })
      .select("id").single();
    if (error || !w) return toast.error(error?.message || "Eroare");
    const rows = plan.exercises.map((e, i) => ({
      workout_id: w.id, user_id: user.id,
      name: e.name, sets: e.sets, reps: e.reps, weight_kg: e.weight_kg, position: i,
    }));
    await supabase.from("workout_exercises").insert(rows);
    toast.success("Antrenament salvat în jurnal");
    qc.invalidateQueries({ queryKey: ["workouts"] });
    await checkWorkoutBadges(user.id);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Antrenor AI</h1>
        <p className="text-muted-foreground">Descrie ce vrei să antrenezi, iar Llama 3 îți generează un plan local.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Spune-mi ce vrei</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            rows={4}
            placeholder='ex: "am doar 40 min, mă doare un genunchi, vreau să fac piept și triceps"'
            value={context}
            onChange={(e) => setContext(e.target.value)}
            maxLength={1000}
          />
          <Button
            onClick={() => context.trim() && generate.mutate(context)}
            disabled={generate.isPending || !context.trim()}
          >
            {generate.isPending ? "Llama 3 concepe planul..." : "Generează antrenament"}
          </Button>
        </CardContent>
      </Card>

      {plan && (
        <Card>
          <CardHeader className="flex-row items-start justify-between">
            <div>
              <CardTitle>{plan.title}</CardTitle>
              <p className="text-sm text-muted-foreground">{plan.duration_min} minute</p>
            </div>
            <Button onClick={saveAsWorkout} size="sm"><Save className="mr-2 h-4 w-4" /> Salvează</Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {plan.notes && (
              <div className="rounded-md bg-accent/50 p-3 text-sm">{plan.notes}</div>
            )}
            <ul className="space-y-2">
              {plan.exercises.map((ex, i) => (
                <li key={i} className="rounded-md border p-3">
                  <div className="flex justify-between">
                    <span className="font-medium">{ex.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {ex.sets}×{ex.reps}{ex.weight_kg ? ` @ ${ex.weight_kg}kg` : ""}
                    </span>
                  </div>
                  {ex.tip && <p className="mt-1 text-xs text-muted-foreground">💡 {ex.tip}</p>}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}