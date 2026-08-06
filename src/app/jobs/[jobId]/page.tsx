import PublicJobDetail from "@/components/jobs/PublicJobDetail";

export default function PublicJobPage({ params }: { params: { jobId: string } }) {
  return <PublicJobDetail jobId={decodeURIComponent(params.jobId)} />;
}
