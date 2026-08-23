"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global Error caught:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100 font-sans p-4">
        <div className="max-w-md w-full p-6 text-center rounded-xl bg-slate-800 border border-slate-700 shadow-2xl space-y-4">
          <h2 className="text-xl font-bold text-red-400">Application Error</h2>
          <p className="text-sm text-slate-300 break-words">
            {error.message || "A critical error occurred."}
          </p>
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg text-sm transition"
          >
            Reload Page
          </button>
        </div>
      </body>
    </html>
  );
}
