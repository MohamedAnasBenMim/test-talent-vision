"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { ModeToggle } from "./ModeToggle";
import BrandMark from "./BrandMark";
import { cn } from "@/lib/utils";
import {
  LayoutDashboardIcon,
  UsersIcon,
  BriefcaseIcon,
  VideoIcon,
  CalendarIcon,
  SparklesIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  SlidersIcon,
  FilmIcon,
  CpuIcon,
  ZapIcon,
  PlusIcon,
  CheckCircle2Icon,
  ClockIcon,
  GlobeIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  exact?: boolean;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [
      {
        label: "Dashboard",
        href: "/",
        icon: <LayoutDashboardIcon className="size-4 shrink-0" />,
        exact: true,
      },
    ],
  },
  {
    title: "Recruitment",
    items: [
      {
        label: "Positions",
        href: "/dashboard/jobs",
        icon: <BriefcaseIcon className="size-4 shrink-0" />,
      },
      {
        label: "Candidates",
        href: "/dashboard/applications",
        icon: <UsersIcon className="size-4 shrink-0" />,
      },
      {
        label: "Interviews",
        href: "/dashboard",
        icon: <VideoIcon className="size-4 shrink-0" />,
        exact: true,
      },
      {
        label: "Schedule",
        href: "/schedule",
        icon: <CalendarIcon className="size-4 shrink-0" />,
      },
    ],
  },
  {
    title: "Super Tools",
    items: [
      {
        label: "AI Insights",
        href: "/dashboard/ai-insights",
        icon: <SparklesIcon className="size-4 shrink-0" />,
      },
      {
        label: "AI Policies",
        href: "/dashboard/ai-policies",
        icon: <SlidersIcon className="size-4 shrink-0" />,
      },
      {
        label: "Recordings",
        href: "/recordings",
        icon: <FilmIcon className="size-4 shrink-0" />,
      },
    ],
  },
];

