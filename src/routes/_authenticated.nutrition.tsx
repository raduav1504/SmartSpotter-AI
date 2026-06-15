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
  head: () => ({ meta: [{ title: "Nutritie AI – SmartSpotter AI" }] }),
  component: NutritionPage,
});

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
          temperature: 0.0,
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

  const estimate = useMutation({
    mutationFn: async (raw: string) => {
      const prompt = `Esti un nutritionist expert. Analizeaza alimentele descrise si estimeaza valorile nutritionale.

REGULI OBLIGATORII:
1. Estimeaza gramele de proteine, carbohidrati si grasimi pentru fiecare aliment in parte
2. Calculeaza caloriile STRICT dupa formula Atwater: calories = (protein_g * 4) + (carbs_g * 4) + (fat_g * 9)
3. Nu inventa valori — foloseste baze de date nutritionale standard
4. Portiile implicite sunt cele romanesti (ex: o saorma mica = ~300g, o felie paine = ~30g)
5. Raspunde DOAR cu JSON valid, fara text in afara

Format raspuns:
{
  "protein_g": numar,
  "carbs_g": numar,
  "fat_g": numar,
  "calories": numar calculat dupa Atwater
}

Alimente: ${raw}`;

      const result = JSON.parse(await callGemini(prompt));
      return {
        calories: result.calories || 0,
        protein_g: result.protein_g || 0,
        carbs_g: result.carbs_g || 0,
        fat_g: result.fat_g || 0,
        items: raw,
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
        toast.success("Masa actualizata");
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
    toast.success("Sters");
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
        <h1 className="text-3xl font-bold">Nutritie</h1>
        <p className="text-muted-foreground">Scrie ce ai mancat — Gemini calculeaza caloriile dupa formula Atwater.</p>
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
            <p className="mt-2 text-xs text-muted-foreground">Carbo: {Math.round(totalCarbs)}g · Grasimi: {Math.round(totalFat)}g</p>
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
            placeholder="ex: o saorma mica si un mar"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
          />
          <div className="flex gap-2">
            <Button onClick={() => text.trim() && estimate.mutate(text)} disabled={estimate.isPending || !text.trim()}>
              {estimate.isPending ? "Gemini analizeaza..." : editingId ? "Reestimeaza" : "Estimeaza & salveaza"}
            </Button>
            {editingId && <Button variant="ghost" onClick={() => { setEditingId(null); setText(""); }}>Anuleaza</Button>}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Mese azi</h2>
        {!meals || meals.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nicio masa inca.</p>
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