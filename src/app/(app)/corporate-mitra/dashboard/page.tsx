"use client";

/**
 * Zenith Corporate Mitra Dashboard (Internal - read-only)
 * Clients never see this. Associates view their own code, level, performance, certifications.
 */

import { useState, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { getAssociateByEmail, withCorporateMitraDefaults } from "@/lib/compliance-associates/firestore";
import { getNextEligibleLevel } from "@/lib/compliance-associates/performance";
import { CORPORATE_MITRA_LEVELS, LEVEL_UP_CONDITIONS } from "@/lib/compliance-associates/constants";
import type { ComplianceAssociate, CorporateMitraLevel } from "@/lib/compliance-associates/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, User, Award, TrendingUp, CheckCircle, Target, AlertCircle } from "lucide-react";
import Link from "next/link";

const MITRA_DISCLAIMER =
  "Zenith Corporate Mitra is an internal platform-defined role and not a government-authorized designation.";

export default function CorporateMitraDashboardPage() {
  const [user] = useAuthState(auth);
  const router = useRouter();
  const [associate, setAssociate] = useState<ComplianceAssociate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) {
      setLoading(false);
      return;
    }
    getAssociateByEmail(user.email)
      .then((a) => (a ? setAssociate(withCorporateMitraDefaults(a)) : setAssociate(null)))
      .catch(() => setAssociate(null))
      .finally(() => setLoading(false));
  }, [user?.email]);

  if (!user) {
    router.push("/login?redirect=/corporate-mitra/dashboard");
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!associate) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Zenith Corporate Mitra</CardTitle>
            <CardDescription>{MITRA_DISCLAIMER}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              You are not registered as a Zenith Corporate Mitra. Register to join the internal team and receive task assignments.
            </p>
            <Button asChild>
              <Link href="/compliance-associates/apply">Register as Zenith Corporate Mitra</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const level = associate.level ?? "CM-L1";
  const performance = associate.performance ?? { score: 50, accuracyRate: 0, avgTurnaroundHours: 0, reworkCount: 0, lastEvaluatedAt: new Date() };
  const certifications = associate.certifications ?? { gstBasics: false, msmeCompliance: false, payrollBasics: false, mcaBasics: false };
  const nextLevel = getNextEligibleLevel(level, associate.tasksCompleted ?? 0, performance.score ?? 50);
  const nextCond = nextLevel ? LEVEL_UP_CONDITIONS[nextLevel] : null;

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Zenith Corporate Mitra Dashboard</h1>
        <p className="text-muted-foreground mt-1">{MITRA_DISCLAIMER}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Your Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Associate Code</p>
            <p className="font-mono font-semibold">{associate.associateCode}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Level</p>
            <Badge variant="secondary">{level}</Badge>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <Badge variant={associate.status === "active" ? "default" : "secondary"}>{associate.status.replace("_", " ")}</Badge>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Qualification</p>
            <p className="font-medium">{associate.qualification}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Tasks & Earnings
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">Tasks Completed</p>
            <p className="text-2xl font-bold">{associate.tasksCompleted ?? 0}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Tasks In Progress</p>
            <p className="text-2xl font-bold">{associate.tasksInProgress ?? 0}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Earnings Summary</p>
            <p className="text-2xl font-bold">₹{associate.totalEarnings ?? 0}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Performance Score
          </CardTitle>
          <CardDescription>Internal scoring (0–100). Not visible to clients.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold">{performance.score ?? 50}</div>
            <div className="text-sm text-muted-foreground">
              Accuracy: {performance.accuracyRate ?? 0}% · Avg turnaround: {performance.avgTurnaroundHours ?? 0}h · Rework: {performance.reworkCount ?? 0}
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Risk flag (internal)</p>
            <Badge variant={associate.riskFlag === "low" ? "default" : associate.riskFlag === "medium" ? "secondary" : "destructive"}>
              {associate.riskFlag ?? "low"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Certifications
          </CardTitle>
          <CardDescription>Completed certifications for task eligibility</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {(["gstBasics", "msmeCompliance", "payrollBasics", "mcaBasics"] as const).map((key) => (
              <li key={key} className="flex items-center gap-2">
                {certifications[key] ? <CheckCircle className="h-4 w-4 text-green-500" /> : <AlertCircle className="h-4 w-4 text-muted-foreground" />}
                <span className={certifications[key] ? "" : "text-muted-foreground"}>
                  {key === "gstBasics" && "GST Basics"}
                  {key === "msmeCompliance" && "MSME Compliance"}
                  {key === "payrollBasics" && "Payroll Basics"}
                  {key === "mcaBasics" && "MCA Basics"}
                </span>
                {!certifications[key] && <span className="text-xs text-muted-foreground">(Certification required for related tasks)</span>}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Next Level Eligibility
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {nextLevel && nextCond && !nextCond.adminOnly ? (
            <p className="text-sm">
              You are eligible for <Badge>{nextLevel}</Badge>: {nextCond.minTasks}+ tasks and score ≥ {nextCond.minScore}. Contact admin to upgrade.
            </p>
          ) : level === "CM-L4" ? (
            <p className="text-sm text-muted-foreground">You are at the highest level (CM-L4).</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {(CORPORATE_MITRA_LEVELS as readonly string[]).slice(1).map((l) => {
                const cond = LEVEL_UP_CONDITIONS[l];
                if (!cond || cond.adminOnly) return null;
                const currentLevelIdx = (CORPORATE_MITRA_LEVELS as readonly string[]).indexOf(level);
                const targetIdx = (CORPORATE_MITRA_LEVELS as readonly string[]).indexOf(l);
                if (targetIdx <= currentLevelIdx) return null;
                const tasksOk = (associate.tasksCompleted ?? 0) >= cond.minTasks;
                const scoreOk = (performance.score ?? 0) >= cond.minScore;
                return (
                  <li key={l} className="flex items-center gap-2">
                    {tasksOk && scoreOk ? <CheckCircle className="h-4 w-4 text-green-500" /> : <AlertCircle className="h-4 w-4 text-muted-foreground" />}
                    <span>
                      {l}: {cond.minTasks}+ tasks ({associate.tasksCompleted ?? 0}) and score ≥ {cond.minScore} (current: {performance.score ?? 50})
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
