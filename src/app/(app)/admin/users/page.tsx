
"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Users, Eye, KeyRound, Ban, Edit, Trash2, CheckCircle2, Loader2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { SUPER_ADMIN_UID } from "@/lib/constants";

type User = {
  id: string;
  email: string;
  userType: 'business' | 'professional' | 'freemium';
  companyName: string;
  createdAt: string | null;
  status?: 'Active' | 'Inactive' | 'Suspended';
};

function formatUserDate(createdAt: string | null | undefined): string {
  if (!createdAt) return 'N/A';
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return format(date, 'dd MMM, yyyy');
}

export default function AdminUsers() {
  const [user] = useAuthState(auth);
  const isSuperAdmin = !!user?.uid && user.uid === SUPER_ADMIN_UID;
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [isSuspendDialogOpen, setIsSuspendDialogOpen] = useState(false);
  const [isUnsuspendDialogOpen, setIsUnsuspendDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAction, setIsLoadingAction] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'freemium' | 'business' | 'professional'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editFormData, setEditFormData] = useState({
    email: '',
    userType: 'business' as 'business' | 'professional' | 'freemium',
    companyName: ''
  });
  const { toast } = useToast();

  // Fetch users on component mount (let API handle auth)
  useEffect(() => {
    if (user) {
      fetchUsers();
    }
  }, [user]);

  // Filter users based on type and search term
  useEffect(() => {
    let filtered = users;

    // Filter by user type
    if (filterType !== 'all') {
      filtered = filtered.filter(user => user.userType === filterType);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(user =>
        user.email.toLowerCase().includes(term) ||
        user.companyName.toLowerCase().includes(term)
      );
    }

    setFilteredUsers(filtered);
  }, [users, filterType, searchTerm]);

  const fetchUsers = async () => {
    // Check if user is authenticated
    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please log in to access admin features.",
      });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      console.log('Fetching users with user ID:', user.uid);

      const response = await fetch('/api/admin/users', {
        headers: {
          'x-user-id': user.uid,
        },
      });

      console.log('API Response status:', response.status);

      if (response.status === 403) {
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "You don't have super admin privileges to access this feature.",
        });
        setIsLoading(false);
        return;
      }

      if (response.ok) {
        const data = await response.json();
        const usersWithStatus = data.users.map((user: User) => ({
          ...user,
          status: 'Active' as const, // Default status for now
        }));
        setUsers(usersWithStatus);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch users. You may not have admin privileges.",
        });
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load users. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getUserTypeBadge = (userType: string) => {
    switch (userType) {
      case "freemium":
        return <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">Freemium</Badge>;
      case "business":
        return <Badge className="bg-green-600 hover:bg-green-700">Business</Badge>;
      case "professional":
        return <Badge className="bg-purple-600 hover:bg-purple-700">Professional</Badge>;
      default:
        return <Badge variant="outline">{userType}</Badge>;
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "Active":
        return <Badge className="bg-green-600 hover:bg-green-700">Active</Badge>;
      case "Inactive":
         return <Badge variant="secondary">Inactive</Badge>;
      case "Suspended":
         return <Badge variant="destructive">Suspended</Badge>;
      default:
        return <Badge className="bg-green-600 hover:bg-green-700">Active</Badge>;
    }
  };

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setIsViewDialogOpen(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditFormData({
      email: user.email,
      userType: user.userType,
      companyName: user.companyName
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedUser) return;
    setIsLoadingAction('edit');

    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.uid || '',
        },
        body: JSON.stringify({
          targetUserId: selectedUser.id,
          updates: editFormData,
        }),
      });

      if (response.ok) {
        // Update local state
        setUsers(users.map((u: User) =>
          u.id === selectedUser.id
            ? { ...u, ...editFormData }
            : u
        ));
        toast({
          title: "User Updated",
          description: `User ${editFormData.email} has been updated successfully.`,
        });
        setIsEditDialogOpen(false);
        setSelectedUser(null);
      } else {
        const error = await response.json();
        toast({
          variant: "destructive",
          title: "Error",
          description: error.error || "Failed to update user.",
        });
      }
    } catch (error) {
      console.error("Error updating user:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update user. Please try again.",
      });
    } finally {
      setIsLoadingAction(null);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser) return;
    setIsLoadingAction('reset');

    try {
      // For now, simulate password reset since we don't have the actual implementation
      await new Promise(resolve => setTimeout(resolve, 800));
      toast({
        title: "Password Reset",
        description: `Password reset functionality will be implemented soon.`,
      });
      setIsResetPasswordDialogOpen(false);
      setSelectedUser(null);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to reset password.",
      });
    } finally {
      setIsLoadingAction(null);
    }
  };

  const handleSuspendUser = async () => {
    if (!selectedUser) return;
    setIsLoadingAction('suspend');

    try {
      // Update user status in local state for now
      setUsers(users.map((u: User) =>
        u.id === selectedUser.id
          ? { ...u, status: 'Suspended' as User['status'] }
          : u
      ));
      toast({
        title: "User Suspended",
        description: `${selectedUser.email} has been suspended.`,
        variant: "destructive",
      });
      setIsSuspendDialogOpen(false);
      setSelectedUser(null);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to suspend user.",
      });
    } finally {
      setIsLoadingAction(null);
    }
  };

  const handleUnsuspendUser = async () => {
    if (!selectedUser) return;
    setIsLoadingAction('unsuspend');

    try {
      // Update user status in local state for now
      setUsers(users.map((u: User) =>
        u.id === selectedUser.id
          ? { ...u, status: 'Active' as User['status'] }
          : u
      ));
      toast({
        title: "User Unsuspended",
        description: `${selectedUser.email} has been unsuspended and can now access the platform.`,
      });
      setIsUnsuspendDialogOpen(false);
      setSelectedUser(null);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to unsuspend user.",
      });
    } finally {
      setIsLoadingAction(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setIsLoadingAction('delete');

    try {
      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.uid || '',
        },
        body: JSON.stringify({
          targetUserId: selectedUser.id,
        }),
      });

      if (response.ok) {
        // Remove user from local state
        setUsers(users.filter((u: User) => u.id !== selectedUser.id));
        toast({
          title: "User Deleted",
          description: `${selectedUser.email} has been deleted from the system.`,
          variant: "destructive",
        });
        setIsDeleteDialogOpen(false);
        setSelectedUser(null);
      } else {
        const error = await response.json();
        toast({
          variant: "destructive",
          title: "Error",
          description: error.error || "Failed to delete user.",
        });
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete user. Please try again.",
      });
    } finally {
      setIsLoadingAction(null);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center size-12 rounded-full bg-destructive/10">
            <Ban className="size-6 text-destructive" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Access Denied</h1>
            <p className="text-muted-foreground">You don't have permission to access the admin users panel.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center size-12 rounded-full bg-primary/10">
            <Users className="size-6 text-primary" />
        </div>
        <div>
            <h1 className="text-3xl font-bold">All Users</h1>
            <p className="text-muted-foreground">View and manage all registered users on the platform.</p>
        </div>
      </div>

      {/* User Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Freemium Users</CardTitle>
            <Badge variant="outline" className="text-blue-600">F</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.filter(u => u.userType === 'freemium').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Business Users</CardTitle>
            <Badge className="bg-green-600">B</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.filter(u => u.userType === 'business').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Professional Users</CardTitle>
            <Badge className="bg-purple-600">P</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.filter(u => u.userType === 'professional').length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User List</CardTitle>
          <CardDescription>Manage user accounts, permissions, and status</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Search by email or company name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="freemium">Freemium Users</SelectItem>
                <SelectItem value="business">Business Users</SelectItem>
                <SelectItem value="professional">Professional Users</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={fetchUsers} disabled={isLoading} variant="outline">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Refresh
            </Button>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Email</TableHead>
                  <TableHead className="min-w-[150px]">Company</TableHead>
                  <TableHead className="min-w-[120px]">User Type</TableHead>
                  <TableHead className="min-w-[120px]">Joined On</TableHead>
                  <TableHead className="min-w-[100px]">Status</TableHead>
                  <TableHead className="text-right min-w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                      <p className="mt-2 text-muted-foreground">Loading users...</p>
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      {users.length === 0 ? "No users found." : "No users match your filters."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user: User) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium max-w-[200px] truncate">{user.email}</TableCell>
                      <TableCell className="max-w-[150px] truncate">{user.companyName || 'Not specified'}</TableCell>
                      <TableCell>{getUserTypeBadge(user.userType)}</TableCell>
                      <TableCell>
                        {formatUserDate(user.createdAt)}
                      </TableCell>
                      <TableCell>{getStatusBadge(user.status)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => handleViewUser(user)} disabled={isLoadingAction !== null}>
                              <Eye className="mr-2 h-4 w-4" />
                              View User Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditUser(user)} disabled={isLoadingAction !== null}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit User
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser(user);
                                setIsResetPasswordDialogOpen(true);
                              }}
                              disabled={isLoadingAction !== null || user.status === 'Suspended'}
                            >
                              <KeyRound className="mr-2 h-4 w-4" />
                              Reset Password
                            </DropdownMenuItem>
                            {user.status === 'Suspended' ? (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedUser(user);
                                  setIsUnsuspendDialogOpen(true);
                                }}
                                disabled={isLoadingAction !== null}
                                className="text-green-600 focus:text-green-700"
                              >
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Unsuspend User
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedUser(user);
                                  setIsSuspendDialogOpen(true);
                                }}
                                disabled={isLoadingAction !== null}
                                className="text-destructive focus:text-destructive"
                              >
                                <Ban className="mr-2 h-4 w-4" />
                                Suspend User
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser(user);
                                setIsDeleteDialogOpen(true);
                              }}
                              disabled={isLoadingAction !== null}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* View User Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>View complete information about this user</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <p className="text-sm font-medium">{selectedUser.email}</p>
              </div>
              <div className="space-y-2">
                <Label>Company Name</Label>
                <p className="text-sm font-medium">{selectedUser.companyName || 'Not specified'}</p>
              </div>
              <div className="space-y-2">
                <Label>User Type</Label>
                {getUserTypeBadge(selectedUser.userType)}
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <div>{getStatusBadge(selectedUser.status)}</div>
              </div>
              <div className="space-y-2">
                <Label>Joined On</Label>
                <p className="text-sm font-medium">
                  {formatUserDate(selectedUser.createdAt)}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editFormData.email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditFormData({ ...editFormData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-company">Company Name</Label>
              <Input
                id="edit-company"
                value={editFormData.companyName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditFormData({ ...editFormData, companyName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-type">User Type</Label>
              <Select
                value={editFormData.userType}
                onValueChange={(value: 'business' | 'professional' | 'freemium') => setEditFormData({ ...editFormData, userType: value })}
              >
                <SelectTrigger id="edit-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="freemium">Freemium</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isLoadingAction === 'edit'}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={isLoadingAction === 'edit'}>
              {isLoadingAction === 'edit' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <AlertDialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Password</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to send a password reset email to {selectedUser?.email}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoadingAction === 'reset'}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetPassword} disabled={isLoadingAction === 'reset'}>
              {isLoadingAction === 'reset' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Reset Email'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Suspend User Dialog */}
      <AlertDialog open={isSuspendDialogOpen} onOpenChange={setIsSuspendDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to suspend {selectedUser?.name}? They will not be able to access the platform until unsuspended.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoadingAction === 'suspend'}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSuspendUser} disabled={isLoadingAction === 'suspend'} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isLoadingAction === 'suspend' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Suspending...
                </>
              ) : (
                'Suspend User'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unsuspend User Dialog */}
      <AlertDialog open={isUnsuspendDialogOpen} onOpenChange={setIsUnsuspendDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsuspend User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unsuspend {selectedUser?.name}? They will regain access to the platform immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoadingAction === 'unsuspend'}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnsuspendUser} disabled={isLoadingAction === 'unsuspend'} className="bg-green-600 hover:bg-green-700">
              {isLoadingAction === 'unsuspend' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Unsuspending...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Unsuspend User
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete User Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedUser?.name}? This action cannot be undone. All user data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoadingAction === 'delete'}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} disabled={isLoadingAction === 'delete'} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isLoadingAction === 'delete' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete User'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
