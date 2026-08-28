import Link from "next/link";
import { ModeToggle } from "./ModeToggle";
import { SignedIn, UserButton } from "@clerk/nextjs";
import DasboardBtn from "./DasboardBtn";
import RoleSwitcher from "./RoleSwitcher";
import BrandMark from "./BrandMark";
import { SparklesIcon } from "lucide-react";

function Navbar() {
  return (
    <nav className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur-md shadow-2xs">
      <div className="flex h-16 items-center justify-between px-6 container mx-auto">
        <Link
          href="/"
          className="flex items-center gap-3 hover:opacity-90 transition-opacity"
        >
          <span className="grid size-9 place-items-center rounded-xl bg-slate-950 shadow-md shadow-primary/20">
            <BrandMark className="size-5" />
          </span>
          <span className="leading-tight">
            <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
              BECARTH.AI
            </span>
            <span className="block text-base font-bold text-foreground">TalentVision</span>
          </span>
        </Link>

        <SignedIn>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary border border-primary/20">
              <SparklesIcon className="size-3.5" />
              Super Recruiter Suite
            </span>
            <RoleSwitcher />
            <DasboardBtn />
            <ModeToggle />
            <UserButton />
          </div>
        </SignedIn>
      </div>
    </nav>
  );
}
export default Navbar;
