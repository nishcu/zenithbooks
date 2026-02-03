"use client";

import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { getActiveAssociates, getEligibleAssociatesForTask, withCorporateMitraDefaults } from '@/lib/compliance-associates/firestore';
import type { ComplianceAssociate } from '@/lib/compliance-associates/types';
import { updateTaskExecutionStatus, updateTaskExecutionQA } from '@/lib/compliance-plans/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, Clock, FileText, AlertCircle, Filter, Search, UserCog, BookOpen, Calendar, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type TaskStatus = 'pending' | 'assigned' | 'in_progress' | 'submitted' | 'review_required' | 'approved' | 'rework' | 'completed' | 'filed' | 'closed' | 'failed';

interface TaskQA {
  required?: boolean;
  reviewerAssociateId?: string;
  reviewerLevelRequired?: 'CM-L3' | 'CM-L4';
  reviewStatus?: 'pending' | 'approved' | 'rework';
  reviewNotes?: string;
  reviewedAt?: Date;
}

interface ComplianceTask {
  id: string;
  subscriptionId: string;
  userId: string;
  firmId: string;
  taskId: string;
  taskName: string;
  status: TaskStatus;
  dueDate: Date;
  completedAt?: Date;
  filedAt?: Date;
  filingDetails?: {
    formType: string;
    period: string;
    filingDate?: Date;
    acknowledgmentNumber?: string;
  };
  internalNotes?: string;
  assignedTo?: string;
  caReviewer?: string;
  sopReference?: string;
  qa?: TaskQA;
  createdAt: Date;
  updatedAt: Date;
}

