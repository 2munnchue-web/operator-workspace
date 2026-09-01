import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { startLogin } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import {
  BookOpen,
  ClipboardList,
  FileSearch,
  LayoutDashboard,
  LogOut,
  PanelLeft,
  ScanLine,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";

const menuItems = [
  { id: "overview", icon: LayoutDashboard, label: "Command center", description: "Live operating picture" },
  { id: "work-queue", icon: ClipboardList, label: "Work queue", description: "Tasks and next actions" },
  { id: "tool-areas", icon: ScanLine, label: "Tool areas", description: "Your modular workspaces" },
  { id: "evidence", icon: FileSearch, label: "Evidence desk", description: "Notes and findings" },
  { id: "guide", icon: BookOpen, label: "Guide / ask", description: "Contextual help" },
];

const SIDEBAR_WIDTH_KEY = "operator-sidebar-width";
const DEFAULT_WIDTH = 268;
const MIN_WIDTH = 220;
const MAX_WIDTH = 420;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) return <DashboardLayoutSkeleton />;

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0d1117] text-slate-100 flex items-center justify-center px-6">
        <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-800 bg-[#121923] p-8 shadow-2xl shadow-black/30">
          <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="relative flex flex-col items-center gap-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Operator Workspace</p>
              <h1 className="text-2xl font-semibold tracking-tight">Your secure console is ready.</h1>
              <p className="mt-3 text-sm leading-6 text-slate-400">Sign in to access your task queue, tool areas, evidence desk, and contextual guide.</p>
            </div>
            <Button onClick={() => startLogin()} size="lg" className="w-full bg-cyan-300 text-slate-950 hover:bg-cyan-200">Sign in to continue</Button>
            <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Authorized work only · Scope first</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}>
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>{children}</DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = { children: React.ReactNode; setSidebarWidth: (width: number) => void };

function DashboardLayoutContent({ children, setSidebarWidth }: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isResizing) return;
      const left = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const next = event.clientX - left;
      if (next >= MIN_WIDTH && next <= MAX_WIDTH) setSidebarWidth(next);
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  const jumpToSection = (id: string) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-r border-slate-800 bg-[#0f151d]" disableTransition={isResizing}>
          <SidebarHeader className="h-[78px] justify-center border-b border-slate-800/80">
            <div className="flex w-full items-center gap-3 px-2">
              <button onClick={toggleSidebar} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-700/70 bg-slate-900/60 text-slate-400 transition hover:border-cyan-300/40 hover:text-cyan-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300" aria-label="Toggle navigation">
                <PanelLeft className="h-4 w-4" />
              </button>
              {!isCollapsed && (
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.9)]" />
                    <span className="truncate text-sm font-semibold tracking-tight text-slate-100">Operator Workspace</span>
                  </div>
                  <p className="mt-1 truncate pl-4 text-[10px] uppercase tracking-[0.16em] text-slate-500">Local operating system</p>
                </div>
              )}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 px-2 py-4">
            {!isCollapsed && <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Workspace</p>}
            <SidebarMenu className="gap-1">
              {menuItems.map(item => {
                const active = activeSection === item.id;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton isActive={active} onClick={() => jumpToSection(item.id)} tooltip={item.label} className={`h-11 rounded-xl transition-all ${active ? "bg-cyan-300/10 text-cyan-100 hover:bg-cyan-300/15" : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-100"}`}>
                      <item.icon className={`h-4 w-4 ${active ? "text-cyan-200" : "text-slate-500"}`} />
                      <span className="flex min-w-0 flex-col items-start gap-0.5">
                        <span className="truncate text-sm">{item.label}</span>
                        {!isCollapsed && <span className="truncate text-[10px] font-normal text-slate-500">{item.description}</span>}
                      </span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>

            {!isCollapsed && (
              <div className="mt-auto px-2 pt-8">
                <div className="rounded-2xl border border-amber-200/15 bg-amber-200/[0.04] p-3">
                  <div className="flex items-center gap-2 text-amber-200"><Settings2 className="h-3.5 w-3.5" /><span className="text-[10px] font-semibold uppercase tracking-[0.16em]">Guardrail</span></div>
                  <p className="mt-2 text-xs leading-5 text-slate-400">Confirm authorization and stop conditions before any active testing.</p>
                </div>
              </div>
            )}
          </SidebarContent>

          <SidebarFooter className="border-t border-slate-800/80 p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center gap-3 rounded-xl px-1 py-2 text-left transition hover:bg-slate-800/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 group-data-[collapsible=icon]:justify-center">
                  <Avatar className="h-9 w-9 shrink-0 border border-cyan-300/25 bg-slate-900"><AvatarFallback className="bg-cyan-300/10 text-xs font-semibold text-cyan-200">{user?.name?.charAt(0).toUpperCase() || "O"}</AvatarFallback></Avatar>
                  <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden"><p className="truncate text-sm font-medium text-slate-200">{user?.name || "Operator"}</p><p className="mt-1 truncate text-[11px] text-slate-500">{user?.email || "Private workspace"}</p></div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 border-slate-700 bg-[#151e29] text-slate-100">
                <DropdownMenuItem onClick={logout} className="cursor-pointer text-rose-200 focus:bg-rose-300/10 focus:text-rose-100"><LogOut className="mr-2 h-4 w-4" /><span>Sign out</span></DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div className={`absolute right-0 top-0 z-50 h-full w-1 cursor-col-resize transition-colors hover:bg-cyan-300/20 ${isCollapsed ? "hidden" : ""}`} onMouseDown={() => !isCollapsed && setIsResizing(true)} />
      </div>

      <SidebarInset className="bg-[#0d1117]">
        <header className="sticky top-0 z-40 flex h-[78px] items-center justify-between border-b border-slate-800/80 bg-[#0d1117]/90 px-5 backdrop-blur-xl md:px-8">
          <div className="flex items-center gap-3">
            {isMobile && <SidebarTrigger className="h-9 w-9 rounded-xl border border-slate-700 bg-slate-900 text-slate-300" />}
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300/80">Operations console</p><h1 className="mt-1 text-sm font-semibold text-slate-100">Build a calmer, more accountable way to work.</h1></div>
          </div>
          <div className="hidden items-center gap-2 sm:flex"><div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-[11px] text-slate-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />Workspace synced</div><Button variant="ghost" size="sm" onClick={() => jumpToSection("guide")} className="text-slate-400 hover:bg-slate-800 hover:text-cyan-200"><BookOpen className="mr-2 h-4 w-4" />Ask guide</Button></div>
        </header>
        <main className="flex-1 px-4 py-5 md:px-8 md:py-7">{children}</main>
      </SidebarInset>
    </>
  );
}
