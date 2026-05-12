import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Dumbbell, Apple, Droplet, Award } from "lucide-react";
import { BADGE_LABELS } from "@/lib/badges";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard – SmartSpotter AI" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
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

  if (!data) return <div className="text-muted-foreground">Se încarcă...</div>;
  const profile = data.profile;
  if (profile && !profile.onboarded) {
    return (
      <Card>
        <CardHeader><CardTitle>Finalizează profilul</CardTitle></CardHeader>
        <CardContent>
          <Button asChild><Link to="/onboarding">Completează acum</Link></Button>
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Salut, {profile?.full_name || "atlet"} 👋</h1>
        <p className="text-muted-foreground">Iată progresul tău de azi.</p>
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
        <StatCard
          icon={<Droplet className="h-5 w-5" />}
          label="Apă"
          value={`${waterMl}ml / ${waterTarget}ml`}
          progress={(waterMl / waterTarget) * 100}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Ultimele antrenamente</CardTitle>
            <Button asChild variant="ghost" size="sm"><Link to="/workouts">Vezi tot</Link></Button>
          </CardHeader>
          <CardContent>
            {data.workouts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Niciun antrenament înregistrat încă.</p>
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
              <p className="text-sm text-muted-foreground">Antrenează-te pentru a câștiga insigne!</p>
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
        <p className="mt-1 text-xs text-muted-foreground">{Math.round(progress)}% din țintă</p>
      </CardContent>
    </Card>
  );
}
