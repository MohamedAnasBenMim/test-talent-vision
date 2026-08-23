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
      <nav className="flex-1 overflow-y-auto px-2 py-4">
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
