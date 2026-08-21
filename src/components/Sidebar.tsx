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
  MonitorPlayIcon,
  SparklesIcon,
  SettingsIcon,
  ChevronRightIcon,
  SlidersIcon,
  BotIcon,
} from "lucide-react";

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
        icon: <LayoutDashboardIcon className="size-4" />,
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
        icon: <BriefcaseIcon className="size-4" />,
      },
      {
        label: "Candidates",
        href: "/dashboard/applications",
        icon: <UsersIcon className="size-4" />,
      },
      {
        label: "Interviews",
        href: "/dashboard",
        icon: <VideoIcon className="size-4" />,
        exact: true,
      },
      {
        label: "Schedule",
        href: "/schedule",
        icon: <CalendarIcon className="size-4" />,
      },
      {
        label: "Recordings",
        href: "/recordings",
        icon: <MonitorPlayIcon className="size-4" />,
      },
    ],
  },
  {
    title: "Super Tools",
    items: [
      {
        label: "AI Insights",
        href: "/dashboard/ai-insights",
        icon: <SparklesIcon className="size-4" />,
      },
      {
        label: "AI Policies",
        href: "/dashboard/ai-policies",
        icon: <SlidersIcon className="size-4" />,
      },
    ],
  },
];

function NavLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  return (
    <Link
      href={item.href}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
        isActive
          ? "bg-primary text-primary-foreground font-semibold shadow-sm shadow-primary/25"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      )}
    >
      <span
        className={cn(
          "transition-colors",
          isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
        )}
      >
        {item.icon}
      </span>
      <span className="flex-1">{item.label}</span>
      {isActive && (
        <ChevronRightIcon className="size-3.5 text-primary-foreground/80" />
      )}
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();

  function isActive(item: NavItem) {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  }

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-card shadow-xs">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-5">
        <span className="grid size-9 place-items-center rounded-xl bg-slate-950 shadow-md shadow-primary/20">
          <BrandMark className="size-5" />
        </span>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
            BECARTH.AI
          </p>
          <p className="truncate text-sm font-bold text-foreground">
            TalentVision
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-6">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/70">
                {section.title}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <NavLink
                    key={item.href + item.label}
                    item={item}
                    isActive={isActive(item)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border px-4 py-3 bg-secondary/30">
        <div className="flex items-center gap-3">
          <UserButton afterSignOutUrl="/" />
          <div className="flex-1 min-w-0">
            <p className="truncate text-xs font-semibold text-foreground">Recruiter Admin</p>
            <p className="truncate text-[10px] text-muted-foreground">Consulting HQ</p>
          </div>
          <ModeToggle />
        </div>
      </div>
    </aside>
  );
}
