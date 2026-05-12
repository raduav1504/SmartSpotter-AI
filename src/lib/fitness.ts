export type Sex = "male" | "female";
export type Goal = "lose" | "maintain" | "gain";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";

const ACTIVITY_MULT: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export function calcBMR(sex: Sex, weightKg: number, heightCm: number, age: number) {
  // Mifflin-St Jeor
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "male" ? base + 5 : base - 161;
}

export function calcDailyTargets(opts: {
  sex: Sex;
  weightKg: number;
  heightCm: number;
  age: number;
  goal: Goal;
  activity: ActivityLevel;
}) {
  const tdee = calcBMR(opts.sex, opts.weightKg, opts.heightCm, opts.age) * ACTIVITY_MULT[opts.activity];
  let calories = tdee;
  if (opts.goal === "lose") calories -= 500;
  if (opts.goal === "gain") calories += 300;
  const protein = Math.round(opts.weightKg * (opts.goal === "gain" ? 2.0 : 1.8));
  return {
    daily_calorie_target: Math.round(calories),
    daily_protein_target: protein,
  };
}
