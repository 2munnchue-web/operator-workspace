import { useAuth } from "@/_core/hooks/useAuth";
import { AIChatBox, Message } from "@/components/AIChatBox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  FileText,
  Filter,
  Flag,
  Flame,
  FolderKanban,
  LockKeyhole,
  Plus,
  Play,
  Radar,
  ScanLine,
  Search,
  ServerCog,
  ShieldCheck,
  Settings2,
  Sparkles,
  Target,
  TerminalSquare,
  UsersRound,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import DashboardLayout from "@/components/DashboardLayout";

const iconMap: Record<string, LucideIcon> = {
  scan: ScanLine,
  shield: ShieldCheck,
  server: ServerCog,
  file: FileText,
  book: BookOpen,
  grid: FolderKanban,
};

const accentStyles: Record<string, { icon: string; glow: string; border: string; badge: string }> = {
  cyan: { icon: "text-cyan-200", glow: "bg-cyan-300/10", border: "border-cyan-300/20", badge: "bg-cyan-300/10 text-cyan-200" },
  amber: { icon: "text-amber-200", glow: "bg-amber-300/10", border: "border-amber-300/20", badge: "bg-amber-300/10 text-amber-200" },
  violet: { icon: "text-violet-200", glow: "bg-violet-300/10", border: "border-violet-300/20", badge: "bg-violet-300/10 text-violet-200" },
  rose: { icon: "text-rose-200", glow: "bg-rose-300/10", border: "border-rose-300/20", badge: "bg-rose-300/10 text-rose-200" },
  green: { icon: "text-emerald-200", glow: "bg-emerald-300/10", border: "border-emerald-300/20", badge: "bg-emerald-300/10 text-emerald-200" },
};

const statusLabel: Record<string, string> = { backlog: "Backlog", active: "In motion", review: "Review", complete: "Complete" };
const nextStatus: Record<string, "backlog" | "active" | "review" | "complete"> = { backlog: "active", active: "review", review: "complete", complete: "backlog" };
const nextScenarioStatus = (status: "draft" | "ready" | "live" | "complete"): "draft" | "ready" | "live" | "complete" => {
  if (status === "draft") return "ready";
  if (status === "ready") return "live";
  if (status === "live") return "complete";
  return "complete";
};

function formatTime(dateValue: Date | string | null | undefined) {
  if (!dateValue) return "—";
  const date = new Date(dateValue);
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
}

