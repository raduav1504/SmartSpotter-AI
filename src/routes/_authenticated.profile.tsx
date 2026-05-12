import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { calcDailyTargets, type Goal, type Sex, type ActivityLevel } from "@/lib/fitness";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profil – SmartSpotter AI" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<any>(null);

  const { data: profile } = useQuery({
    enabled: !!user,
    queryKey: ["profile", user?.id],
    queryFn: async () => (await supabase.from("profiles").select("*").eq("user_id", user!.id).single()).data,
  });

  useEffect(() => { if (profile && !form) setForm(profile); }, [profile, form]);
  if (!form) return <div className="text-muted-foreground">Se încarcă...</div>;

  const handleSave = async () => {
    const targets = calcDailyTargets({
      sex: form.sex as Sex,
      weightKg: Number(form.weight_kg),
      heightCm: Number(form.height_cm),
      age: Number(form.age),
      goal: form.goal as Goal,
      activity: form.activity_level as ActivityLevel,
    });
    const { error } = await supabase.from("profiles").update({
      full_name: form.full_name, sex: form.sex, age: Number(form.age),
      height_cm: Number(form.height_cm), weight_kg: Number(form.weight_kg),
      goal: form.goal, activity_level: form.activity_level,
      daily_water_ml_target: Number(form.daily_water_ml_target) || 2500,
      ...targets,
    }).eq("user_id", user!.id);
    if (error) return toast.error(error.message);
    toast.success(`Profil actualizat. Țintă: ${targets.daily_calorie_target} kcal`);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Profil</h1>
      <Card>
        <CardHeader><CardTitle>Datele tale</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Nume</Label>
            <Input value={form.full_name || ""} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Sex</Label>
            <Select value={form.sex || ""} onValueChange={(v) => setForm({ ...form, sex: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Bărbat</SelectItem>
                <SelectItem value="female">Femeie</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Vârstă</Label><Input type="number" value={form.age || ""} onChange={(e) => setForm({ ...form, age: e.target.value })} /></div>
          <div className="space-y-2"><Label>Înălțime (cm)</Label><Input type="number" value={form.height_cm || ""} onChange={(e) => setForm({ ...form, height_cm: e.target.value })} /></div>
          <div className="space-y-2"><Label>Greutate (kg)</Label><Input type="number" step="0.1" value={form.weight_kg || ""} onChange={(e) => setForm({ ...form, weight_kg: e.target.value })} /></div>
          <div className="space-y-2">
            <Label>Obiectiv</Label>
            <Select value={form.goal || ""} onValueChange={(v) => setForm({ ...form, goal: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="lose">Slăbire</SelectItem>
                <SelectItem value="maintain">Menținere</SelectItem>
                <SelectItem value="gain">Masă musculară</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Activitate</Label>
            <Select value={form.activity_level || "moderate"} onValueChange={(v) => setForm({ ...form, activity_level: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sedentary">Sedentar</SelectItem>
                <SelectItem value="light">Ușor</SelectItem>
                <SelectItem value="moderate">Moderat</SelectItem>
                <SelectItem value="active">Activ</SelectItem>
                <SelectItem value="very_active">Foarte activ</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Țintă apă (ml)</Label><Input type="number" value={form.daily_water_ml_target || ""} onChange={(e) => setForm({ ...form, daily_water_ml_target: e.target.value })} /></div>
          <div className="sm:col-span-2 flex justify-between">
            <Button onClick={handleSave}>Salvează</Button>
            <Button variant="outline" onClick={handleLogout}>Deconectare</Button>
          </div>
        </CardContent>
      </Card>
      <p className="text-sm text-muted-foreground">
        Țintă curentă: {profile?.daily_calorie_target} kcal · {profile?.daily_protein_target}g proteine
      </p>
    </div>
  );
}
