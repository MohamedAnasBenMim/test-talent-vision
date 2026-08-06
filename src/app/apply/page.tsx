import ApplicationForm from "@/components/applications/ApplicationForm";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function ApplyPage() {
  return (
    <div className="container mx-auto space-y-6 py-8">
      <section className="mx-auto max-w-5xl rounded-lg border border-border/70 bg-card/85 p-6 shadow-sm shadow-black/20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              General Application
            </p>
            <h1 className="mt-2 text-2xl font-bold">Apply to BECARTH.AI Consulting</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              For best AI matching, apply from a specific job page.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/jobs">View Open Jobs</Link>
          </Button>
        </div>
      </section>
      <ApplicationForm />
    </div>
  );
}
