import JobEditor from "@/components/jobs/JobEditor";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";

export default function NewJobPage() {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <Button asChild variant="ghost">
          <Link href="/dashboard/jobs">
            <ArrowLeftIcon className="size-4" />
            Jobs
          </Link>
        </Button>
      </div>
      <JobEditor />
    </div>
  );
}
