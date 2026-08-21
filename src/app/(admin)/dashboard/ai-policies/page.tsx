"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  SlidersIcon,
  SparklesIcon,
  ShieldCheckIcon,
  SaveIcon,
  CheckCircle2Icon,
  CpuIcon,
  RotateCcwIcon,
} from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

export default function AiPoliciesPage() {
  const [strictness, setStrictness] = useState<"lenient" | "balanced" | "strict">("balanced");
  const [skillsWeight, setSkillsWeight] = useState(40);
  const [experienceWeight, setExperienceWeight] = useState(35);
  const [educationWeight, setEducationWeight] = useState(15);
  const [languageWeight, setLanguageWeight] = useState(10);
  const [customPrompt, setCustomPrompt] = useState(
    "Focus heavily on practical hands-on experience with modern React, TypeScript, and backend APIs. Give bonus points to open source contributions and production app experience."
  );

  const handleSave = () => {
    toast.success("AI Screening Policy saved successfully!");
  };

  return (
    <div className="container mx-auto max-w-7xl p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary border border-primary/20">
              <SlidersIcon className="size-3.5" />
              Policy Engine
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground">
            AI Screening Policies
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure Gemini evaluation weights, strictness thresholds, and custom prompt rules.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => toast.success("Reset to default policies")}>
            <RotateCcwIcon className="size-4" />
            Reset Defaults
          </Button>
          <Button onClick={handleSave}>
            <SaveIcon className="size-4" />
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Strictness & Model Config */}
        <Card className="lg:col-span-2 space-y-6">
          <CardHeader className="py-4 border-b border-border">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <ShieldCheckIcon className="size-5 text-primary" />
              Evaluation Strictness Level
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => setStrictness("lenient")}
                className={`p-4 rounded-xl border text-left transition-all ${
                  strictness === "lenient"
                    ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                    : "border-border bg-card hover:bg-secondary/40"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-foreground">Lenient</span>
                  {strictness === "lenient" && <CheckCircle2Icon className="size-4 text-primary" />}
                </div>
                <p className="text-xs text-muted-foreground">
                  High tolerance for missing secondary skills. Ideal for high-volume entry roles.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setStrictness("balanced")}
                className={`p-4 rounded-xl border text-left transition-all ${
                  strictness === "balanced"
                    ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                    : "border-border bg-card hover:bg-secondary/40"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-foreground">Balanced</span>
                  {strictness === "balanced" && <CheckCircle2Icon className="size-4 text-primary" />}
                </div>
                <p className="text-xs text-muted-foreground">
                  Standard enterprise evaluation balancing experience depth and skill match.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setStrictness("strict")}
                className={`p-4 rounded-xl border text-left transition-all ${
                  strictness === "strict"
                    ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                    : "border-border bg-card hover:bg-secondary/40"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-foreground">Strict</span>
                  {strictness === "strict" && <CheckCircle2Icon className="size-4 text-primary" />}
                </div>
                <p className="text-xs text-muted-foreground">
                  Rigorous filtering requiring &gt;85% exact skill overlap. Best for senior roles.
                </p>
              </button>
            </div>

            {/* Custom Rules Input */}
            <div className="space-y-3 pt-4 border-t border-border">
              <label className="text-sm font-bold text-foreground block">
                Custom System Evaluation Directive
              </label>
              <p className="text-xs text-muted-foreground">
                Appended to Gemini AI prompts when processing candidate CV submissions.
              </p>
              <Textarea
                rows={4}
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Enter specific evaluation instructions..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Weights & Model Selection */}
        <Card className="space-y-6">
          <CardHeader className="py-4 border-b border-border">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <CpuIcon className="size-5 text-primary" />
              Scoring Weight Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-foreground">Required Skills Match</span>
                <span className="text-primary">{skillsWeight}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={skillsWeight}
                onChange={(e) => setSkillsWeight(Number(e.target.value))}
                className="w-full accent-primary cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-foreground">Years of Experience</span>
                <span className="text-primary">{experienceWeight}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={experienceWeight}
                onChange={(e) => setExperienceWeight(Number(e.target.value))}
                className="w-full accent-primary cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-foreground">Education & Certifications</span>
                <span className="text-primary">{educationWeight}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={educationWeight}
                onChange={(e) => setEducationWeight(Number(e.target.value))}
                className="w-full accent-primary cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-foreground">Language Proficiency</span>
                <span className="text-primary">{languageWeight}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={languageWeight}
                onChange={(e) => setLanguageWeight(Number(e.target.value))}
                className="w-full accent-primary cursor-pointer"
              />
            </div>

            <div className="pt-4 border-t border-border space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground">AI Model</span>
                <Badge variant="outline">Gemini 3.6 Flash</Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground">Auto-Reject Below</span>
                <Badge variant="destructive">Score &lt; 40</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
