"use client";

import React from "react";

type FormattedMarkdownProps = {
  content: string;
  className?: string;
};

export default function FormattedMarkdown({ content, className = "" }: FormattedMarkdownProps) {
  if (!content) return null;

  // Split into lines to parse Markdown line-by-line cleanly
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let currentList: React.ReactNode[] = [];

  const flushList = (keyPrefix: string) => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`ul-${keyPrefix}`} className="my-3 space-y-2 pl-2">
          {currentList}
        </ul>
      );
      currentList = [];
    }
  };

  const renderInlineBold = (text: string): React.ReactNode[] => {
    // Split by ** or __ for bold text
    const parts = text.split(/(\*\*.*?\*\*|__.*?__)/g);
    return parts.map((part, index) => {
      if ((part.startsWith("**") && part.endsWith("**")) || (part.startsWith("__") && part.endsWith("__"))) {
        const clean = part.slice(2, -2);
        return (
          <strong key={index} className="font-bold text-foreground bg-primary/10 dark:bg-primary/20 px-1.5 py-0.5 rounded text-sm">
            {clean}
          </strong>
        );
      }
      return part;
    });
  };

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();

    if (!line) {
      flushList(`${index}`);
      return;
    }

    // Check headers
    if (line.startsWith("# ")) {
      flushList(`${index}`);
      const text = line.replace(/^#\s+/, "").replace(/^\*\*|\*\*$/g, "");
      elements.push(
        <h1 key={index} className="mt-6 mb-3 text-2xl font-black tracking-tight text-foreground border-b border-border/80 pb-2">
          {renderInlineBold(text)}
        </h1>
      );
      return;
    }

    if (line.startsWith("## ")) {
      flushList(`${index}`);
      const text = line.replace(/^##\s+/, "").replace(/^\*\*|\*\*$/g, "");
      elements.push(
        <h2 key={index} className="mt-6 mb-2.5 text-lg font-extrabold tracking-tight text-primary flex items-center gap-2">
          <span className="inline-block size-2 rounded-full bg-primary" />
          {renderInlineBold(text)}
        </h2>
      );
      return;
    }

    if (line.startsWith("### ")) {
      flushList(`${index}`);
      const text = line.replace(/^###\s+/, "").replace(/^\*\*|\*\*$/g, "");
      elements.push(
        <h3 key={index} className="mt-4 mb-2 text-base font-bold text-foreground">
          {renderInlineBold(text)}
        </h3>
      );
      return;
    }

    // Check Bullet items (- item or * item)
    if (line.startsWith("- ") || line.startsWith("* ")) {
      const itemText = line.replace(/^[-*]\s+/, "");
      currentList.push(
        <li key={`li-${index}`} className="flex items-start gap-2.5 text-sm leading-relaxed text-muted-foreground">
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/70" />
          <span>{renderInlineBold(itemText)}</span>
        </li>
      );
      return;
    }

    // Standard paragraph
    flushList(`${index}`);
    elements.push(
      <p key={index} className="my-2 text-sm leading-relaxed text-muted-foreground">
        {renderInlineBold(line)}
      </p>
    );
  });

  flushList("end");

  return <div className={`prose-sm max-w-none space-y-1 ${className}`}>{elements}</div>;
}
