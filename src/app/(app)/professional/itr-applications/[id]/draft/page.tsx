"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Save,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Sparkles,
  Calculator,
  Download,
  FileCode,
} from "lucide-react";
import {
  getITRApplication,
  getITRDraft,
  updateITRDraft,
  updateITRApplicationStatus,
} from "@/lib/itr/firestore";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/itr/constants";
import { calculateIncomeTax } from "@/lib/itr/tax-calculator";
import { generateITRXML, downloadITRXML } from "@/lib/itr/itr-xml-generator";
import type { ITRApplication, ITRDraft, ITRStatus } from "@/lib/itr/types";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ProfessionalDraftEditorPage() {
  const params = useParams();
  const router = useRouter();
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  const applicationId = params.id as string;

  const [application, setApplication] = useState<ITRApplication | null>(null);
  const [draft, setDraft] = useState<ITRDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [newComment, setNewComment] = useState("");

  // Editable draft fields
  const [editedDraft, setEditedDraft] = useState<Partial<ITRDraft>>({});

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    loadData();
  }, [user, applicationId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [app, draftData] = await Promise.all([
        getITRApplication(applicationId),
        getITRDraft(applicationId),
      ]);

      if (!app) {
        toast({
          title: "Application Not Found",
          description: "The ITR application you're looking for doesn't exist.",
          variant: "destructive",
        });
        router.push("/professional/itr-applications");
        return;
      }

      // Verify assignment
      if (app.assignedTo !== user?.uid) {
        toast({
          title: "Access Denied",
          description: "This application is not assigned to you.",
          variant: "destructive",
        });
        router.push("/professional/itr-applications");
        return;
      }

      setApplication(app);
      if (draftData) {
        setDraft(draftData);
        setEditedDraft({
          income: { ...draftData.income },
          deductions: { ...draftData.deductions },
          tax: { ...draftData.tax },
        });
      }
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load draft. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateDraft = async () => {
    if (!user || !application) return;

    setGenerating(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/itr/generate-draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.uid,
        },
        body: JSON.stringify({ applicationId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate draft");
      }

      const data = await response.json();
      toast({
        title: "Draft Generated",
        description: "ITR draft has been generated successfully.",
      });

      await loadData();
    } catch (error: any) {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate draft. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const recalculateTax = useCallback(() => {
    if (!application || !editedDraft.income || !editedDraft.deductions || !draft) return;

    const totalIncome = editedDraft.income.totalIncome || 0;
    const tds = editedDraft.tax?.tds || draft.tax.tds || 0;
    const advanceTax = editedDraft.tax?.advanceTax || draft.tax.advanceTax || 0;
    const selfAssessmentTax = editedDraft.tax?.selfAssessmentTax || draft.tax.selfAssessmentTax || 0;

    const taxResult = calculateIncomeTax({
      financialYear: application.financialYear,
      totalIncome,
      deductions: {
        section80C: editedDraft.deductions.section80C || 0,
        section80D: editedDraft.deductions.section80D || 0,
        section80G: editedDraft.deductions.section80G || 0,
        section24: editedDraft.deductions.section24 || 0,
        section80E: editedDraft.deductions.section80E || 0,
        section80TTA: editedDraft.deductions.section80TTA || 0,
        other: editedDraft.deductions.other || 0,
      },
      tds,
      advanceTax,
      selfAssessmentTax,
    });

    setEditedDraft((prev) => ({
      ...prev,
      tax: {
        totalTax: taxResult.totalTax,
        tds,
        advanceTax,
        selfAssessmentTax,
        refund: taxResult.refund,
        payable: taxResult.payable,
      },
    }));
  }, [application, editedDraft.income, editedDraft.deductions, draft]);

  // Auto-recalculate tax when income or deductions change
  useEffect(() => {
    if (draft && editedDraft.income && editedDraft.deductions && application) {
      const timer = setTimeout(() => {
        recalculateTax();
      }, 500); // Debounce recalculation
      return () => clearTimeout(timer);
    }
  }, [
    editedDraft.income?.totalIncome,
    editedDraft.deductions?.totalDeductions,
    recalculateTax,
  ]);

  const handleDownloadXML = () => {
    if (!draft || !application) return;

    try {
      // Get assessment year from financial year
      const [startYear] = application.financialYear.split('-');
      const assessmentYear = `${parseInt(startYear) + 1}-${(parseInt(startYear) + 2).toString().padStart(2, '0')}`;

      // Generate XML
      // Map ITR form type (ITR-1, ITR-2, etc.) to XML format (ITR1, ITR2, etc.)
      const formTypeMap: Record<string, 'ITR1' | 'ITR2' | 'ITR3' | 'ITR4'> = {
        'ITR-1': 'ITR1',
        'ITR-2': 'ITR2',
        'ITR-3': 'ITR3',
        'ITR-4': 'ITR4',
      };
      const xmlFormType = formTypeMap[application.formType || 'ITR-1'] || 'ITR1';

      const xml = generateITRXML(draft, {
        formType: xmlFormType,
        financialYear: application.financialYear,
        assessmentYear,
        pan: application.pan || 'PAN0000000',
        name: 'Taxpayer Name', // Should be from user profile
      });

      // Download XML file
      const filename = `ITR-${application.financialYear}-${application.id.substring(0, 8)}.xml`;
      downloadITRXML(xml, filename);

      toast({
        title: "XML Downloaded",
        description: "ITR XML file has been downloaded. You can upload this to the Income Tax Portal.",
      });
    } catch (error: any) {
      console.error("Error generating XML:", error);
      toast({
        variant: "destructive",
        title: "XML Generation Failed",
        description: error.message || "Failed to generate ITR XML. Please try again.",
      });
    }
  };

  const handleSaveDraft = async () => {
    if (!draft) return;

    setSaving(true);
    try {
      // Recalculate tax before saving if income/deductions changed
      recalculateTax();

      await updateITRDraft(draft.id, {
        income: editedDraft.income || draft.income,
        deductions: editedDraft.deductions || draft.deductions,
        tax: editedDraft.tax || draft.tax,
        status: 'DRAFT',
      });

      toast({
        title: "Draft Saved",
        description: "Draft changes have been saved successfully.",
      });

      await loadData();
    } catch (error: any) {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save draft. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async () => {
    if (!draft || !user || !newComment.trim()) return;

    setSaving(true);
    try {
      const commentId = `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newCommentObj = {
        id: commentId,
        author: user.uid,
        authorType: 'CA_TEAM' as const,
        message: newComment.trim(),
        createdAt: new Date(),
        resolved: false,
      };

      const updatedComments = [...(draft.comments || []), newCommentObj];

      await updateITRDraft(draft.id, {
        comments: updatedComments,
      });

      setNewComment("");
      toast({
        title: "Comment Added",
        description: "Comment has been added to the draft.",
      });

      await loadData();
    } catch (error: any) {
      toast({
        title: "Failed to Add Comment",
        description: error.message || "Failed to add comment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleApproveForUser = async () => {
    if (!draft || !application) return;

    setSaving(true);
    try {
      // Recalculate and save tax before approving
      recalculateTax();

      await updateITRDraft(draft.id, {
        income: editedDraft.income || draft.income,
        deductions: editedDraft.deductions || draft.deductions,
        tax: editedDraft.tax || draft.tax,
        status: 'PENDING_APPROVAL',
      });

      await updateITRApplicationStatus(application.id, 'DRAFT_READY' as ITRStatus);

      // Send notification for user (Phase 6) - via API route
      try {
        await fetch('/api/itr/send-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: application.userId,
            applicationId: application.id,
            type: 'DRAFT_READY',
            financialYear: application.financialYear,
          }),
        });
      } catch (error) {
        console.error('Failed to send notification:', error);
        // Don't fail the request if notification fails
      }

      toast({
        title: "Draft Approved",
        description: "Draft has been approved and sent to user for review.",
      });

      router.push(`/professional/itr-applications/${applicationId}`);
    } catch (error: any) {
      toast({
        title: "Approval Failed",
        description: error.message || "Failed to approve draft. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading draft...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!application) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href={`/professional/itr-applications/${applicationId}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">ITR Draft Editor</h1>
            <p className="text-muted-foreground mt-1">
              Application ID: {application.id.substring(0, 8)}... | FY: {application.financialYear}
            </p>
          </div>
        </div>
        {!draft && (
          <Button onClick={handleGenerateDraft} disabled={generating}>
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Draft
              </>
            )}
          </Button>
        )}
      </div>

      {!draft ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Draft Generated Yet</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Generate an ITR draft by processing Form 16, AIS, and 26AS documents.
              The system will extract data, calculate taxes, and create a draft for review.
            </p>
            <Button onClick={handleGenerateDraft} disabled={generating} size="lg">
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Draft...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate ITR Draft
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="income" className="space-y-4">
          <TabsList>
            <TabsTrigger value="income">Income</TabsTrigger>
            <TabsTrigger value="deductions">Deductions</TabsTrigger>
            <TabsTrigger value="tax">Tax Calculation</TabsTrigger>
            <TabsTrigger value="mismatches">Mismatches</TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
          </TabsList>

          {/* Income Tab */}
          <TabsContent value="income" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Income Summary</CardTitle>
                <CardDescription>
                  Edit income details if needed
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Salary</Label>
                    <Input
                      type="number"
                      value={editedDraft.income?.salary || 0}
                      onChange={(e) =>
                        setEditedDraft({
                          ...editedDraft,
                          income: {
                            ...editedDraft.income!,
                            salary: Number(e.target.value) || 0,
                            totalIncome:
                              (Number(e.target.value) || 0) +
                              (editedDraft.income?.houseProperty || 0) +
                              (editedDraft.income?.capitalGains || 0) +
                              (editedDraft.income?.businessProfession || 0) +
                              (editedDraft.income?.otherSources || 0),
                          },
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>House Property</Label>
                    <Input
                      type="number"
                      value={editedDraft.income?.houseProperty || 0}
                      onChange={(e) =>
                        setEditedDraft({
                          ...editedDraft,
                          income: {
                            ...editedDraft.income!,
                            houseProperty: Number(e.target.value) || 0,
                            totalIncome:
                              (editedDraft.income?.salary || 0) +
                              (Number(e.target.value) || 0) +
                              (editedDraft.income?.capitalGains || 0) +
                              (editedDraft.income?.businessProfession || 0) +
                              (editedDraft.income?.otherSources || 0),
                          },
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Capital Gains</Label>
                    <Input
                      type="number"
                      value={editedDraft.income?.capitalGains || 0}
                      onChange={(e) =>
                        setEditedDraft({
                          ...editedDraft,
                          income: {
                            ...editedDraft.income!,
                            capitalGains: Number(e.target.value) || 0,
                            totalIncome:
                              (editedDraft.income?.salary || 0) +
                              (editedDraft.income?.houseProperty || 0) +
                              (Number(e.target.value) || 0) +
                              (editedDraft.income?.businessProfession || 0) +
                              (editedDraft.income?.otherSources || 0),
                          },
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Business/Profession</Label>
                    <Input
                      type="number"
                      value={editedDraft.income?.businessProfession || 0}
                      onChange={(e) =>
                        setEditedDraft({
                          ...editedDraft,
                          income: {
                            ...editedDraft.income!,
                            businessProfession: Number(e.target.value) || 0,
                            totalIncome:
                              (editedDraft.income?.salary || 0) +
                              (editedDraft.income?.houseProperty || 0) +
                              (editedDraft.income?.capitalGains || 0) +
                              (Number(e.target.value) || 0) +
                              (editedDraft.income?.otherSources || 0),
                          },
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Other Sources</Label>
                    <Input
                      type="number"
                      value={editedDraft.income?.otherSources || 0}
                      onChange={(e) =>
                        setEditedDraft({
                          ...editedDraft,
                          income: {
                            ...editedDraft.income!,
                            otherSources: Number(e.target.value) || 0,
                            totalIncome:
                              (editedDraft.income?.salary || 0) +
                              (editedDraft.income?.houseProperty || 0) +
                              (editedDraft.income?.capitalGains || 0) +
                              (editedDraft.income?.businessProfession || 0) +
                              (Number(e.target.value) || 0),
                          },
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Total Income (Auto-calculated)</Label>
                    <Input
                      type="number"
                      value={editedDraft.income?.totalIncome || 0}
                      disabled
                      className="font-semibold"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Deductions Tab */}
          <TabsContent value="deductions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Deductions</CardTitle>
                <CardDescription>
                  Edit deduction amounts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Section 80C (Max ₹1,50,000)</Label>
                    <Input
                      type="number"
                      value={editedDraft.deductions?.section80C || 0}
                      onChange={(e) =>
                        setEditedDraft({
                          ...editedDraft,
                          deductions: {
                            ...editedDraft.deductions!,
                            section80C: Math.min(150000, Number(e.target.value) || 0),
                            totalDeductions:
                              Math.min(150000, Number(e.target.value) || 0) +
                              (editedDraft.deductions?.section80D || 0) +
                              (editedDraft.deductions?.section80G || 0) +
                              (editedDraft.deductions?.section24 || 0) +
                              (editedDraft.deductions?.section80E || 0) +
                              (editedDraft.deductions?.section80TTA || 0) +
                              (editedDraft.deductions?.other || 0),
                          },
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Section 80D</Label>
                    <Input
                      type="number"
                      value={editedDraft.deductions?.section80D || 0}
                      onChange={(e) =>
                        setEditedDraft({
                          ...editedDraft,
                          deductions: {
                            ...editedDraft.deductions!,
                            section80D: Number(e.target.value) || 0,
                            totalDeductions:
                              (editedDraft.deductions?.section80C || 0) +
                              (Number(e.target.value) || 0) +
                              (editedDraft.deductions?.section80G || 0) +
                              (editedDraft.deductions?.section24 || 0) +
                              (editedDraft.deductions?.section80E || 0) +
                              (editedDraft.deductions?.section80TTA || 0) +
                              (editedDraft.deductions?.other || 0),
                          },
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Section 80G</Label>
                    <Input
                      type="number"
                      value={editedDraft.deductions?.section80G || 0}
                      onChange={(e) =>
                        setEditedDraft({
                          ...editedDraft,
                          deductions: {
                            ...editedDraft.deductions!,
                            section80G: Number(e.target.value) || 0,
                            totalDeductions:
                              (editedDraft.deductions?.section80C || 0) +
                              (editedDraft.deductions?.section80D || 0) +
                              (Number(e.target.value) || 0) +
                              (editedDraft.deductions?.section24 || 0) +
                              (editedDraft.deductions?.section80E || 0) +
                              (editedDraft.deductions?.section80TTA || 0) +
                              (editedDraft.deductions?.other || 0),
                          },
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Section 24 (Home Loan Interest)</Label>
                    <Input
                      type="number"
                      value={editedDraft.deductions?.section24 || 0}
                      onChange={(e) =>
                        setEditedDraft({
                          ...editedDraft,
                          deductions: {
                            ...editedDraft.deductions!,
                            section24: Number(e.target.value) || 0,
                            totalDeductions:
                              (editedDraft.deductions?.section80C || 0) +
                              (editedDraft.deductions?.section80D || 0) +
                              (editedDraft.deductions?.section80G || 0) +
                              (Number(e.target.value) || 0) +
                              (editedDraft.deductions?.section80E || 0) +
                              (editedDraft.deductions?.section80TTA || 0) +
                              (editedDraft.deductions?.other || 0),
                          },
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Section 80E (Education Loan)</Label>
                    <Input
                      type="number"
                      value={editedDraft.deductions?.section80E || 0}
                      onChange={(e) =>
                        setEditedDraft({
                          ...editedDraft,
                          deductions: {
                            ...editedDraft.deductions!,
                            section80E: Number(e.target.value) || 0,
                            totalDeductions:
                              (editedDraft.deductions?.section80C || 0) +
                              (editedDraft.deductions?.section80D || 0) +
                              (editedDraft.deductions?.section80G || 0) +
                              (editedDraft.deductions?.section24 || 0) +
                              (Number(e.target.value) || 0) +
                              (editedDraft.deductions?.section80TTA || 0) +
                              (editedDraft.deductions?.other || 0),
                          },
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Section 80TTA</Label>
                    <Input
                      type="number"
                      value={editedDraft.deductions?.section80TTA || 0}
                      onChange={(e) =>
                        setEditedDraft({
                          ...editedDraft,
                          deductions: {
                            ...editedDraft.deductions!,
                            section80TTA: Number(e.target.value) || 0,
                            totalDeductions:
                              (editedDraft.deductions?.section80C || 0) +
                              (editedDraft.deductions?.section80D || 0) +
                              (editedDraft.deductions?.section80G || 0) +
                              (editedDraft.deductions?.section24 || 0) +
                              (editedDraft.deductions?.section80E || 0) +
                              (Number(e.target.value) || 0) +
                              (editedDraft.deductions?.other || 0),
                          },
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Other Deductions</Label>
                    <Input
                      type="number"
                      value={editedDraft.deductions?.other || 0}
                      onChange={(e) =>
                        setEditedDraft({
                          ...editedDraft,
                          deductions: {
                            ...editedDraft.deductions!,
                            other: Number(e.target.value) || 0,
                            totalDeductions:
                              (editedDraft.deductions?.section80C || 0) +
                              (editedDraft.deductions?.section80D || 0) +
                              (editedDraft.deductions?.section80G || 0) +
                              (editedDraft.deductions?.section24 || 0) +
                              (editedDraft.deductions?.section80E || 0) +
                              (editedDraft.deductions?.section80TTA || 0) +
                              (Number(e.target.value) || 0),
                          },
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Total Deductions (Auto-calculated)</Label>
                    <Input
                      type="number"
                      value={editedDraft.deductions?.totalDeductions || 0}
                      disabled
                      className="font-semibold"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tax Calculation Tab */}
          <TabsContent value="tax" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Tax Calculation</CardTitle>
                    <CardDescription>
                      Tax calculation summary (auto-calculated based on income and deductions)
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={recalculateTax}>
                    <Calculator className="mr-2 h-4 w-4" />
                    Recalculate
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Total Tax</Label>
                    <Input
                      type="number"
                      value={editedDraft.tax?.totalTax || 0}
                      disabled
                      className="font-semibold"
                    />
                  </div>
                  <div>
                    <Label>TDS</Label>
                    <Input
                      type="number"
                      value={editedDraft.tax?.tds || 0}
                      disabled
                    />
                  </div>
                  <div>
                    <Label>Advance Tax</Label>
                    <Input
                      type="number"
                      value={editedDraft.tax?.advanceTax || 0}
                      disabled
                    />
                  </div>
                  <div>
                    <Label>Self-Assessment Tax</Label>
                    <Input
                      type="number"
                      value={editedDraft.tax?.selfAssessmentTax || 0}
                      disabled
                    />
                  </div>
                  <div>
                    <Label>
                      {editedDraft.tax && editedDraft.tax.refund > 0
                        ? "Refund Amount"
                        : "Tax Payable"}
                    </Label>
                    <Input
                      type="number"
                      value={
                        editedDraft.tax && editedDraft.tax.refund > 0
                          ? editedDraft.tax.refund
                          : editedDraft.tax?.payable || 0
                      }
                      disabled
                      className={`font-semibold ${
                        editedDraft.tax && editedDraft.tax.refund > 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Mismatches Tab */}
          <TabsContent value="mismatches" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  Detected Mismatches
                </CardTitle>
                <CardDescription>
                  Review and address any mismatches between documents
                </CardDescription>
              </CardHeader>
              <CardContent>
                {draft.mismatches.length === 0 ? (
                  <div className="text-center py-8 text-green-600">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-2" />
                    <p className="font-semibold">No Mismatches Detected</p>
                    <p className="text-sm text-muted-foreground">
                      All data is consistent across documents
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {draft.mismatches.map((mismatch, index) => (
                      <div
                        key={index}
                        className={`p-4 rounded-lg border ${
                          mismatch.severity === "HIGH"
                            ? "bg-red-50 border-red-200"
                            : mismatch.severity === "MEDIUM"
                            ? "bg-orange-50 border-orange-200"
                            : "bg-yellow-50 border-yellow-200"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge
                                variant={
                                  mismatch.severity === "HIGH"
                                    ? "destructive"
                                    : "outline"
                                }
                              >
                                {mismatch.type}
                              </Badge>
                              <Badge variant="outline">{mismatch.severity}</Badge>
                            </div>
                            <p className="text-sm font-medium">{mismatch.description}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Difference: ₹{mismatch.amount.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Comments Tab */}
          <TabsContent value="comments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Comments & Notes</CardTitle>
                <CardDescription>
                  Add comments for user review (e.g., "Please confirm FD interest of ₹4,520")
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Add Comment</Label>
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Enter comment for user..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newComment.trim()) {
                          handleAddComment();
                        }
                      }}
                    />
                    <Button
                      onClick={handleAddComment}
                      disabled={!newComment.trim() || saving}
                    >
                      Add
                    </Button>
                  </div>
                </div>

                {draft.comments.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No comments yet. Add a comment above to ask the user for clarification.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {draft.comments.map((comment) => (
                      <div key={comment.id} className="p-3 bg-muted rounded-lg">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-sm font-medium">
                            {comment.authorType === "CA_TEAM" ? "CA Team" : "User"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(comment.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm">{comment.message}</p>
                        {comment.resolved && (
                          <Badge variant="outline" className="mt-2">
                            Resolved
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Action Buttons */}
      {draft && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Draft Status</p>
                <Badge
                  className={
                    draft.status === "PENDING_APPROVAL"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-gray-100 text-gray-800"
                  }
                >
                  {draft.status === "PENDING_APPROVAL"
                    ? "Pending User Approval"
                    : "Draft"}
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  onClick={handleDownloadXML}
                >
                  <FileCode className="mr-2 h-4 w-4" />
                  Download ITR XML
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSaveDraft}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Draft
                    </>
                  )}
                </Button>
                {draft.status !== "PENDING_APPROVAL" && (
                  <Button onClick={handleApproveForUser} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Approving...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Approve for User Review
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

