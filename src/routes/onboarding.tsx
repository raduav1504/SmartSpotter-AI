import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { calcDailyTargets, type Goal, type Sex, type ActivityLevel } from "@/lib/fitness";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Configurare profil – SmartSpotter AI" }] }),
  component: Onboarding,
});

const schema = z.object({
  full_name: z.string().trim().min(1, "Necesar").max(100),
  sex: z.enum(["male", "female"]),
  age: z.number().int().min(13).max(120),
  height_cm: z.number().min(100).max(250),
  weight_kg: z.number().min(30).max(300),
  goal: z.enum(["lose", "maintain", "gain"]),
  activity_level: z.enum(["sedentary", "light", "moderate", "active", "very_active"]),
});
type FormData = z.infer<typeof schema>;

function Onboarding() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { sex: "male", goal: "maintain", activity_level: "moderate" },
  });

  if (loading) return null;
  if (!user) {
    navigate({ to: "/auth" });
    return null;
  }

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    const targets = calcDailyTargets({
      sex: data.sex as Sex,
      weightKg: data.weight_kg,
      heightCm: data.height_cm,
      age: data.age,
      goal: data.goal as Goal,
      activity: data.activity_level as ActivityLevel,
    });
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: data.full_name,
        sex: data.sex,
        age: data.age,
        height_cm: data.height_cm,
        weight_kg: data.weight_kg,
        goal: data.goal,
        activity_level: data.activity_level,
        ...targets,
        onboarded: true,
      })
      .eq("user_id", user.id);

    // Initial weight log
    await supabase.from("weight_logs").upsert(
      { user_id: user.id, weight_kg: data.weight_kg },
      { onConflict: "user_id,logged_at" }
    );

    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success(`Profil setat! Țintă zilnică: ${targets.daily_calorie_target} kcal`);
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-accent/20 px-4 py-10">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Hai să te cunoaștem</CardTitle>
          <CardDescription>Completează profilul ca să îți calculăm necesarul caloric.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Nume</Label>
              <Input {...form.register("full_name")} />
            </div>
            <div className="space-y-2">
              <Label>Sex</Label>
              <Select defaultValue="male" onValueChange={(v) => form.setValue("sex", v as Sex)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Bărbat</SelectItem>
                  <SelectItem value="female">Femeie</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Vârstă</Label>
              <Input type="number" {...form.register("age", { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label>Înălțime (cm)</Label>
              <Input type="number" {...form.register("height_cm", { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label>Greutate (kg)</Label>
              <Input type="number" step="0.1" {...form.register("weight_kg", { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label>Obiectiv</Label>
              <Select defaultValue="maintain" onValueChange={(v) => form.setValue("goal", v as Goal)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="lose">Slăbire</SelectItem>
                  <SelectItem value="maintain">Menținere</SelectItem>
                  <SelectItem value="gain">Masă musculară</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nivel activitate</Label>
              <Select
                defaultValue="moderate"
                onValueChange={(v) => form.setValue("activity_level", v as ActivityLevel)}
              >
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
            <Button type="submit" className="sm:col-span-2" disabled={submitting}>
              {submitting ? "Se salvează..." : "Salvează profilul"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
