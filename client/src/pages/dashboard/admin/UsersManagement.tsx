import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useConfig } from "@/contexts/ConfigContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User } from "@shared/schema";
import { Search, UserCog, Loader2 } from "lucide-react";

export default function UsersManagement() {
  const { getLevelName } = useConfig();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newLevel, setNewLevel] = useState<string>("");
  const [newStatus, setNewStatus] = useState<string>("");

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const updateUser = useMutation({
    mutationFn: async ({ id, userLevel, isActive }: { id: string; userLevel?: number; isActive?: boolean }) => {
      const response = await apiRequest("PUT", `/api/admin/users/${id}`, { userLevel, isActive });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setEditingUser(null);
      toast({
        title: "User Updated",
        description: "User has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const filteredUsers = users?.filter((user) => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = levelFilter === "all" || user.userLevel === parseInt(levelFilter);
    return matchesSearch && matchesLevel;
  }) || [];

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setNewLevel(user.userLevel.toString());
    setNewStatus(user.isActive ? "active" : "inactive");
  };

  const handleSaveUser = () => {
    if (editingUser) {
      updateUser.mutate({
        id: editingUser.id,
        userLevel: parseInt(newLevel),
        isActive: newStatus === "active",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-users-title">
            User Management
          </h1>
          <p className="text-muted-foreground">
            View and manage all users on the platform
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>All Users</CardTitle>
                <CardDescription>
                  {users?.length || 0} total users
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-full sm:w-64"
                    data-testid="input-search-users"
                  />
                </div>
                <Select value={levelFilter} onValueChange={setLevelFilter}>
                  <SelectTrigger className="w-full sm:w-40" data-testid="select-level-filter">
                    <SelectValue placeholder="Filter by level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="1">{getLevelName(1)}</SelectItem>
                    <SelectItem value="2">{getLevelName(2)}</SelectItem>
                    <SelectItem value="3">{getLevelName(3)}</SelectItem>
                    <SelectItem value="4">{getLevelName(4)}</SelectItem>
                    <SelectItem value="5">{getLevelName(5)}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((user) => (
                        <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
                          <TableCell className="font-medium">
                            {user.firstName} {user.lastName}
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {getLevelName(user.userLevel)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.isActive ? "default" : "destructive"}>
                              {user.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(user.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditUser(user)}
                              data-testid={`button-edit-user-${user.id}`}
                            >
                              <UserCog className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No users found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit User Dialog */}
        <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update user level and status for {editingUser?.firstName} {editingUser?.lastName}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">User Level</label>
                <Select value={newLevel} onValueChange={setNewLevel}>
                  <SelectTrigger data-testid="select-new-level">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">{getLevelName(1)}</SelectItem>
                    <SelectItem value="2">{getLevelName(2)}</SelectItem>
                    <SelectItem value="3">{getLevelName(3)}</SelectItem>
                    <SelectItem value="4">{getLevelName(4)}</SelectItem>
                    <SelectItem value="5">{getLevelName(5)}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger data-testid="select-new-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingUser(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveUser} disabled={updateUser.isPending} data-testid="button-save-user">
                {updateUser.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
