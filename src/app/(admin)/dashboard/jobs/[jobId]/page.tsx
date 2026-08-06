import JobDashboardDetail from "@/components/jobs/JobDashboardDetail";

export default function JobDetailPage({ params }: { params: { jobId: string } }) {
  return <JobDashboardDetail jobId={decodeURIComponent(params.jobId)} />;
}
