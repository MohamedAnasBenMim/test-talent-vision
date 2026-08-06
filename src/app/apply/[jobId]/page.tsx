import PublicJobDetail from "@/components/jobs/PublicJobDetail";

export default function JobApplyPage({ params }: { params: { jobId: string } }) {
  return <PublicJobDetail jobId={decodeURIComponent(params.jobId)} />;
}
