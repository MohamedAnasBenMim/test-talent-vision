import ApplicationDetail from "@/components/applications/ApplicationDetail";

export default function ApplicationDetailPage({ params }: { params: { id: string } }) {
  return <ApplicationDetail applicationId={params.id} />;
}