export default function Home() {
  const { user } = useAuth();
  const { data, isLoading } = trpc.workspace.snapshot.useQuery(undefined, { enabled: Boolean(user), retry: false });
  const utils = trpc.useUtils();
  const [showComposer, setShowComposer] = useState(false);
  const [showNoteComposer, setShowNoteComposer] = useState(false);
  const [showAreaEditor, setShowAreaEditor] = useState(false);
  const [selectedAreaSlug, setSelectedAreaSlug] = useState("recon");
  const [areaName, setAreaName] = useState("");
  const [areaDescription, setAreaDescription] = useState("");
  const [areaStatus, setAreaStatus] = useState<"ready" | "setup" | "offline">("setup");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteKind, setNoteKind] = useState<"note" | "finding" | "evidence" | "decision">("note");
  const [scenarioTitle, setScenarioTitle] = useState("");
  const [scenarioPhase, setScenarioPhase] = useState<"plan" | "rehearse" | "execute" | "review">("plan");
  const [showScenarioComposer, setShowScenarioComposer] = useState(false);
  const [exerciseChecks, setExerciseChecks] = useState<Record<string, boolean>>({ authorization: true, stopConditions: true, evidencePlan: true, whiteCell: false });
  const [taskTitle, setTaskTitle] = useState("");
  const [taskOwner, setTaskOwner] = useState("You");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskArea, setTaskArea] = useState("lab");
  const [taskPriority, setTaskPriority] = useState<"high" | "medium" | "low">("medium");
  const [taskFilter, setTaskFilter] = useState<"all" | "active" | "review" | "backlog">("all");
  const [guideMessages, setGuideMessages] = useState<Message[]>([
    { role: "assistant", content: "I’m your workspace guide. Ask me how to structure a lab, document an engagement, choose a safe next step, or understand a tool category. I’ll keep the answer scoped to authorized work." },
  ]);

  const createTask = trpc.workspace.createTask.useMutation({
    onSuccess: () => {
      toast.success("Task added to the queue");
      setTaskTitle("");
      setTaskOwner("You");
      setTaskDescription("");
      setShowComposer(false);
      void utils.workspace.snapshot.invalidate();
    },
    onError: error => toast.error(error.message || "Could not create the task"),
  });

  const updateTask = trpc.workspace.setTaskStatus.useMutation({
    onSuccess: () => void utils.workspace.snapshot.invalidate(),
    onError: error => toast.error(error.message || "Could not update the task"),
  });

  const createScenario = trpc.workspace.createScenario.useMutation({
    onSuccess: () => {
      toast.success("Scenario added to the exercise plan");
      setScenarioTitle("");
      setShowScenarioComposer(false);
      void utils.workspace.snapshot.invalidate();
    },
    onError: error => toast.error(error.message || "Could not add the scenario"),
  });
  const setScenarioStatus = trpc.workspace.setScenarioStatus.useMutation({
    onSuccess: () => void utils.workspace.snapshot.invalidate(),
    onError: error => toast.error(error.message || "Could not update scenario status"),
  });

  const updateArea = trpc.workspace.updateToolArea.useMutation({
    onSuccess: () => {
      toast.success("Tool area updated");
      setShowAreaEditor(false);
      void utils.workspace.snapshot.invalidate();
    },
    onError: error => toast.error(error.message || "Could not update the tool area"),
  });

  const createNote = trpc.workspace.createNote.useMutation({
    onSuccess: () => {
      toast.success("Note captured in the evidence desk");
      setNoteTitle("");
      setNoteContent("");
      setShowNoteComposer(false);
      void utils.workspace.snapshot.invalidate();
    },
    onError: error => toast.error(error.message || "Could not save the note"),
  });

  const askGuide = trpc.guide.ask.useMutation({
    onSuccess: response => setGuideMessages(previous => [...previous, { role: "assistant", content: response.content }]),
    onError: error => setGuideMessages(previous => [...previous, { role: "assistant", content: error.message || "The guide could not respond. Try a narrower question." }]),
  });

  const areas = data?.areas ?? [];
  const exercise = data?.exercise;
  const scenarios = exercise?.scenarios ?? [];
  const teams = exercise?.teams ?? [];
  const tasks = data?.tasks ?? [];
  const notes = data?.notes ?? [];
  const areaNames = useMemo(() => Object.fromEntries(areas.map(area => [area.slug, area.name])), [areas]);
  useEffect(() => {
    const selected = areas.find(area => area.slug === selectedAreaSlug) ?? areas[0];
    if (selected && !areaName) {
      setSelectedAreaSlug(selected.slug);
      setAreaName(selected.name);
      setAreaDescription(selected.description ?? "");
      setAreaStatus(selected.status);
    }
  }, [areas, selectedAreaSlug, areaName]);
  const filteredTasks = taskFilter === "all" ? tasks : tasks.filter(task => task.status === taskFilter);
  const activeCount = tasks.filter(task => task.status === "active").length;
  const reviewCount = tasks.filter(task => task.status === "review").length;
  const authorizedCount = tasks.filter(task => task.scopeStatus === "authorized").length;
  const readiness = areas.length ? Math.round((areas.filter(area => area.status === "ready").length / areas.length) * 100) : 0;

  const openAreaEditor = () => {
    const selected = areas.find(area => area.slug === selectedAreaSlug) ?? areas[0];
    if (!selected) return;
    setSelectedAreaSlug(selected.slug);
    setAreaName(selected.name);
    setAreaDescription(selected.description ?? "");
    setAreaStatus(selected.status);
    setShowAreaEditor(true);
  };

  const saveArea = () => {
    if (areaName.trim().length < 2) {
      toast.error("Give the area a clear name");
      return;
    }
    updateArea.mutate({ slug: selectedAreaSlug, name: areaName.trim(), description: areaDescription.trim(), status: areaStatus });
  };

  const toggleExerciseCheck = (key: string) => setExerciseChecks(previous => ({ ...previous, [key]: !previous[key] }));
  const exerciseReady = Object.values(exerciseChecks).every(Boolean);

  const submitScenario = () => {
    if (!exercise || scenarioTitle.trim().length < 3) {
      toast.error("Give the scenario a clear title");
      return;
    }
    createScenario.mutate({ exerciseId: exercise.id, title: scenarioTitle.trim(), phase: scenarioPhase });
  };

  const submitNote = () => {
    if (noteTitle.trim().length < 3 || noteContent.trim().length < 1) {
      toast.error("Add a clear title and a short record");
      return;
    }
    createNote.mutate({ title: noteTitle.trim(), content: noteContent.trim(), kind: noteKind, areaSlug: taskArea || "general" });
  };

  const submitTask = () => {
    if (taskTitle.trim().length < 3) {
      toast.error("Give the task a clear, actionable title");
      return;
    }
    createTask.mutate({ title: taskTitle.trim(), owner: taskOwner.trim() || "You", description: taskDescription.trim() || undefined, areaSlug: taskArea, priority: taskPriority, scopeStatus: "pending" });
  };

  const handleGuideSend = (content: string) => {
    const nextMessages = [...guideMessages, { role: "user" as const, content }];
    setGuideMessages(nextMessages);
    askGuide.mutate({ messages: nextMessages.filter((message): message is Message & { role: "user" | "assistant" } => message.role !== "system").map(({ role, content }) => ({ role, content })), context: "Operator Workspace dashboard. The user is organizing authorized security, defensive monitoring, and isolated lab work." });
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-[1500px] space-y-6">
        <section id="overview" className="scroll-mt-24">
          <div className="relative overflow-hidden rounded-[28px] border border-slate-800 bg-[#121a24] p-6 shadow-2xl shadow-black/10 md:p-8">
            <div className="absolute -right-32 -top-32 h-80 w-80 rounded-full bg-cyan-300/10 blur-3xl" />
            <div className="absolute bottom-0 left-1/3 h-36 w-72 rounded-full bg-violet-300/[0.06] blur-3xl" />
            <div className="relative grid gap-8 lg:grid-cols-[1fr_360px] lg:items-end">
              <div>
                <div className="mb-5 flex flex-wrap items-center gap-2"><Badge className="border border-emerald-300/20 bg-emerald-300/10 text-emerald-200 hover:bg-emerald-300/10"><span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-300" />Session active</Badge><span className="text-xs text-slate-500">Tuesday · September 1, 2026</span></div>
                <h2 className="max-w-2xl text-3xl font-semibold tracking-[-0.03em] text-slate-50 md:text-5xl">Good work starts with a clear <span className="text-cyan-200">operating picture.</span></h2>
                <p className="mt-5 max-w-xl text-sm leading-6 text-slate-400">Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}. Keep scope, evidence, and the next safe action visible at every step.</p>
                <div className="mt-7 flex flex-wrap gap-3"><Button onClick={() => setShowComposer(true)} className="bg-cyan-300 text-slate-950 hover:bg-cyan-200"><Plus className="mr-2 h-4 w-4" />New task</Button><Button variant="outline" onClick={() => document.getElementById("guide")?.scrollIntoView({ behavior: "smooth" })} className="border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800"><Sparkles className="mr-2 h-4 w-4 text-cyan-200" />Ask the guide</Button></div>
              </div>
              <div className="rounded-2xl border border-slate-700/80 bg-slate-950/30 p-4">
                <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-xs font-medium text-slate-300"><Radar className="h-4 w-4 text-cyan-200" />Workspace readiness</div><span className="text-2xl font-semibold text-slate-100">{readiness}%</span></div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-emerald-300 transition-all" style={{ width: `${readiness}%` }} /></div>
                <p className="mt-3 text-xs leading-5 text-slate-500">{areas.filter(area => area.status === "ready").length} of {areas.length || 5} areas are ready. Add the rest as your workflow takes shape.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="exercise" className="scroll-mt-24"><Card className="border-cyan-300/20 bg-[#121a24] shadow-xl shadow-cyan-950/10"><CardHeader className="border-b border-slate-800/80 px-5 py-5 md:px-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2"><Flag className="h-4 w-4 text-cyan-200" /><CardTitle className="text-base text-slate-100">Exercise command center</CardTitle><Badge className="border border-emerald-300/20 bg-emerald-300/10 text-[10px] text-emerald-200 hover:bg-emerald-300/10">{exercise?.authorizationStatus ?? "draft"} authorization</Badge></div><p className="mt-1 text-xs text-slate-500">Plan the event as a shared operating picture, not a collection of disconnected checklists.</p></div><Button size="sm" onClick={() => setShowScenarioComposer(value => !value)} className="bg-cyan-300 text-slate-950 hover:bg-cyan-200"><Plus className="mr-1.5 h-3.5 w-3.5" />{showScenarioComposer ? "Close" : "Add scenario"}</Button></div></CardHeader><CardContent className="space-y-5 p-5 md:p-6"><div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]"><div className="rounded-2xl border border-slate-800 bg-slate-950/20 p-5"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-200">{exercise?.codename ?? "EVENT"}</p><h3 className="mt-2 text-xl font-semibold text-slate-100">{exercise?.name ?? "No exercise selected"}</h3></div><CalendarDays className="h-5 w-5 text-slate-500" /></div><p className="mt-3 text-sm leading-6 text-slate-400">{exercise?.objective}</p><div className="mt-5 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.13em] text-slate-500"><span className="rounded-full border border-slate-700 px-3 py-1">{exercise?.startDate} → {exercise?.endDate}</span><span className="rounded-full border border-slate-700 px-3 py-1">{exercise?.status}</span><span className="rounded-full border border-emerald-300/20 bg-emerald-300/5 px-3 py-1 text-emerald-200">White cell owns safety</span></div><div className="mt-5 border-t border-slate-800/80 pt-4"><div className="flex items-center justify-between"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Readiness gate</p><span className={cn("text-[10px] uppercase tracking-[0.12em]", exerciseReady ? "text-emerald-200" : "text-amber-200")}>{exerciseReady ? "Ready to advance" : "Approval required"}</span></div><div className="mt-3 grid gap-2">{[["authorization", "Authorization is current"], ["stopConditions", "Stop conditions are written"], ["evidencePlan", "Evidence plan is ready"], ["whiteCell", "White Cell approval recorded"]].map(([key, label]) => <button key={key} type="button" onClick={() => toggleExerciseCheck(key)} className="flex items-center gap-2 text-left text-xs text-slate-400 hover:text-slate-200"><span className={cn("flex h-4 w-4 items-center justify-center rounded border", exerciseChecks[key] ? "border-emerald-300/40 bg-emerald-300/10 text-emerald-200" : "border-slate-700 text-transparent")}><Check className="h-3 w-3" /></span>{label}</button>)}</div></div></div><div><div className="mb-3 flex items-center justify-between"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Team lanes</p><span className="text-[10px] text-slate-600">{teams.length} operating groups</span></div><div className="grid gap-3 md:grid-cols-3">{teams.map(team => <div key={team.id} className={cn("rounded-2xl border p-4", team.team === "red" ? "border-rose-300/20 bg-rose-300/[0.04]" : team.team === "blue" ? "border-cyan-300/20 bg-cyan-300/[0.04]" : "border-amber-300/20 bg-amber-300/[0.04]")}><div className="flex items-center justify-between gap-2"><span className="text-sm font-medium text-slate-200">{team.name}</span><UsersRound className="h-4 w-4 text-slate-500" /></div><p className="mt-2 text-[11px] text-slate-500">Lead · {team.lead}</p><p className="mt-3 text-xs leading-5 text-slate-400">{team.objective}</p><p className="mt-3 text-[10px] uppercase tracking-[0.12em] text-slate-600">{team.roster}</p></div>)}</div></div></div><div className="border-t border-slate-800/80 pt-5"><div className="mb-3 flex items-center justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Scenario timeline</p><p className="mt-1 text-xs text-slate-600">Progress from plan → rehearse → execute → review.</p></div><span className="text-[10px] uppercase tracking-[0.12em] text-slate-600">{scenarios.filter(scenario => scenario.status === "complete").length}/{scenarios.length} complete</span></div>{showScenarioComposer && <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.04] p-4 md:flex-row"><Input value={scenarioTitle} onChange={event => setScenarioTitle(event.target.value)} placeholder="Scenario title" className="border-slate-700 bg-slate-950/40 text-slate-100 placeholder:text-slate-600" /><select value={scenarioPhase} onChange={event => setScenarioPhase(event.target.value as typeof scenarioPhase)} className="h-9 rounded-md border border-slate-700 bg-slate-950/40 px-3 text-sm text-slate-200 outline-none"><option value="plan">Plan</option><option value="rehearse">Rehearse</option><option value="execute">Execute</option><option value="review">Review</option></select><Button onClick={submitScenario} disabled={createScenario.isPending} className="bg-cyan-300 text-slate-950 hover:bg-cyan-200">{createScenario.isPending ? "Adding…" : "Add"}</Button></div>}<div className="grid gap-3">{scenarios.map(scenario => <div key={scenario.id} className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/20 p-4 md:flex-row md:items-center md:justify-between"><div className="flex min-w-0 items-start gap-3"><span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-cyan-200"><Play className="h-3.5 w-3.5" /></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-medium text-slate-200">{scenario.title}</p><Badge variant="outline" className="border-slate-700 text-[10px] text-slate-500">{scenario.phase}</Badge></div><p className="mt-1 text-xs text-slate-500">{scenario.successCriteria}</p><p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-amber-200/70">Safety: {scenario.safetyNotes}</p></div></div><Button variant="outline" size="sm" disabled={scenario.status === "complete" || setScenarioStatus.isPending || (nextScenarioStatus(scenario.status) === "live" && !exerciseReady)} onClick={() => setScenarioStatus.mutate({ scenarioId: scenario.id, exerciseId: exercise!.id, status: nextScenarioStatus(scenario.status) })} className="shrink-0 border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800">{scenario.status === "complete" ? "Complete" : nextScenarioStatus(scenario.status) === "live" && !exerciseReady ? "Needs White Cell approval" : `${scenario.status} → ${nextScenarioStatus(scenario.status)}`}</Button></div>)}</div></div></CardContent></Card></section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Workspace summary">
          <MetricCard label="In motion" value={isLoading ? "—" : String(activeCount)} detail="tasks being worked" icon={Zap} tone="cyan" />
          <MetricCard label="Needs review" value={isLoading ? "—" : String(reviewCount)} detail="ready for a decision" icon={Clock3} tone="amber" />
          <MetricCard label="Scope cleared" value={isLoading ? "—" : String(authorizedCount)} detail="tasks with authorization" icon={LockKeyhole} tone="green" />
          <MetricCard label="Evidence notes" value={isLoading ? "—" : String(notes.length)} detail="captured in workspace" icon={FileText} tone="violet" />
        </section>

        <section id="work-queue" className="scroll-mt-24 grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
          <Card className="border-slate-800 bg-[#121a24] shadow-xl shadow-black/5">
            <CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-slate-800/80 px-5 py-5 md:px-6"><div><div className="flex items-center gap-2"><Target className="h-4 w-4 text-cyan-200" /><CardTitle className="text-base text-slate-100">Work queue</CardTitle></div><p className="mt-1 text-xs text-slate-500">Your next actions, organized by momentum.</p></div><div className="flex items-center gap-2"><Button variant="ghost" size="sm" onClick={() => setTaskFilter(taskFilter === "all" ? "active" : "all")} className="text-slate-400 hover:bg-slate-800 hover:text-slate-100"><Filter className="mr-2 h-3.5 w-3.5" />{taskFilter === "all" ? "All work" : statusLabel[taskFilter]}</Button><Button size="sm" onClick={() => setShowComposer(value => !value)} className="bg-slate-100 text-slate-950 hover:bg-white"><Plus className="mr-1.5 h-3.5 w-3.5" />Add</Button></div></CardHeader>
            <CardContent className="p-0">
              {showComposer && <div className="border-b border-cyan-300/15 bg-cyan-300/[0.04] p-5 md:p-6"><div className="grid gap-4 md:grid-cols-[1fr_140px_160px_130px]"><div className="space-y-2"><Label htmlFor="task-title" className="text-xs text-slate-400">Task title</Label><Input id="task-title" value={taskTitle} onChange={event => setTaskTitle(event.target.value)} placeholder="e.g. Validate lab telemetry coverage" className="border-slate-700 bg-slate-950/40 text-slate-100 placeholder:text-slate-600" /></div><div className="space-y-2"><Label htmlFor="task-owner" className="text-xs text-slate-400">Owner</Label><Input id="task-owner" value={taskOwner} onChange={event => setTaskOwner(event.target.value)} placeholder="You" className="border-slate-700 bg-slate-950/40 text-slate-100 placeholder:text-slate-600" /></div><div className="space-y-2"><Label htmlFor="task-area" className="text-xs text-slate-400">Area</Label><select id="task-area" value={taskArea} onChange={event => setTaskArea(event.target.value)} className="h-9 w-full rounded-md border border-slate-700 bg-slate-950/40 px-3 text-sm text-slate-200 outline-none focus:border-cyan-300/50">{areas.map(area => <option key={area.slug} value={area.slug}>{area.name}</option>)}</select></div><div className="space-y-2"><Label htmlFor="task-priority" className="text-xs text-slate-400">Priority</Label><select id="task-priority" value={taskPriority} onChange={event => setTaskPriority(event.target.value as "high" | "medium" | "low")} className="h-9 w-full rounded-md border border-slate-700 bg-slate-950/40 px-3 text-sm text-slate-200 outline-none focus:border-cyan-300/50"><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></div></div><div className="mt-4 flex flex-col gap-3 md:flex-row"><Textarea value={taskDescription} onChange={event => setTaskDescription(event.target.value)} placeholder="Add context, prerequisites, or the evidence you expect to capture…" className="min-h-20 flex-1 border-slate-700 bg-slate-950/40 text-slate-100 placeholder:text-slate-600" /><div className="flex shrink-0 items-end gap-2"><Button variant="ghost" onClick={() => setShowComposer(false)} className="text-slate-400 hover:bg-slate-800 hover:text-slate-100">Cancel</Button><Button onClick={submitTask} disabled={createTask.isPending} className="bg-cyan-300 text-slate-950 hover:bg-cyan-200">{createTask.isPending ? "Adding…" : "Add task"}</Button></div></div></div>}
              <div className="divide-y divide-slate-800/70">{filteredTasks.map(task => <TaskRow key={task.id} task={task} areaName={areaNames[task.areaSlug] ?? task.areaSlug} onAdvance={() => updateTask.mutate({ taskId: task.id, status: nextStatus[task.status] })} isPending={updateTask.isPending} />)}{filteredTasks.length === 0 && <div className="p-10 text-center"><FolderKanban className="mx-auto h-7 w-7 text-slate-600" /><p className="mt-3 text-sm text-slate-400">Nothing in this view yet.</p><p className="mt-1 text-xs text-slate-600">Add a task or change the filter to see more work.</p></div>}</div>
            </CardContent>
          </Card>

          <Card className="border-amber-200/15 bg-[#121a24] shadow-xl shadow-black/5"><CardHeader className="border-b border-slate-800/80 px-5 py-5 md:px-6"><div className="flex items-center gap-2"><CircleAlert className="h-4 w-4 text-amber-200" /><CardTitle className="text-base text-slate-100">Scope checkpoint</CardTitle></div><p className="mt-1 text-xs text-slate-500">A visible pause before action.</p></CardHeader><CardContent className="space-y-5 p-5 md:p-6"><div className="rounded-2xl border border-amber-200/15 bg-amber-200/[0.04] p-4"><p className="text-sm font-medium text-amber-100">Before you touch a target</p><p className="mt-2 text-xs leading-5 text-slate-400">Confirm the asset is in scope, the test window is open, and the owner knows how to stop the work.</p></div><div className="space-y-3">{["Written authorization exists", "Target and time window are explicit", "Stop conditions are documented", "Evidence plan is ready"].map(item => <div key={item} className="flex items-center gap-3 text-xs text-slate-400"><span className="flex h-5 w-5 items-center justify-center rounded-full border border-emerald-300/20 bg-emerald-300/10 text-emerald-200"><Check className="h-3 w-3" /></span>{item}</div>)}</div><Button variant="outline" onClick={() => document.getElementById("evidence")?.scrollIntoView({ behavior: "smooth" })} className="w-full border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800">Open evidence desk<ArrowUpRight className="ml-2 h-3.5 w-3.5" /></Button></CardContent></Card>
        </section>

        <section id="tool-areas" className="scroll-mt-24 space-y-4"><SectionHeading eyebrow="Modular workspace" title="Tool areas that match how you work" description="Each area is a home for tools, checklists, notes, and the decisions around them." action={<Button variant="ghost" size="sm" onClick={openAreaEditor} className="text-slate-400 hover:bg-slate-800 hover:text-cyan-200">Customize areas<SettingsIcon /></Button>} />{showAreaEditor && <div className="grid gap-3 rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.04] p-4 md:grid-cols-[180px_1fr_1.4fr_120px_auto] md:items-end"><div className="space-y-2"><Label htmlFor="area-select" className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Area</Label><select id="area-select" value={selectedAreaSlug} onChange={event => { const selected = areas.find(area => area.slug === event.target.value); setSelectedAreaSlug(event.target.value); setAreaName(selected?.name ?? ""); setAreaDescription(selected?.description ?? ""); setAreaStatus(selected?.status ?? "setup"); }} className="h-9 w-full rounded-md border border-slate-700 bg-slate-950/40 px-3 text-sm text-slate-200 outline-none">{areas.map(area => <option key={area.slug} value={area.slug}>{area.name}</option>)}</select></div><div className="space-y-2"><Label htmlFor="area-name" className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Name</Label><Input id="area-name" value={areaName} onChange={event => setAreaName(event.target.value)} className="border-slate-700 bg-slate-950/40 text-slate-100" /></div><div className="space-y-2"><Label htmlFor="area-description" className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Description</Label><Input id="area-description" value={areaDescription} onChange={event => setAreaDescription(event.target.value)} className="border-slate-700 bg-slate-950/40 text-slate-100" /></div><div className="space-y-2"><Label htmlFor="area-status" className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Status</Label><select id="area-status" value={areaStatus} onChange={event => setAreaStatus(event.target.value as typeof areaStatus)} className="h-9 w-full rounded-md border border-slate-700 bg-slate-950/40 px-3 text-sm text-slate-200 outline-none"><option value="ready">Ready</option><option value="setup">Setup</option><option value="offline">Offline</option></select></div><div className="flex gap-2"><Button variant="ghost" size="sm" onClick={() => setShowAreaEditor(false)} className="text-slate-400 hover:bg-slate-800">Cancel</Button><Button size="sm" onClick={saveArea} disabled={updateArea.isPending} className="bg-cyan-300 text-slate-950 hover:bg-cyan-200">{updateArea.isPending ? "Saving…" : "Save"}</Button></div></div>}<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">{areas.map(area => <ToolAreaCard key={area.slug} area={area} />)}</div></section>

        <section id="evidence" className="scroll-mt-24 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]"><Card className="border-slate-800 bg-[#121a24]"><CardHeader className="border-b border-slate-800/80 px-5 py-5 md:px-6"><div className="flex items-center gap-2"><FileText className="h-4 w-4 text-rose-200" /><CardTitle className="text-base text-slate-100">Evidence desk</CardTitle><Button variant="ghost" size="sm" onClick={() => exportEvidence(notes)} className="ml-auto h-7 px-2 text-[10px] uppercase tracking-[0.12em] text-slate-500 hover:bg-slate-800 hover:text-slate-200">Export</Button></div><p className="mt-1 text-xs text-slate-500">Capture the why, what, and proof behind each action.</p></CardHeader><CardContent className="p-5 md:p-6"><div className="space-y-3">{notes.map(note => <div key={note.id} className="rounded-2xl border border-slate-800 bg-slate-950/20 p-4"><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><span className="text-sm font-medium text-slate-200">{note.title}</span><Badge variant="outline" className="border-slate-700 text-[10px] font-normal text-slate-500">{note.kind}</Badge></div><p className="mt-2 text-xs leading-5 text-slate-500">{note.content}</p><p className="mt-3 text-[10px] leading-4 text-slate-600">Source: {note.source || "Operator Workspace"}{note.context ? ` · ${note.context}` : ""}</p></div><span className="shrink-0 text-[10px] uppercase tracking-[0.12em] text-slate-600">{formatTime(note.updatedAt)}</span></div></div>)}{notes.length === 0 && <p className="py-8 text-center text-sm text-slate-500">Your evidence desk is ready for its first note.</p>}</div>{showNoteComposer && <div className="mt-4 space-y-3 rounded-2xl border border-rose-300/15 bg-rose-300/[0.04] p-4"><div className="grid gap-3 md:grid-cols-[1fr_140px]"><Input value={noteTitle} onChange={event => setNoteTitle(event.target.value)} placeholder="Note title" className="border-slate-700 bg-slate-950/40 text-slate-100 placeholder:text-slate-600" /><select value={noteKind} onChange={event => setNoteKind(event.target.value as typeof noteKind)} className="h-9 rounded-md border border-slate-700 bg-slate-950/40 px-3 text-sm text-slate-200 outline-none"><option value="note">Note</option><option value="finding">Finding</option><option value="evidence">Evidence</option><option value="decision">Decision</option></select></div><Textarea value={noteContent} onChange={event => setNoteContent(event.target.value)} placeholder="What happened, what matters, and how can someone verify it?" className="min-h-20 border-slate-700 bg-slate-950/40 text-slate-100 placeholder:text-slate-600" /><div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setShowNoteComposer(false)} className="text-slate-400 hover:bg-slate-800 hover:text-slate-100">Cancel</Button><Button onClick={submitNote} disabled={createNote.isPending} className="bg-rose-200 text-slate-950 hover:bg-rose-100">{createNote.isPending ? "Saving…" : "Save note"}</Button></div></div>}<Button variant="outline" onClick={() => setShowNoteComposer(value => !value)} className="mt-4 w-full border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800"><Plus className="mr-2 h-4 w-4" />{showNoteComposer ? "Close composer" : "Capture a note"}</Button></CardContent></Card><Card id="guide" className="border-cyan-300/20 bg-[#121a24] shadow-xl shadow-cyan-950/10"><CardHeader className="border-b border-slate-800/80 px-5 py-5 md:px-6"><div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-cyan-200" /><CardTitle className="text-base text-slate-100">Guide / ask</CardTitle><Badge className="ml-auto border border-cyan-300/20 bg-cyan-300/10 text-[10px] text-cyan-200 hover:bg-cyan-300/10">Context-aware</Badge></div><p className="mt-1 text-xs text-slate-500">Ask practical questions and keep the answer connected to your selected workflow.</p></CardHeader><CardContent className="p-0"><AIChatBox messages={guideMessages} onSendMessage={handleGuideSend} isLoading={askGuide.isPending} height={390} placeholder="Ask how to structure the next safe step…" suggestedPrompts={["How do I start an isolated lab?", "What should a rules-of-engagement checklist include?", "How do I document a finding clearly?"]} emptyStateMessage="Start with a question about your lab, workflow, or documentation." /></CardContent></Card></section>

        <footer className="flex flex-col gap-3 border-t border-slate-800/80 pt-5 text-[11px] uppercase tracking-[0.16em] text-slate-600 sm:flex-row sm:items-center sm:justify-between"><span>Operator Workspace · v0.1 foundation</span><span className="flex items-center gap-2"><TerminalSquare className="h-3.5 w-3.5" />Built for clarity, accountability, and repeatable work</span></footer>
      </div>
    </DashboardLayout>
  );
}

