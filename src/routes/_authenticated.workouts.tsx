import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { checkWorkoutBadges } from "@/lib/badges";

export const Route = createFileRoute("/_authenticated/workouts")({
  head: () => ({ meta: [{ title: "Antrenamente – SmartSpotter AI" }] }),
  component: WorkoutsPage,
});

type Exercise = { id?: string; name: string; sets: number; reps: number; weight_kg: number };

function WorkoutsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [exercises, setExercises] = useState<Exercise[]>([{ name: "", sets: 3, reps: 10, weight_kg: 0 }]);

  const { data: workouts } = useQuery({
    enabled: !!user,
    queryKey: ["workouts", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("workouts")
        .select("*, workout_exercises(*)")
        .eq("user_id", user!.id)
        .order("performed_at", { ascending: false });
      return data || [];
    },
  });

  const reset = () => {
    setEditingId(null);
    setTitle("");
    setDate(new Date().toISOString().slice(0, 10));
    setExercises([{ name: "", sets: 3, reps: 10, weight_kg: 0 }]);
  };

  const handleEdit = (w: any) => {
    setEditingId(w.id);
    setTitle(w.title || "");
    setDate(w.performed_at);
    setExercises(
      (w.workout_exercises || []).map((e: any) => ({
        id: e.id,
        name: e.name,
        sets: e.sets,
        reps: e.reps,
        weight_kg: Number(e.weight_kg) || 0,
      })),
    );
    setOpen(true);
  };

  const handleSave = async () => {
    if (!user) return;
    const valid = exercises.filter((e) => e.name.trim());
    if (valid.length === 0) return toast.error("Adaugă cel puțin un exercițiu");

    let workoutId = editingId;
    if (editingId) {
      await supabase.from("workouts").update({ title, performed_at: date }).eq("id", editingId);
      await supabase.from("workout_exercises").delete().eq("workout_id", editingId);
    } else {
      const { data, error } = await supabase
        .from("workouts")
        .insert({ user_id: user.id, title: title || "Antrenament", performed_at: date })
        .select("id")
        .single();
      if (error || !data) return toast.error(error?.message || "Eroare");
      workoutId = data.id;
    }

    const rows = valid.map((e, i) => ({
      workout_id: workoutId!,
      user_id: user.id,
      name: e.name,
      sets: Number(e.sets) || 1,
      reps: Number(e.reps) || 1,
      weight_kg: Number(e.weight_kg) || 0,
      position: i,
    }));
    const { error: exErr } = await supabase.from("workout_exercises").insert(rows);
    if (exErr) return toast.error(exErr.message);

    toast.success(editingId ? "Antrenament actualizat" : "Antrenament salvat");
    setOpen(false);
    reset();
    qc.invalidateQueries({ queryKey: ["workouts"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    await checkWorkoutBadges(user.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Ștergi antrenamentul?")) return;
    await supabase.from("workouts").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["workouts"] });
    toast.success("Șters");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Antrenamente</h1>
          <p className="text-muted-foreground">Istoricul tău de antrenamente.</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Nou</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editează" : "Antrenament nou"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Titlu</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Piept și triceps" />
              </div>
              <div>
                <Label>Data</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Exerciții</Label>
                {exercises.map((ex, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2">
                    <Input
                      className="col-span-5"
                      placeholder="Nume"
                      value={ex.name}
                      onChange={(e) => {
                        const c = [...exercises]; c[i].name = e.target.value; setExercises(c);
                      }}
                    />
                    <Input
                      className="col-span-2" type="number" placeholder="Serii" value={ex.sets}
                      onChange={(e) => { const c = [...exercises]; c[i].sets = +e.target.value; setExercises(c); }}
                    />
                    <Input
                      className="col-span-2" type="number" placeholder="Reps" value={ex.reps}
                      onChange={(e) => { const c = [...exercises]; c[i].reps = +e.target.value; setExercises(c); }}
                    />
                    <Input
                      className="col-span-2" type="number" placeholder="Kg" value={ex.weight_kg}
                      onChange={(e) => { const c = [...exercises]; c[i].weight_kg = +e.target.value; setExercises(c); }}
                    />
                    <Button
                      variant="ghost" size="icon" className="col-span-1"
                      onClick={() => setExercises(exercises.filter((_, j) => j !== i))}
                    ><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
                <Button
                  variant="outline" size="sm"
                  onClick={() => setExercises([...exercises, { name: "", sets: 3, reps: 10, weight_kg: 0 }])}
                ><Plus className="mr-1 h-3 w-3" /> Adaugă exercițiu</Button>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSave}>Salvează</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {!workouts || workouts.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Niciun antrenament încă. Adaugă primul!</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {workouts.map((w: any) => (
            <Card key={w.id}>
              <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{w.title || "Antrenament"}</CardTitle>
                  <p className="text-sm text-muted-foreground">{w.performed_at}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => handleEdit(w)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(w.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm">
                  {(w.workout_exercises || []).sort((a: any, b: any) => a.position - b.position).map((e: any) => (
                    <li key={e.id} className="flex justify-between border-b py-1 last:border-0">
                      <span>{e.name}</span>
                      <span className="text-muted-foreground">{e.sets}×{e.reps} @ {e.weight_kg}kg</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
