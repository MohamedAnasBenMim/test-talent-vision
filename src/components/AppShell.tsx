"use client";

import { RedirectToSignIn, SignedIn, SignedOut } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";

function isPublicRoute(pathname: string) {
  return (
    pathname === "/apply" ||
    pathname.startsWith("/apply/") ||
    pathname === "/jobs" ||
    pathname.startsWith("/jobs/")
  );
}

function AppFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="px-4 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}

function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (isPublicRoute(pathname)) {
    return <AppFrame>{children}</AppFrame>;
  }

  return (
    <>
      <SignedIn>
        <AppFrame>{children}</AppFrame>
      </SignedIn>

      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}

export default AppShell;
