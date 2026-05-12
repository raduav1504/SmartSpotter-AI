import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Trash2, Pencil, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { checkMealBadge } from "@/lib/badges";

export const Route = createFileRoute("/_authenticated/nutrition")({
  head: () => ({ meta: [{ title: "Nutriție AI – SmartSpotter AI" }] }),
  component: NutritionPage,
});

function NutritionPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const today = format(new Date(), "yyyy-MM-dd");
  const startOfDay = new Date(today + "T00:00:00").toISOString();

  const { data: profile } = useQuery({
    enabled: !!user,
    queryKey: ["profile", user?.id],
    queryFn: async () => (await supabase.from("profiles").select("*").eq("user_id", user!.id).single()).data,
  });

  const { data: meals } = useQuery({
    enabled: !!user,
    queryKey: ["meals", user?.id, today],
    queryFn: async () => {
      const { data } = await supabase
        .from("meals").select("*")
        .eq("user_id", user!.id).gte("eaten_at", startOfDay)
        .order("eaten_at", { ascending: false });
      return data || [];
    },
  });

  // AICI ESTE MAGIA: Am legat interfata de OLLAMA LOCAL!
  const estimate = useMutation({
    mutationFn: async (raw: string) => {
      const systemPrompt = `Ești un nutriționist expert. Calculează matematic valorile nutriționale.
      Răspunde STRICT și DOAR cu un obiect JSON valid. 
      Folosește EXACT aceste 4 chei: "calories", "protein_g", "carbs_g", "fat_g". 
      Valorile trebuie să fie numere. Aliment: `;

      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3', // Modelul nostru local!
          prompt: systemPrompt + raw,
          stream: false,
          format: 'json',
          options: { temperature: 0.0 }
        })
      });

      if (!response.ok) throw new Error("Eroare la conectarea cu Ollama");
      
      const out = await response.json();
      const result = JSON.parse(out.response);
      
      // Returnam in formatul pe care il vrea baza de date
      return {
        calories: result.calories || 0,
        protein_g: result.protein_g || 0,
        carbs_g: result.carbs_g || 0,
        fat_g: result.fat_g || 0,
        items: raw
      };
    },
    onSuccess: async (result) => {
      if (!user) return;
      if (editingId) {
        await supabase.from("meals").update({
          raw_text: text,
          calories: Math.round(result.calories),
          protein_g: result.protein_g,
          carbs_g: result.carbs_g,
          fat_g: result.fat_g,
          items: result.items,
        }).eq("id", editingId);
        toast.success("Masă actualizată");
      } else {
        await supabase.from("meals").insert({
          user_id: user.id,
          raw_text: text,
          calories: Math.round(result.calories),
          protein_g: result.protein_g,
          carbs_g: result.carbs_g,
          fat_g: result.fat_g,
          items: result.items,
        });
        toast.success(`Estimat: ${Math.round(result.calories)} kcal`);
        await checkMealBadge(user.id);
      }
      setText(""); setEditingId(null);
      qc.invalidateQueries({ queryKey: ["meals"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleDelete = async (id: string) => {
    await supabase.from("meals").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["meals"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    toast.success("Șters");
  };

  const handleEdit = (m: any) => {
    setEditingId(m.id);
    setText(m.raw_text);
  };

  const totalCal = (meals || []).reduce((s, m) => s + (m.calories || 0), 0);
  const totalProt = (meals || []).reduce((s, m) => s + Number(m.protein_g || 0), 0);
  const totalCarbs = (meals || []).reduce((s, m) => s + Number(m.carbs_g || 0), 0);
  const totalFat = (meals || []).reduce((s, m) => s + Number(m.fat_g || 0), 0);
  const calTarget = profile?.daily_calorie_target || 2000;
  const protTarget = profile?.daily_protein_target || 120;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Nutriție</h1>
        <p className="text-muted-foreground">Scrie ce ai mâncat — AI-ul local (Llama3) calculează caloriile.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm">Calorii azi</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCal} / {calTarget}</div>
            <Progress value={Math.min(100, (totalCal / calTarget) * 100)} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Proteine azi</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(totalProt)}g / {protTarget}g</div>
            <Progress value={Math.min(100, (totalProt / protTarget) * 100)} className="mt-2" />
            <p className="mt-2 text-xs text-muted-foreground">Carbo: {Math.round(totalCarbs)}g · Grăsimi: {Math.round(totalFat)}g</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Estimator AI</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            rows={3}
            placeholder="ex: o șaorma mică și un măr"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
          />
          <div className="flex gap-2">
            <Button onClick={() => text.trim() && estimate.mutate(text)} disabled={estimate.isPending || !text.trim()}>
              {estimate.isPending ? "Llama3 Analizează..." : editingId ? "Reestimează" : "Estimează & salvează"}
            </Button>
            {editingId && <Button variant="ghost" onClick={() => { setEditingId(null); setText(""); }}>Anulează</Button>}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Mese azi</h2>
        {!meals || meals.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nicio masă încă.</p>
        ) : (
          meals.map((m) => (
            <Card key={m.id}>
              <CardContent className="flex items-start justify-between pt-6">
                <div className="flex-1">
                  <p className="font-medium">{m.raw_text}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {m.calories} kcal · P {Math.round(Number(m.protein_g))}g · C {Math.round(Number(m.carbs_g))}g · G {Math.round(Number(m.fat_g))}g
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => handleEdit(m)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(m.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}