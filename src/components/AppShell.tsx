"use client";

import { RedirectToSignIn, SignedIn, SignedOut } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { useUserRole } from "@/hooks/useUserRole";

/**
 * Routes that show only the top navbar (no sidebar).
 * These are public-facing pages and full-screen experiences.
 */
function isPublicRoute(pathname: string) {
  return (
    pathname === "/apply" ||
    pathname.startsWith("/apply/") ||
    pathname === "/jobs" ||
    pathname.startsWith("/jobs/")
  );
}

function isFullScreenRoute(pathname: string) {
  return (
    pathname.startsWith("/meeting/") ||
    pathname.startsWith("/assessment/")
  );
}

/** Public pages: top navbar + content */
function PublicFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="px-4 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}

/** Full-screen pages (meeting, assessment): no chrome at all */
function FullScreenFrame({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

/** Authenticated pages: persistent left sidebar for recruiters, top navbar frame for candidates */
function DashboardFrame({ children }: { children: React.ReactNode }) {
  const { isCandidate } = useUserRole();

  if (isCandidate) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Super Recruiter signature far-left gradient bar */}
      <div className="w-1.5 shrink-0 bg-gradient-to-b from-primary via-purple-500 to-teal-400" />
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-background">
        {children}
      </main>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (isPublicRoute(pathname)) {
    return <PublicFrame>{children}</PublicFrame>;
  }

  if (isFullScreenRoute(pathname)) {
    return <FullScreenFrame>{children}</FullScreenFrame>;
  }

  return (
    <>
      <SignedIn>
        <DashboardFrame>{children}</DashboardFrame>
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}
