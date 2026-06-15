import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { toast } from "sonner";
import { format } from "date-fns";
import { checkWeightBadge } from "@/lib/badges";

export const Route = createFileRoute("/_authenticated/progress")({
  head: () => ({ meta: [{ title: "Progres – SmartSpotter AI" }] }),
  component: ProgressPage,
});

function ProgressPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const [newWeight, setNewWeight] = useState("");

  const { data: profile } = useQuery({
    enabled: !!user,
    queryKey: ["profile", user?.id],
    queryFn: async () => (await supabase.from("profiles").select("*").eq("user_id", user!.id).single()).data,
  });

  const { data: weights } = useQuery({
    enabled: !!user,
    queryKey: ["weights", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("weight_logs").select("*")
        .eq("user_id", user!.id).order("logged_at", { ascending: true });
      return data || [];
    },
  });

  const addWeight = async () => {
    const w = parseFloat(newWeight);
    if (!user || !w || w < 30 || w > 300) return toast.error("Greutate invalida");
    await supabase.from("weight_logs").upsert(
      { user_id: user.id, logged_at: today, weight_kg: w },
      { onConflict: "user_id,logged_at" },
    );
    await supabase.from("profiles").update({ weight_kg: w }).eq("user_id", user.id);
    setNewWeight("");
    qc.invalidateQueries({ queryKey: ["weights"] });
    qc.invalidateQueries({ queryKey: ["profile"] });
    toast.success("Greutate inregistrata");
    if (profile?.goal) await checkWeightBadge(user.id, profile.goal);
  };

  const chartData = (weights || []).map((w) => ({
    date: format(new Date(w.logged_at), "dd/MM"),
    kg: Number(w.weight_kg),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Progres</h1>
        <p className="text-muted-foreground">Urmareste evolutia greutatii tale.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Greutate</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label>Greutate curenta (kg)</Label>
              <Input type="number" step="0.1" value={newWeight} onChange={(e) => setNewWeight(e.target.value)} />
            </div>
            <Button onClick={addWeight}>Inregistreaza</Button>
          </div>

          {chartData.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="date" stroke="var(--color-muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={12} domain={["auto", "auto"]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                    }}
                  />
                  <Line type="monotone" dataKey="kg" stroke="var(--color-primary)" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Inregistreaza greutatea ca sa vezi graficul.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
