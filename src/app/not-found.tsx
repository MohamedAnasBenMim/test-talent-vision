import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full p-6 text-center rounded-xl border border-border/70 bg-card shadow-xl space-y-4">
        <h1 className="text-4xl font-extrabold text-primary">404</h1>
        <h2 className="text-xl font-bold text-foreground">Page Not Found</h2>
        <p className="text-sm text-muted-foreground">
          The page or interview room you are looking for does not exist or has been moved.
        </p>
        <div className="pt-2">
          <Button asChild variant="default">
            <Link href="/">Return to Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
