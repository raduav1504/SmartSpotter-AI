import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const BADGE_LABELS: Record<string, { name: string; emoji: string; description: string }> = {
  first_workout: { name: "Primul antrenament", emoji: "🏋️", description: "Ai înregistrat primul antrenament!" },
  streak_3_days: { name: "3 zile la rând", emoji: "🔥", description: "3 zile consecutive de antrenament!" },
  streak_7_days: { name: "O săptămână", emoji: "💪", description: "7 zile consecutive de antrenament!" },
  first_meal_logged: { name: "Prima masă", emoji: "🥗", description: "Ai înregistrat prima masă." },
  hydration_goal_met: { name: "Hidratat", emoji: "💧", description: "Ai atins obiectivul de hidratare!" },
  weight_milestone: { name: "Progres greutate", emoji: "📉", description: "1kg progres spre obiectiv!" },
};

async function awardBadge(userId: string, code: string) {
  const { data: existing } = await supabase
    .from("badges")
    .select("id")
    .eq("user_id", userId)
    .eq("code", code)
    .maybeSingle();
  if (existing) return;
  const { error } = await supabase.from("badges").insert({ user_id: userId, code });
  if (!error) {
    const b = BADGE_LABELS[code];
    if (b) toast.success(`${b.emoji} Insignă nouă: ${b.name}`, { description: b.description });
  }
}

export async function checkWorkoutBadges(userId: string) {
  const { data: workouts } = await supabase
    .from("workouts")
    .select("performed_at")
    .eq("user_id", userId)
    .order("performed_at", { ascending: false })
    .limit(30);
  if (!workouts || workouts.length === 0) return;

  if (workouts.length >= 1) await awardBadge(userId, "first_workout");

  const days = Array.from(new Set(workouts.map((w) => w.performed_at))).sort().reverse();
  let streak = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1]);
    const curr = new Date(days[i]);
    const diff = Math.round((prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 1) streak++;
    else break;
  }
  if (streak >= 3) await awardBadge(userId, "streak_3_days");
  if (streak >= 7) await awardBadge(userId, "streak_7_days");
}

export async function checkMealBadge(userId: string) {
  await awardBadge(userId, "first_meal_logged");
}

export async function checkHydrationBadge(userId: string, target: number) {
  const { data } = await supabase
    .from("water_intake")
    .select("amount_ml, day")
    .eq("user_id", userId)
    .order("day", { ascending: false })
    .limit(3);
  if (data && data.length >= 3 && data.every((d) => d.amount_ml >= target)) {
    await awardBadge(userId, "hydration_goal_met");
  }
}

export async function checkWeightBadge(userId: string, goal: string) {
  const { data } = await supabase
    .from("weight_logs")
    .select("weight_kg, logged_at")
    .eq("user_id", userId)
    .order("logged_at", { ascending: true });
  if (!data || data.length < 2) return;
  const first = Number(data[0].weight_kg);
  const last = Number(data[data.length - 1].weight_kg);
  const diff = Math.abs(first - last);
  if (diff >= 1 && ((goal === "lose" && last < first) || (goal === "gain" && last > first))) {
    await awardBadge(userId, "weight_milestone");
  }
}