export default function AdminComplianceTasks() {
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  const [tasks, setTasks] = useState<ComplianceTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTask, setSelectedTask] = useState<ComplianceTask | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<TaskStatus>('pending');
  const [internalNotes, setInternalNotes] = useState('');
  const [filingDetails, setFilingDetails] = useState({
    formType: '',
    period: '',
    acknowledgmentNumber: '',
  });
  const [assignedTo, setAssignedTo] = useState('');
  const [caReviewer, setCaReviewer] = useState('');
  const [sopReference, setSopReference] = useState('');
  const [activeAssociates, setActiveAssociates] = useState<ComplianceAssociate[]>([]);
  const [eligibleAssociates, setEligibleAssociates] = useState<ComplianceAssociate[]>([]);
  const [loadingAssociates, setLoadingAssociates] = useState(false);
  const [qaRequired, setQaRequired] = useState(false);
  const [qaReviewStatus, setQaReviewStatus] = useState<'pending' | 'approved' | 'rework'>('pending');
  const [qaReviewNotes, setQaReviewNotes] = useState('');
  const [qaReviewerAssociateId, setQaReviewerAssociateId] = useState('');

  useEffect(() => {
    if (user) {
      loadTasks();
      loadAssociates();
    }
  }, [user, statusFilter]);

  const loadAssociates = async () => {
    setLoadingAssociates(true);
    try {
      const associates = await getActiveAssociates();
      setActiveAssociates(associates.map(withCorporateMitraDefaults));
    } catch (error) {
      console.error('Error loading associates:', error);
    } finally {
      setLoadingAssociates(false);
    }
  };

  useEffect(() => {
    if (!isDialogOpen || !selectedTask) return;
    getEligibleAssociatesForTask(selectedTask.taskId).then(setEligibleAssociates).catch(() => setEligibleAssociates([]));
  }, [isDialogOpen, selectedTask?.taskId]);

  const loadTasks = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const tasksRef = collection(db, 'compliance_task_executions');
      let q = query(tasksRef, orderBy('dueDate', 'asc'));
      
      if (statusFilter !== 'all') {
        q = query(tasksRef, where('status', '==', statusFilter), orderBy('dueDate', 'asc'));
      }
      
      const snapshot = await getDocs(q);
      const tasksData: ComplianceTask[] = [];
      
      for (const taskDoc of snapshot.docs) {
        const data = taskDoc.data();
        tasksData.push({
          id: taskDoc.id,
          ...data,
          dueDate: data.dueDate?.toDate() || new Date(),
          completedAt: data.completedAt?.toDate(),
          filedAt: data.filedAt?.toDate(),
          filingDetails: data.filingDetails ? {
            ...data.filingDetails,
            filingDate: data.filingDetails.filingDate?.toDate(),
          } : undefined,
          qa: data.qa,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as ComplianceTask);
      }
      
      setTasks(tasksData);
    } catch (error) {
      console.error('Error loading tasks:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load compliance tasks',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedTask) return;
    try {
      const updates: Partial<ComplianceTask> = {
        internalNotes: internalNotes || undefined,
        assignedTo: assignedTo || undefined,
        caReviewer: caReviewer || undefined,
        sopReference: sopReference || undefined,
      };
      if (newStatus === 'filed' && (filingDetails.formType || filingDetails.period || filingDetails.acknowledgmentNumber)) {
        updates.filingDetails = {
          formType: filingDetails.formType,
          period: filingDetails.period,
          acknowledgmentNumber: filingDetails.acknowledgmentNumber,
          filingDate: new Date(),
        };
      }
      if (qaRequired) {
        updates.qa = {
          required: true,
          reviewerLevelRequired: 'CM-L3',
          reviewStatus: qaReviewStatus,
          reviewNotes: qaReviewNotes || undefined,
          reviewerAssociateId: qaReviewerAssociateId || undefined,
        };
      }
      await updateTaskExecutionStatus(selectedTask.id, newStatus, updates);
      if (qaRequired && (qaReviewStatus !== 'pending' || qaReviewNotes)) {
        await updateTaskExecutionQA(selectedTask.id, {
          required: true,
          reviewerLevelRequired: 'CM-L3',
          reviewStatus: qaReviewStatus,
          reviewNotes: qaReviewNotes || undefined,
          reviewerAssociateId: qaReviewerAssociateId || undefined,
        });
      }
      toast({ title: 'Success', description: 'Task status updated successfully' });
      setIsDialogOpen(false);
      setSelectedTask(null);
      setInternalNotes('');
      setFilingDetails({ formType: '', period: '', acknowledgmentNumber: '' });
      setAssignedTo('');
      setCaReviewer('');
      setSopReference('');
      setQaRequired(false);
      setQaReviewStatus('pending');
      setQaReviewNotes('');
      setQaReviewerAssociateId('');
      loadTasks();
    } catch (error: any) {
      console.error('Error updating task:', error);
      toast({ variant: 'destructive', title: 'Error', description: error?.message || 'Failed to update task status' });
    }
  };

  const openUpdateDialog = (task: ComplianceTask) => {
    setSelectedTask(task);
    setNewStatus(task.status);
    setInternalNotes(task.internalNotes || '');
    setFilingDetails(task.filingDetails || { formType: '', period: '', acknowledgmentNumber: '' });
    setAssignedTo(task.assignedTo || '');
    setCaReviewer(task.caReviewer || '');
    setSopReference(task.sopReference || '');
    setQaRequired(task.qa?.required ?? false);
    setQaReviewStatus((task.qa?.reviewStatus as 'pending' | 'approved' | 'rework') || 'pending');
    setQaReviewNotes(task.qa?.reviewNotes || '');
    setQaReviewerAssociateId(task.qa?.reviewerAssociateId || '');
    setIsDialogOpen(true);
  };

  const getStatusBadge = (status: TaskStatus) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', icon: any }> = {
      pending: { variant: 'secondary', icon: Clock },
      assigned: { variant: 'secondary', icon: UserCog },
      in_progress: { variant: 'default', icon: Loader2 },
      submitted: { variant: 'default', icon: FileText },
      review_required: { variant: 'secondary', icon: AlertCircle },
      approved: { variant: 'default', icon: CheckCircle2 },
      rework: { variant: 'outline', icon: AlertCircle },
      completed: { variant: 'default', icon: CheckCircle2 },
      filed: { variant: 'default', icon: FileText },
      closed: { variant: 'outline', icon: CheckCircle2 },
      failed: { variant: 'destructive', icon: AlertCircle },
    };
    const config = variants[status] ?? variants.pending;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {String(status).replace(/_/g, ' ').toUpperCase()}
      </Badge>
    );
  };

  const filteredTasks = tasks.filter(task => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        task.taskName.toLowerCase().includes(searchLower) ||
        task.taskId.toLowerCase().includes(searchLower) ||
        task.firmId.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Compliance Task Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage compliance tasks assigned to Zenith Corporate Mitras (ZenithBooks Compliance Team). Handled by ZenithBooks Compliance Team — clients never see associate identity (ICAI compliant).
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by task name, ID, or firm..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as TaskStatus | 'all')}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="review_required">Review Required</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rework">Rework</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="filed">Filed</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tasks ({filteredTasks.length})</CardTitle>
          <CardDescription>
            All compliance tasks are managed by Zenith Corporate Mitras (ZenithBooks Compliance Team)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No tasks found
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold">{task.taskName}</h3>
                        {getStatusBadge(task.status)}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <span className="font-medium text-muted-foreground">Due Date:</span>{' '}
                            <span className={(() => {
                              const dueDate = task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate);
                              return dueDate < new Date() && task.status !== 'completed' && task.status !== 'filed';
                            })() ? 'text-red-600 font-semibold' : ''}>
                              {task.dueDate.toLocaleDateString()}
                            </span>
                            {(() => {
                              const dueDate = task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate);
                              return dueDate < new Date() && task.status !== 'completed' && task.status !== 'filed';
                            })() && (
                              <Badge variant="destructive" className="ml-2 text-xs">Overdue</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <span className="font-medium text-muted-foreground">Task ID:</span>{' '}
                            <span className="font-mono text-xs">{task.taskId}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <span className="font-medium text-muted-foreground">Client Code:</span>{' '}
                            <span className="font-mono text-xs">{task.firmId.substring(0, 8)}...</span>
                            <span className="text-xs text-muted-foreground ml-1">(No client name shown - ICAI compliant)</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <UserCog className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <span className="font-medium text-muted-foreground">Assigned To:</span>{' '}
                            <span className="text-xs">
                              {task.assignedTo || 'ZenithBooks Team (Unassigned)'}
                            </span>
                            {task.caReviewer && (
                              <span className="text-xs text-muted-foreground ml-2">
                                | CA Reviewer: {task.caReviewer}
                              </span>
                            )}
                            {task.sopReference && (
                              <span className="text-xs text-muted-foreground ml-2">
                                | SOP: {task.sopReference}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {task.filedAt && (
                        <div className="mt-2 p-2 bg-green-50 rounded border border-green-200">
                          <span className="font-medium text-green-800 text-sm">Filed:</span>{' '}
                          <span className="text-green-700 text-sm">{task.filedAt.toLocaleDateString()}</span>
                        </div>
                      )}
                      {task.filingDetails && (
                        <div className="mt-2 text-sm">
                          <span className="font-medium">Filing Details:</span>{' '}
                          {task.filingDetails.formType} - {task.filingDetails.period}
                          {task.filingDetails.acknowledgmentNumber && (
                            <> (Ack: {task.filingDetails.acknowledgmentNumber})</>
                          )}
                        </div>
                      )}
                      {task.internalNotes && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          <span className="font-medium">Notes:</span> {task.internalNotes}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openUpdateDialog(task)}
                    >
                      Update Status
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Update Task Status</DialogTitle>
            <DialogDescription>
              Update the status and details for: {selectedTask?.taskName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select value={newStatus} onValueChange={(value) => setNewStatus(value as TaskStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="review_required">Review Required</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rework">Rework</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="filed">Filed</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {(newStatus === 'filed') && (
              <div className="space-y-4 border-t pt-4">
                <h4 className="font-medium">Filing Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Form Type</label>
                    <Input
                      value={filingDetails.formType || ""}
                      onChange={(e) => setFilingDetails({ ...filingDetails, formType: e.target.value })}
                      placeholder="e.g., GSTR-1, GSTR-3B"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Period</label>
                    <Input
                      value={filingDetails.period || ""}
                      onChange={(e) => setFilingDetails({ ...filingDetails, period: e.target.value })}
                      placeholder="e.g., Jan 2024"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Acknowledgment Number</label>
                  <Input
                    value={filingDetails.acknowledgmentNumber || ""}
                    onChange={(e) => setFilingDetails({ ...filingDetails, acknowledgmentNumber: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
              </div>
            )}
            
            {/* Task Assignment Fields - Certification gating: only eligible associates shown */}
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-medium flex items-center gap-2">
                <UserCog className="h-4 w-4" />
                Task Assignment (Internal)
              </h4>
              <div>
                <Label htmlFor="assigned-to">Assigned To (Zenith Corporate Mitra)</Label>
                {loadingAssociates ? (
                  <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </div>
                ) : eligibleAssociates.length > 0 ? (
                  <>
                    <Select
                      value={assignedTo === "__manual__" ? "" : (assignedTo || "")}
                      onValueChange={(value) => {
                        if (value === "__manual__") setAssignedTo("");
                        else setAssignedTo(value);
                      }}
                    >
                      <SelectTrigger id="assigned-to" className="mt-1">
                        <SelectValue placeholder="Select Corporate Mitra (certification-eligible)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None (Unassigned)</SelectItem>
                        {eligibleAssociates.map((associate) => (
                          <SelectItem key={associate.id} value={associate.associateCode}>
                            {associate.associateCode} - {associate.name} ({associate.level ?? 'CM-L1'})
                          </SelectItem>
                        ))}
                        <SelectItem value="__manual__">Enter code manually...</SelectItem>
                      </SelectContent>
                    </Select>
                    {(!assignedTo || (!eligibleAssociates.find(a => a.associateCode === assignedTo) && assignedTo !== "")) && (
                      <Input
                        id="assigned-to-manual"
                        value={assignedTo || ""}
                        onChange={(e) => setAssignedTo(e.target.value)}
                        placeholder="Enter associate code manually"
                        className="mt-2"
                      />
                    )}
                  </>
                ) : (
                  <>
                    <Input
                      id="assigned-to"
                      value={assignedTo || ""}
                      onChange={(e) => setAssignedTo(e.target.value)}
                      placeholder="Enter Corporate Mitra code manually"
                      className="mt-1"
                    />
                    <p className="text-xs text-amber-600 mt-1" title="Certification required">
                      No eligible Corporate Mitra for this task type. Certification required. You can enter code manually.
                    </p>
                  </>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Assign to Zenith Corporate Mitra. Only associates with required certification are shown. Handled by ZenithBooks Compliance Team (ICAI compliant).
                </p>
              </div>
              <div>
                <Label htmlFor="sop-reference">SOP Reference</Label>
                <Input
                  id="sop-reference"
                  value={sopReference || ""}
                  onChange={(e) => setSopReference(e.target.value)}
                  placeholder="e.g., SOP-GSTR-001, SOP-TDS-002"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Reference to Standard Operating Procedure for this task type.
                </p>
              </div>
              <div>
                <Label htmlFor="ca-reviewer">CA Reviewer (Enterprise Plan Only)</Label>
                <Input
                  id="ca-reviewer"
                  value={caReviewer || ""}
                  onChange={(e) => setCaReviewer(e.target.value)}
                  placeholder="e.g., CA Code: CA-001 (For Enterprise plan tasks)"
                  className="mt-1"
                  disabled={!selectedTask || !selectedTask.subscriptionId?.includes('complete')}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  CA reviewer for verification (only for Enterprise plan tasks).
                </p>
              </div>
            </div>

            {/* QA Workflow - Reviewer must be CM-L3 or CM-L4 */}
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-medium">QA & Review (Zenith Corporate Mitra)</h4>
              <div className="flex items-center space-x-2">
                <Checkbox id="qa-required" checked={qaRequired} onCheckedChange={(v) => setQaRequired(!!v)} />
                <Label htmlFor="qa-required">QA required (task cannot be closed without approval)</Label>
              </div>
              {qaRequired && (
                <>
                  <div>
                    <Label>Review Status</Label>
                    <Select value={qaReviewStatus} onValueChange={(v) => setQaReviewStatus(v as 'pending' | 'approved' | 'rework')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rework">Rework</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Reviewer (CM-L3 or CM-L4)</Label>
                    <Select value={qaReviewerAssociateId} onValueChange={setQaReviewerAssociateId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select reviewer" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeAssociates.filter(a => (a.level === 'CM-L3' || a.level === 'CM-L4')).map((a) => (
                          <SelectItem key={a.id} value={a.id}>{a.associateCode} - {a.name} ({a.level})</SelectItem>
                        ))}
                        {activeAssociates.filter(a => a.level === 'CM-L3' || a.level === 'CM-L4').length === 0 && (
                          <SelectItem value="" disabled>No CM-L3/CM-L4 available</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Review Notes</Label>
                    <Textarea value={qaReviewNotes} onChange={(e) => setQaReviewNotes(e.target.value)} placeholder="QA review notes..." rows={2} className="mt-1" />
                  </div>
                </>
              )}
            </div>
            
            <div>
              <Label htmlFor="internal-notes">Internal Notes</Label>
              <Textarea
                id="internal-notes"
                value={internalNotes || ""}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Add internal notes for this task (SOP steps, deadlines, etc.)..."
                rows={4}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateStatus}>
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

