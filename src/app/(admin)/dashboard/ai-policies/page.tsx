"use client";

import { redirect } from "next/navigation";
import { useEffect } from "react";

export default function AiPoliciesRedirectPage() {
  useEffect(() => {
    redirect("/dashboard/ai-insights");
  }, []);

  return null;
}
