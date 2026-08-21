import StreamClientProvider from "@/components/providers/StreamClientProvider";

function MeetingLayout({ children }: { children: React.ReactNode }) {
  return <StreamClientProvider>{children}</StreamClientProvider>;
}

export default MeetingLayout;
