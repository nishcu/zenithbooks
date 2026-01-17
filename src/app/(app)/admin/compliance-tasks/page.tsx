"use client";

import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, Clock, FileText, AlertCircle, Filter, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'filed' | 'failed';

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

  useEffect(() => {
    if (user) {
      loadTasks();
    }
  }, [user, statusFilter]);

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
      const taskRef = doc(db, 'compliance_task_executions', selectedTask.id);
      const updateData: any = {
        status: newStatus,
        updatedAt: Timestamp.now(),
      };
      
      if (internalNotes) {
        updateData.internalNotes = internalNotes;
      }
      
      if (newStatus === 'completed' || newStatus === 'filed') {
        updateData.completedAt = Timestamp.now();
      }
      
      if (newStatus === 'filed') {
        updateData.filedAt = Timestamp.now();
        if (filingDetails.formType || filingDetails.period || filingDetails.acknowledgmentNumber) {
          updateData.filingDetails = {
            formType: filingDetails.formType,
            period: filingDetails.period,
            acknowledgmentNumber: filingDetails.acknowledgmentNumber,
            filingDate: Timestamp.now(),
          };
        }
      }
      
      await updateDoc(taskRef, updateData);
      
      toast({
        title: 'Success',
        description: 'Task status updated successfully',
      });
      
      setIsDialogOpen(false);
      setSelectedTask(null);
      setInternalNotes('');
      setFilingDetails({ formType: '', period: '', acknowledgmentNumber: '' });
      loadTasks();
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update task status',
      });
    }
  };

  const openUpdateDialog = (task: ComplianceTask) => {
    setSelectedTask(task);
    setNewStatus(task.status);
    setInternalNotes(task.internalNotes || '');
    setFilingDetails(task.filingDetails || { formType: '', period: '', acknowledgmentNumber: '' });
    setIsDialogOpen(true);
  };

  const getStatusBadge = (status: TaskStatus) => {
    const variants: Record<TaskStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline', icon: any }> = {
      pending: { variant: 'secondary', icon: Clock },
      in_progress: { variant: 'default', icon: Loader2 },
      completed: { variant: 'default', icon: CheckCircle2 },
      filed: { variant: 'default', icon: FileText },
      failed: { variant: 'destructive', icon: AlertCircle },
    };
    
    const config = variants[status];
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status.replace('_', ' ').toUpperCase()}
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
            Manage compliance tasks assigned to ZenithBooks Compliance Team
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
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="filed">Filed</SelectItem>
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
            All compliance tasks are managed by ZenithBooks Compliance Team
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
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                        <div>
                          <span className="font-medium">Due Date:</span>{' '}
                          {task.dueDate.toLocaleDateString()}
                        </div>
                        <div>
                          <span className="font-medium">Task ID:</span> {task.taskId}
                        </div>
                        <div>
                          <span className="font-medium">Firm ID:</span> {task.firmId.substring(0, 8)}...
                        </div>
                        {task.filedAt && (
                          <div>
                            <span className="font-medium">Filed:</span>{' '}
                            {task.filedAt.toLocaleDateString()}
                          </div>
                        )}
                      </div>
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
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="filed">Filed</SelectItem>
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
                      value={filingDetails.formType}
                      onChange={(e) => setFilingDetails({ ...filingDetails, formType: e.target.value })}
                      placeholder="e.g., GSTR-1, GSTR-3B"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Period</label>
                    <Input
                      value={filingDetails.period}
                      onChange={(e) => setFilingDetails({ ...filingDetails, period: e.target.value })}
                      placeholder="e.g., Jan 2024"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Acknowledgment Number</label>
                  <Input
                    value={filingDetails.acknowledgmentNumber}
                    onChange={(e) => setFilingDetails({ ...filingDetails, acknowledgmentNumber: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
              </div>
            )}
            
            <div>
              <label className="text-sm font-medium">Internal Notes</label>
              <Textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Add internal notes for this task..."
                rows={4}
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

