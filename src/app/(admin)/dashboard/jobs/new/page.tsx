"use client";

import JobEditor from "@/components/jobs/JobEditor";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";

export default function NewJobPage() {
  return (
    <div className="w-full p-4 sm:p-6 lg:p-8 space-y-4">
      <div>
        <Button asChild variant="ghost" size="sm" className="h-8 gap-1 text-xs">
          <Link href="/dashboard/jobs">
            <ArrowLeftIcon className="size-3.5" />
            Back to Jobs
          </Link>
        </Button>
      </div>
      <JobEditor />
    </div>
  );
}
