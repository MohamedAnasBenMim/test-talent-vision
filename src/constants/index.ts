import { Clock, Code2, Calendar, Users, Sparkles } from "lucide-react";

export const INTERVIEW_CATEGORY = [
  { id: "live", title: "Live Now", variant: "default" },
  { id: "upcoming", title: "Upcoming Interviews", variant: "outline" },
  { id: "completed", title: "Completed", variant: "secondary" },
  { id: "succeeded", title: "Succeeded", variant: "default" },
  { id: "failed", title: "Failed", variant: "destructive" },
] as const;

export const TIME_SLOTS = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
];

export const QUICK_ACTIONS = [
  {
    icon: Sparkles,
    title: "Create AI Position",
    description: "Generate job, QCM & coding test",
    href: "/dashboard/jobs/new",
    color: "primary",
  },
  {
    icon: Calendar,
    title: "Schedule Interview",
    description: "Invite candidate for assessment",
    href: "/schedule",
    color: "purple-500",
  },
  {
    icon: Users,
    title: "Review Candidates",
    description: "View CV scores & QCM results",
    href: "/dashboard/applications",
    color: "blue-500",
  },
  {
    icon: Sparkles,
    title: "AI Intelligence & Policies",
    description: "Pipeline analytics & AI scoring rules",
    href: "/dashboard/ai-insights",
    color: "emerald-500",
  },
];

export const CODING_QUESTIONS: CodeQuestion[] = [
  {
    id: "hello-world",
    title: "Hello World",
    description:
      'Write a program that displays the message "Hello World !".',
    examples: [
      {
        input: "No input",
        output: "Hello World !",
      },
    ],
    starterCode: {
      javascript: `// Write your code here`,
      python: `# Write your code here`,
      java: `class Main {
    public static void main(String[] args) {
        // Write your code here
    }
}`,
      cpp: `#include <iostream>
using namespace std;

int main() {
    // Write your code here
    return 0;
}`,
    },
    constraints: ["The output must match exactly: Hello World !"],
  },
];

export const LANGUAGES = [
  { id: "javascript", name: "JavaScript" },
  { id: "python", name: "Python" },
  { id: "java", name: "Java" },
  { id: "cpp", name: "C++" },
] as const;

export type LanguageId = (typeof LANGUAGES)[number]["id"];

export interface CodeQuestion {
  id: string;
  title: string;
  description: string;
  examples: Array<{
    input: string;
    output: string;
    explanation?: string;
  }>;
  starterCode: Record<LanguageId, string>;
  constraints?: string[];
}

export type QuickActionType = (typeof QUICK_ACTIONS)[number];