function exportEvidence(notes: Array<{ title: string; content: string; kind: string; source?: string | null; context?: string | null; areaSlug: string; updatedAt: Date | string }>) {
  const markdown = ["# Operator Workspace Evidence Export", "", `Generated: ${new Date().toISOString()}`, "", ...notes.map(note => `## ${note.title}\n\n- **Type:** ${note.kind}\n- **Area:** ${note.areaSlug}\n- **Source:** ${note.source || "Operator Workspace"}\n- **Updated:** ${formatTime(note.updatedAt)}\n\n${note.content}\n\n_Context: ${note.context || "Not specified."}_\n`)].join("\n");
  const url = URL.createObjectURL(new Blob([markdown], { type: "text/markdown" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `operator-evidence-${new Date().toISOString().slice(0, 10)}.md`;
  anchor.click();
  URL.revokeObjectURL(url);
  toast.success("Evidence export downloaded");
}

function MetricCard({ label, value, detail, icon: Icon, tone }: { label: string; value: string; detail: string; icon: LucideIcon; tone: "cyan" | "amber" | "green" | "violet" }) {
  const tones = { cyan: "text-cyan-200 bg-cyan-300/10", amber: "text-amber-200 bg-amber-300/10", green: "text-emerald-200 bg-emerald-300/10", violet: "text-violet-200 bg-violet-300/10" };
  return <Card className="border-slate-800 bg-[#121a24] shadow-lg shadow-black/5"><CardContent className="flex items-center gap-4 p-4"><div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", tones[tone])}><Icon className="h-4 w-4" /></div><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p><div className="mt-1 flex items-baseline gap-2"><span className="text-2xl font-semibold text-slate-100">{value}</span><span className="truncate text-[11px] text-slate-500">{detail}</span></div></div></CardContent></Card>;
}

function TaskRow({ task, areaName, onAdvance, isPending }: { task: any; areaName: string; onAdvance: () => void; isPending: boolean }) {
  return <div className="group flex items-start gap-4 px-5 py-4 transition hover:bg-slate-900/30 md:px-6"><button aria-label={`Advance task ${task.title}`} onClick={onAdvance} disabled={isPending} className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition", task.status === "complete" ? "border-emerald-300/40 bg-emerald-300/10 text-emerald-200" : "border-slate-700 text-transparent hover:border-cyan-300/50 hover:text-cyan-200")}><Check className="h-3 w-3" /></button><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className={cn("text-sm font-medium text-slate-200", task.status === "complete" && "text-slate-500 line-through")}>{task.title}</p><Badge variant="outline" className={cn("border-slate-700 text-[10px] font-normal", task.priority === "high" ? "text-rose-200" : "text-slate-500")}>{task.priority}</Badge></div><p className="mt-1 line-clamp-1 text-xs text-slate-500">{task.description}</p><div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-[0.12em] text-slate-600"><span>{areaName}</span><span>·</span><span>{task.owner || "Unassigned"}</span><span>·</span><span className={task.scopeStatus === "authorized" ? "text-emerald-300/80" : task.scopeStatus === "blocked" ? "text-rose-300/80" : "text-amber-300/80"}>{task.scopeStatus}</span></div></div><div className="flex shrink-0 flex-col items-end gap-2"><Badge className={cn("border text-[10px] font-medium hover:bg-transparent", task.status === "active" ? "border-cyan-300/20 bg-cyan-300/10 text-cyan-200" : task.status === "review" ? "border-amber-300/20 bg-amber-300/10 text-amber-200" : task.status === "complete" ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-200" : "border-slate-700 bg-slate-800/50 text-slate-400")}>{statusLabel[task.status]}</Badge><span className="text-[10px] text-slate-600">{task.dueDate || "No due date"}</span></div></div>;
}

function ToolAreaCard({ area }: { area: any }) {
  const Icon = iconMap[area.icon] ?? FolderKanban;
  const style = accentStyles[area.accent] ?? accentStyles.cyan;
  return <button onClick={() => toast.info(`${area.name} is your ${area.category.toLowerCase()} workspace.`)} className={cn("group relative overflow-hidden rounded-2xl border bg-[#121a24] p-5 text-left transition duration-200 hover:-translate-y-0.5 hover:bg-[#17222e]", style.border)}><div className={cn("mb-8 flex h-10 w-10 items-center justify-center rounded-xl", style.glow)}><Icon className={cn("h-5 w-5", style.icon)} /></div><div className="flex items-start justify-between gap-2"><div><p className="text-sm font-medium text-slate-100">{area.name}</p><p className="mt-2 text-xs leading-5 text-slate-500">{area.description}</p></div><ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-slate-300" /></div><div className="mt-5 flex items-center justify-between"><span className={cn("rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]", style.badge)}>{area.status}</span><span className="text-[10px] uppercase tracking-[0.12em] text-slate-600">{area.category}</span></div></button>;
}

function SectionHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300/75">{eyebrow}</p><h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-100">{title}</h3><p className="mt-1 text-sm text-slate-500">{description}</p></div>{action}</div>;
}

function SettingsIcon() { return <Settings2 className="ml-2 h-3.5 w-3.5" />; }
