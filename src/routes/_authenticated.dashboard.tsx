import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Dumbbell, Apple, Droplet, Award, Plus, Minus } from "lucide-react";
import { BADGE_LABELS } from "@/lib/badges";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard – SmartSpotter AI" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const startOfDay = `${today}T00:00:00`;

  const { data } = useQuery({
    enabled: !!user,
    queryKey: ["dashboard", user?.id, today],
    queryFn: async () => {
      const [profile, meals, water, workouts, badges] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user!.id).single(),
        supabase.from("meals").select("calories,protein_g").eq("user_id", user!.id).gte("eaten_at", startOfDay),
        supabase.from("water_intake").select("amount_ml").eq("user_id", user!.id).eq("day", today).maybeSingle(),
        supabase.from("workouts").select("id,title,performed_at").eq("user_id", user!.id).order("performed_at", { ascending: false }).limit(3),
        supabase.from("badges").select("code,earned_at").eq("user_id", user!.id).order("earned_at", { ascending: false }).limit(4),
      ]);
      return { profile: profile.data, meals: meals.data || [], water: water.data, workouts: workouts.data || [], badges: badges.data || [] };
    },
  });

  if (!data) return <div className="text-muted-foreground">Se incarca...</div>;
  const profile = data.profile;
  if (profile && !profile.onboarded) {
    return (
      <Card>
        <CardHeader><CardTitle>Finalizeaza profilul</CardTitle></CardHeader>
        <CardContent>
          <Button asChild><Link to="/onboarding">Completeaza acum</Link></Button>
        </CardContent>
      </Card>
    );
  }

  const totalCal = data.meals.reduce((s, m) => s + (m.calories || 0), 0);
  const totalProt = data.meals.reduce((s, m) => s + Number(m.protein_g || 0), 0);
  const waterMl = data.water?.amount_ml || 0;
  const calTarget = profile?.daily_calorie_target || 2000;
  const protTarget = profile?.daily_protein_target || 120;
  const waterTarget = profile?.daily_water_ml_target || 2500;

  const updateWater = async (delta: number) => {
    const newAmount = Math.max(0, waterMl + delta);
    const { error } = await supabase.from("water_intake").upsert(
      { user_id: user!.id, day: today, amount_ml: newAmount },
      { onConflict: "user_id,day" }
    );
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    if (delta > 0) toast.success(`+${delta}ml adaugat`);
    else toast.success(`${delta}ml scazut`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Salut, {profile?.full_name || "atlet"} 👋</h1>
        <p className="text-muted-foreground">Iata progresul tau de azi.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          icon={<Apple className="h-5 w-5" />}
          label="Calorii"
          value={`${totalCal} / ${calTarget}`}
          progress={(totalCal / calTarget) * 100}
        />
        <StatCard
          icon={<Dumbbell className="h-5 w-5" />}
          label="Proteine"
          value={`${Math.round(totalProt)}g / ${protTarget}g`}
          progress={(totalProt / protTarget) * 100}
        />
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Droplet className="h-5 w-5" /> Apa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{waterMl}ml / {waterTarget}ml</div>
            <Progress value={Math.min(100, (waterMl / waterTarget) * 100)} className="mt-2" />
            <p className="mt-1 text-xs text-muted-foreground">{Math.round((waterMl / waterTarget) * 100)}% din tinta</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => updateWater(250)}>
                <Plus className="h-3 w-3 mr-1" /> 250ml
              </Button>
              <Button size="sm" variant="outline" onClick={() => updateWater(500)}>
                <Plus className="h-3 w-3 mr-1" /> 500ml
              </Button>
              <Button size="sm" variant="outline" onClick={() => updateWater(-250)}>
                <Minus className="h-3 w-3 mr-1" /> 250ml
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Ultimele antrenamente</CardTitle>
            <Button asChild variant="ghost" size="sm"><Link to="/workouts">Vezi tot</Link></Button>
          </CardHeader>
          <CardContent>
            {data.workouts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Niciun antrenament inregistrat inca.</p>
            ) : (
              <ul className="space-y-2">
                {data.workouts.map((w) => (
                  <li key={w.id} className="flex justify-between rounded-md border p-3">
                    <span className="font-medium">{w.title || "Antrenament"}</span>
                    <span className="text-sm text-muted-foreground">{w.performed_at}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><Award className="h-4 w-4" /> Insigne</CardTitle>
            <Button asChild variant="ghost" size="sm"><Link to="/badges">Vezi tot</Link></Button>
          </CardHeader>
          <CardContent>
            {data.badges.length === 0 ? (
              <p className="text-sm text-muted-foreground">Antreneaza-te pentru a castiga insigne!</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {data.badges.map((b) => {
                  const meta = BADGE_LABELS[b.code];
                  return (
                    <Badge key={b.code} variant="secondary" className="gap-1">
                      <span>{meta?.emoji}</span>{meta?.name || b.code}
                    </Badge>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, progress }: { icon: React.ReactNode; label: string; value: string; progress: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {icon} {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <Progress value={Math.min(100, progress)} className="mt-2" />
        <p className="mt-1 text-xs text-muted-foreground">{Math.round(progress)}% din tinta</p>
      </CardContent>
    </Card>
  );
}
