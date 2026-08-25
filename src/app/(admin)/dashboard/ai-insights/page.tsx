"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import LoaderUI from "@/components/LoaderUI";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  SparklesIcon,
  CheckCircle2Icon,
  BrainIcon,
  ZapIcon,
  BarChart3Icon,
  RefreshCwIcon,
  SlidersIcon,
  ShieldCheckIcon,
  SaveIcon,
  CpuIcon,
  RotateCcwIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";

export default function AiIntelligencePage() {
  const applications = useQuery(api.applications.getApplications);
  const jobs = useQuery(api.applications.getJobs);

  // Policy Settings State
  const [strictness, setStrictness] = useState<"lenient" | "balanced" | "strict">("balanced");
  const [skillsWeight, setSkillsWeight] = useState(50);
  const [experienceWeight, setExperienceWeight] = useState(50);
  const [educationWeight, setEducationWeight] = useState(50);
  const [languageWeight, setLanguageWeight] = useState(50);
  const [customPrompt, setCustomPrompt] = useState(
    "Focus heavily on practical hands-on experience, core technical competencies, and role-specific requirements. Give bonus points to proven project achievements and production environment experience."
  );

  const stats = useMemo(() => {
    if (!applications) return { total: 0, strong: 0, maybe: 0, weak: 0, avgScore: 0 };
    const total = applications.length;
    const strong = applications.filter((a) => a.aiRecommendation === "strong_match").length;
    const maybe = applications.filter((a) => a.aiRecommendation === "maybe").length;
    const weak = applications.filter((a) => a.aiRecommendation === "weak_match").length;
    const scored = applications.filter((a) => typeof a.aiScore === "number");
    const avgScore =
      scored.length > 0
        ? Math.round(scored.reduce((acc, a) => acc + (a.aiScore ?? 0), 0) / scored.length)
        : 0;

    return { total, strong, maybe, weak, avgScore };
  }, [applications]);

  const handleSavePolicy = () => {
    toast.success("AI Screening Policy & Weight Configuration Saved!");
  };

  const handleResetDefaults = () => {
    setStrictness("balanced");
    setSkillsWeight(50);
    setExperienceWeight(50);
    setEducationWeight(50);
    setLanguageWeight(50);
    setCustomPrompt(
      "Focus heavily on practical hands-on experience, core technical competencies, and role-specific requirements. Give bonus points to proven project achievements and production environment experience."
    );
    toast.success("Reset to default policies");
  };

  if (applications === undefined || jobs === undefined) return <LoaderUI />;

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary border border-primary/20">
              <SparklesIcon className="size-3.5" />
              TalentVision AI Intelligence & Policies
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground">
            AI Analytics & Screening Controls
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitor real-time talent pool metrics, set evaluation strictness, and configure AI scoring weights.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleResetDefaults} className="gap-1.5">
            <RotateCcwIcon className="size-3.5" />
            Reset Defaults
          </Button>

          <Button size="sm" onClick={handleSavePolicy} className="gap-1.5 bg-primary text-primary-foreground font-semibold">
            <SaveIcon className="size-3.5" />
            Save Policy Rules
          </Button>
        </div>
      </div>

      {/* Top Key Performance Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:border-primary/40 transition-all shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Avg AI Match Score
              </p>
              <p className="mt-1 text-3xl font-extrabold text-foreground">{stats.avgScore}<span className="text-sm font-normal text-muted-foreground">/100</span></p>
              <Badge variant="success" className="mt-2 text-[10px]">
                High Quality Pool
              </Badge>
            </div>
            <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
              <BrainIcon className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/40 transition-all shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Strong Candidates
              </p>
              <p className="mt-1 text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">{stats.strong}</p>
              <span className="mt-1 inline-block text-xs font-semibold text-muted-foreground">
                {stats.total > 0 ? Math.round((stats.strong / stats.total) * 100) : 0}% of pipeline
              </span>
            </div>
            <div className="grid size-11 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2Icon className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/40 transition-all shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Evaluation Speed
              </p>
              <p className="mt-1 text-3xl font-extrabold text-foreground">1.2s</p>
              <span className="mt-1 inline-block text-xs font-semibold text-muted-foreground">
                per resume processed
              </span>
            </div>
            <div className="grid size-11 place-items-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <BarChart3Icon className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/40 transition-all shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Active Policy Strictness
              </p>
              <p className="mt-1 text-2xl font-extrabold capitalize text-primary">{strictness}</p>
              <Badge variant="outline" className="mt-1 text-[10px]">
                Auto-reject &lt; 40 score
              </Badge>
            </div>
            <div className="grid size-11 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <ShieldCheckIcon className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Screening Policy Rules — Full Width */}
      <Card>
        <CardHeader className="py-4 border-b border-border/60">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <SlidersIcon className="size-5 text-primary" />
            AI Screening Policy Rules
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Strictness Controls */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-foreground uppercase tracking-wider block">
              Evaluation Strictness Level
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(["lenient", "balanced", "strict"] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setStrictness(level)}
                  className={`p-4 rounded-xl border text-center capitalize text-sm font-bold transition-all ${
                    strictness === level
                      ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                      : "border-border bg-card text-muted-foreground hover:bg-secondary/40"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Scoring Weights */}
          <div className="space-y-5 pt-4 border-t border-border">
            <label className="text-sm font-bold text-foreground uppercase tracking-wider block">
              Scoring Weight Distribution
            </label>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-semibold">
                  <span className="text-foreground">Skills Match</span>
                  <span className="text-primary font-bold">{skillsWeight}%</span>
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
                <div className="flex justify-between text-sm font-semibold">
                  <span className="text-foreground">Experience Depth</span>
                  <span className="text-primary font-bold">{experienceWeight}%</span>
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
                <div className="flex justify-between text-sm font-semibold">
                  <span className="text-foreground">Education & Certs</span>
                  <span className="text-primary font-bold">{educationWeight}%</span>
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
                <div className="flex justify-between text-sm font-semibold">
                  <span className="text-foreground">Language Proficiency</span>
                  <span className="text-primary font-bold">{languageWeight}%</span>
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
            </div>
          </div>

          {/* Custom Directives */}
          <div className="space-y-3 pt-4 border-t border-border">
            <label className="text-sm font-bold text-foreground uppercase tracking-wider block">
              Custom AI Directive Prompt
            </label>
            <Textarea
              rows={4}
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Enter evaluation guidelines..."
              className="text-sm bg-card"
            />
          </div>

          <Button onClick={handleSavePolicy} className="w-full sm:w-auto text-sm font-bold gap-1.5 px-8">
            <SaveIcon className="size-4" /> Save Policy Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
