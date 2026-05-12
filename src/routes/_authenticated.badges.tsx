import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { BADGE_LABELS } from "@/lib/badges";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/badges")({
  head: () => ({ meta: [{ title: "Insigne – SmartSpotter AI" }] }),
  component: BadgesPage,
});

function BadgesPage() {
  const { user } = useAuth();
  const { data: earned } = useQuery({
    enabled: !!user,
    queryKey: ["badges", user?.id],
    queryFn: async () =>
      (await supabase.from("badges").select("*").eq("user_id", user!.id)).data || [],
  });

  const earnedMap = new Map((earned || []).map((b) => [b.code, b.earned_at]));
  const allCodes = Object.keys(BADGE_LABELS);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Insigne</h1>
        <p className="text-muted-foreground">Câștigă insigne pe măsură ce progresezi.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {allCodes.map((code) => {
          const meta = BADGE_LABELS[code];
          const date = earnedMap.get(code);
          const has = !!date;
          return (
            <Card key={code} className={has ? "" : "opacity-50"}>
              <CardContent className="flex items-start gap-3 pt-6">
                <div className="text-3xl">{meta.emoji}</div>
                <div className="flex-1">
                  <p className="font-semibold">{meta.name}</p>
                  <p className="text-sm text-muted-foreground">{meta.description}</p>
                  {has && date && (
                    <p className="mt-1 text-xs text-primary">Câștigată {format(new Date(date), "dd/MM/yyyy")}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
