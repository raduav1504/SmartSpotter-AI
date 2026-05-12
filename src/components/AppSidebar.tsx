import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Dumbbell, Brain, Apple, TrendingUp, User, LogOut, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const items = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/workouts", label: "Antrenamente", icon: Dumbbell },
  { to: "/coach", label: "Antrenor AI", icon: Brain },
  { to: "/nutrition", label: "Nutriție", icon: Apple },
  { to: "/progress", label: "Progres", icon: TrendingUp },
  { to: "/badges", label: "Insigne", icon: Award },
  { to: "/profile", label: "Profil", icon: User },
] as const;

export function AppSidebar() {
  const loc = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <aside className="hidden w-60 shrink-0 border-r bg-sidebar p-4 md:flex md:flex-col">
      <Link to="/dashboard" className="mb-6 flex items-center gap-2 px-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Dumbbell className="h-4 w-4" />
        </div>
        <span className="font-bold">SmartSpotter</span>
      </Link>
      <nav className="flex-1 space-y-1">
        {items.map((it) => {
          const active = loc.pathname.startsWith(it.to);
          return (
            <Link
              key={it.to}
              to={it.to}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              <it.icon className="h-4 w-4" />
              {it.label}
            </Link>
          );
        })}
      </nav>
      <Button variant="ghost" size="sm" onClick={handleLogout} className="mt-2 justify-start gap-2">
        <LogOut className="h-4 w-4" /> Deconectare
      </Button>
    </aside>
  );
}

export function MobileNav() {
  const loc = useLocation();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t bg-sidebar md:hidden">
      {items.slice(0, 5).map((it) => {
        const active = loc.pathname.startsWith(it.to);
        return (
          <Link
            key={it.to}
            to={it.to}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2 text-xs",
              active ? "text-primary" : "text-muted-foreground"
            )}
          >
            <it.icon className="h-5 w-5" />
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
