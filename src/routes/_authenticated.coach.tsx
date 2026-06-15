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

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

async function callGemini(prompt: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.7,
        },
      }),
    }
  );
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Eroare Gemini: ${response.status}`);
  }
  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

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
      const prompt = `Esti un antrenor personal expert. Genereaza un plan de antrenament PERSONALIZAT bazat pe profilul si cererea utilizatorului.

PROFILUL UTILIZATORULUI:
- Varsta: ${profile?.age} ani
- Greutate: ${profile?.weight_kg}kg
- Inaltime: ${profile?.height_cm}cm
- Sex: ${profile?.sex}
- Obiectiv: ${profile?.goal === 'lose' ? 'slabire' : profile?.goal === 'gain' ? 'masa musculara' : 'mentinere'}
- Nivel activitate: ${profile?.activity_level}

REGULI OBLIGATORII:
1. Adapteaza greutatile sugerate la greutatea corporala a utilizatorului (ex: nu sugera 100kg la cineva de 60kg)
2. Daca obiectivul e slabire: mai multe repetari, pauze scurte, exercitii compuse
3. Daca obiectivul e masa musculara: greutati mai mari, pauze mai lungi, volum crescut
4. Daca utilizatorul mentioneaza o leziune sau limitare, EVITA complet exercitiile care implica zona respectiva
5. Raspunde STRICT si DOAR cu JSON valid

Format raspuns:
{
  "title": "Nume scurt antrenament",
  "duration_min": numar,
  "notes": "sfat personalizat bazat pe obiectivul utilizatorului",
  "exercises": [
    { "name": "Nume exercitiu", "sets": numar, "reps": numar, "weight_kg": numar, "rest_sec": numar, "tip": "sfat executie" }
  ]
}

Cererea utilizatorului: ${ctx}`;

      const raw = await callGemini(prompt);
      return JSON.parse(raw) as Plan;
    },
    onSuccess: (p) => setPlan(p),
    onError: (e: Error) => toast.error(e.message),
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
    toast.success("Antrenament salvat in jurnal");
    qc.invalidateQueries({ queryKey: ["workouts"] });
    await checkWorkoutBadges(user.id);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Antrenor AI</h1>
        <p className="text-muted-foreground">Descrie ce vrei sa antrenezi, iar Gemini iti genereaza un plan personalizat pe profilul tau.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Spune-mi ce vrei</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            rows={4}
            placeholder='ex: "am doar 40 min, ma doare un genunchi, vreau sa fac piept si triceps"'
            value={context}
            onChange={(e) => setContext(e.target.value)}
            maxLength={1000}
          />
          <Button
            onClick={() => context.trim() && generate.mutate(context)}
            disabled={generate.isPending || !context.trim()}
          >
            {generate.isPending ? "Gemini concepe planul..." : "Genereaza antrenament"}
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
            <Button onClick={saveAsWorkout} size="sm"><Save className="mr-2 h-4 w-4" /> Salveaza</Button>
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
                      {ex.sets}x{ex.reps}{ex.weight_kg ? ` @ ${ex.weight_kg}kg` : ""}
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