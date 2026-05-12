import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Dumbbell, Brain, Apple, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-accent/20">
      <header className="container mx-auto flex items-center justify-between px-4 py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Dumbbell className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold">SmartSpotter AI</span>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="ghost">
            <Link to="/auth">Autentificare</Link>
          </Button>
          <Button asChild>
            <Link to="/auth">Începe gratuit</Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        <section className="mx-auto max-w-3xl text-center">
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl">
            Antrenorul și nutriționistul tău,{" "}
            <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              pe AI
            </span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            SmartSpotter AI îți generează planuri de antrenament personalizate și estimează automat
            caloriile din ce mănânci — totul într-o singură aplicație.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Creează cont gratuit</Link>
            </Button>
          </div>
        </section>

        <section className="mt-24 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Brain, title: "Antrenor AI", desc: "Spune ce vrei, primești un plan adaptat." },
            { icon: Apple, title: "Estimator macro", desc: "Scrie ce ai mâncat, AI calculează caloriile." },
            { icon: Dumbbell, title: "Jurnal antrenamente", desc: "Urmărește seriile și progresul." },
            { icon: TrendingUp, title: "Progres greutate", desc: "Grafice și insigne motivaționale." },
          ].map((f) => (
            <Link
              key={f.title}
              to="/auth"
              className="rounded-2xl border bg-card p-6 shadow-sm transition hover:border-primary/40 hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}