function NavLink({
  item,
  isActive,
  isCollapsed,
}: {
  item: NavItem;
  isActive: boolean;
  isCollapsed: boolean;
}) {
  return (
    <Link
      href={item.href}
      title={isCollapsed ? item.label : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-lg py-2 transition-all duration-150",
        isCollapsed ? "justify-center px-2" : "px-3",
        isActive
          ? "bg-primary text-primary-foreground font-semibold shadow-sm shadow-primary/25"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      )}
    >
      <span
        className={cn(
          "transition-colors flex items-center justify-center",
          isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
        )}
      >
        {item.icon}
      </span>
      {!isCollapsed && <span className="flex-1 text-sm font-medium truncate">{item.label}</span>}
      {!isCollapsed && isActive && (
        <ChevronRightIcon className="size-3.5 text-primary-foreground/80 shrink-0" />
      )}
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("tv_sidebar_collapsed");
    if (saved !== null) {
      setIsCollapsed(saved === "true");
    }
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("tv_sidebar_collapsed", String(next));
      return next;
    });
  };

  function isActive(item: NavItem) {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  }

  return (
    <aside
      className={cn(
        "relative flex h-screen shrink-0 flex-col border-r border-sidebar-border bg-card shadow-xs transition-all duration-300 ease-in-out z-20",
        isCollapsed ? "w-16" : "w-60"
      )}
    >
      {/* Header with Logo & Toggle Button */}
      <div
        className={cn(
          "flex h-16 items-center border-b border-sidebar-border px-3 transition-all",
          isCollapsed ? "flex-col justify-center gap-1 py-2" : "justify-between"
        )}
      >
        <Link href="/" className="flex items-center gap-2.5 min-w-0">
          <span className="grid size-9 place-items-center rounded-xl bg-slate-950 shadow-md shadow-primary/20 shrink-0">
            <BrandMark className="size-5" />
          </span>
          {!isCollapsed && (
            <div className="min-w-0 leading-tight">
              <p className="truncate text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                BECARTH.AI
              </p>
              <p className="truncate text-sm font-bold text-foreground">
                TalentVision
              </p>
            </div>
          )}
        </Link>

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleCollapse}
          className={cn(
            "size-8 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground shrink-0",
            isCollapsed ? "size-6" : ""
          )}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRightIcon className="size-4" />
          ) : (
            <ChevronLeftIcon className="size-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-5">
        <div className="space-y-6">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title}>
              {!isCollapsed && (
                <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/70">
                  {section.title}
                </p>
              )}
              <div className="space-y-1">
                {section.items.map((item) => (
                  <NavLink
                    key={item.href + item.label}
                    item={item}
                    isActive={isActive(item)}
                    isCollapsed={isCollapsed}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* AI Engine Status Card Widget */}
        {!isCollapsed && (
          <div className="pt-2">
            <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-purple-500/5 to-transparent p-3 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <CpuIcon className="size-3.5 text-primary" />
                  <span className="text-xs font-bold text-foreground">Gemini 3.6 Engine</span>
                </div>
                <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">Screening Accuracy</span>
                  <span className="font-bold text-foreground">98.4%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary to-emerald-400 rounded-full w-[98%]" />
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                <span className="flex items-center gap-1">
                  <ZapIcon className="size-3 text-amber-500" /> Latency: 220ms
                </span>
                <span>BCT & IFRS</span>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions Shortcuts */}
        {!isCollapsed && (
          <div className="space-y-2 pt-1">
            <p className="px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/70">
              Quick Actions
            </p>
            <div className="grid grid-cols-2 gap-2 px-1">
              <Link
                href="/dashboard/jobs/new"
                className="flex flex-col items-center justify-center rounded-xl border border-primary/20 bg-primary/5 p-2 text-center transition-all hover:bg-primary/10 hover:border-primary/40 group"
              >
                <PlusIcon className="size-4 text-primary group-hover:scale-110 transition-transform mb-0.5" />
                <span className="text-[11px] font-bold text-foreground">New Job</span>
              </Link>
              <Link
                href="/schedule"
                className="flex flex-col items-center justify-center rounded-xl border border-border/80 bg-secondary/30 p-2 text-center transition-all hover:bg-secondary/60 group"
              >
                <CalendarIcon className="size-4 text-muted-foreground group-hover:text-foreground group-hover:scale-110 transition-transform mb-0.5" />
                <span className="text-[11px] font-bold text-foreground">Schedule</span>
              </Link>
            </div>
          </div>
        )}

        {/* Live Audit Trail */}
        {!isCollapsed && (
          <div className="space-y-2 pt-1 pb-2">
            <div className="flex items-center justify-between px-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/70">
                Live Audit Stream
              </p>
              <span className="relative flex size-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full size-2 bg-primary"></span>
              </span>
            </div>
            <div className="space-y-1.5 px-1 text-xs">
              <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-card/60 p-2">
                <span className="rounded-full bg-emerald-500/10 p-1 text-emerald-500 shrink-0">
                  <CheckCircle2Icon className="size-3" />
                </span>
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="font-semibold text-[11px] text-foreground truncate">CV Screening Passed</p>
                  <p className="text-[9px] text-muted-foreground truncate">Python Developer • 94% Match</p>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-card/60 p-2">
                <span className="rounded-full bg-primary/10 p-1 text-primary shrink-0">
                  <ClockIcon className="size-3" />
                </span>
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="font-semibold text-[11px] text-foreground truncate">Interview Active</p>
                  <p className="text-[9px] text-muted-foreground truncate">Live Proctoring Room</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3 bg-secondary/30">
        <div className={cn("flex items-center gap-2", isCollapsed ? "flex-col justify-center" : "justify-between")}>
          <div className="flex items-center gap-2 min-w-0">
            <UserButton afterSignOutUrl="/" />
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="truncate text-xs font-semibold text-foreground">Recruiter Admin</p>
                <p className="truncate text-[10px] text-muted-foreground">Consulting HQ</p>
              </div>
            )}
          </div>
          <ModeToggle />
        </div>
      </div>
    </aside>
  );
}
