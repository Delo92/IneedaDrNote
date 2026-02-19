import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { FileText, Search, Clock, CheckCircle, XCircle, Send, Copy, Link, Loader2, Stethoscope } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

function statusBadge(status: string) {
  const variants: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    doctor_review: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    doctor_approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    doctor_denied: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };
  const labels: Record<string, string> = {
    pending: "Pending",
    doctor_review: "Doctor Review",
    doctor_approved: "Doctor Approved",
    doctor_denied: "Doctor Denied",
    completed: "Completed",
    rejected: "Rejected",
  };
  return (
    <Badge variant="secondary" className={variants[status] || ""}>
      {labels[status] || status}
    </Badge>
  );
}

export default function ApplicationsListPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [reviewLinkDialog, setReviewLinkDialog] = useState<{ open: boolean; url: string; doctorName: string }>({
    open: false,
    url: "",
    doctorName: "",
  });

  const { data: applications, isLoading } = useQuery<any[]>({
    queryKey: ["/api/applications"],
  });

  const sendToDoctorMutation = useMutation({
    mutationFn: async ({ applicationId, doctorId }: { applicationId: string; doctorId?: string }) => {
      const res = await apiRequest("POST", `/api/admin/applications/${applicationId}/send-to-doctor`, { doctorId });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      setReviewLinkDialog({
        open: true,
        url: data.reviewUrl,
        doctorName: data.doctor?.name || "Doctor",
      });
      toast({ title: "Sent to Doctor", description: `Application assigned to ${data.doctor?.name || "doctor"}.` });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (!user) return null;

  const isAdmin = (user.userLevel || 0) >= 3;

  const filtered = (applications || []).filter((app) => {
    if (statusFilter !== "all" && app.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const match =
        app.id?.toLowerCase().includes(q) ||
        app.patientName?.toLowerCase().includes(q) ||
        app.patientEmail?.toLowerCase().includes(q) ||
        app.packageName?.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const pending = (applications || []).filter(a => a.status === "pending").length;
  const inReview = (applications || []).filter(a => a.status === "doctor_review").length;
  const approved = (applications || []).filter(a => ["doctor_approved", "completed"].includes(a.status)).length;
  const denied = (applications || []).filter(a => ["doctor_denied", "rejected"].includes(a.status)).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-applications-title">
              All Orders
            </h1>
            <p className="text-muted-foreground">
              View and manage all doctor's note orders in the system
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{applications?.length || 0}</div>
              <p className="text-xs text-muted-foreground">All orders</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pending + inReview}</div>
              <p className="text-xs text-muted-foreground">Awaiting review</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{approved}</div>
              <p className="text-xs text-muted-foreground">Successfully approved</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
              <CardTitle className="text-sm font-medium">Rejected</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{denied}</div>
              <p className="text-xs text-muted-foreground">Not approved</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Orders</CardTitle>
            <CardDescription>All doctor's note orders in the system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or ID..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  data-testid="input-search-applications"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="doctor_review">Doctor Review</SelectItem>
                  <SelectItem value="doctor_approved">Approved</SelectItem>
                  <SelectItem value="doctor_denied">Denied</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No orders yet</h3>
                <p className="text-muted-foreground max-w-sm">
                  Orders will appear here as customers submit them.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((app) => (
                  <div
                    key={app.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-md border"
                    data-testid={`row-application-${app.id}`}
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">
                          {app.patientName || app.userId || "Unknown Patient"}
                        </span>
                        {statusBadge(app.status)}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                        <span>{app.packageName || "Package"}</span>
                        <span>-</span>
                        <span>{new Date(app.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {isAdmin && app.status === "pending" && (
                        <Button
                          size="sm"
                          data-testid={`button-send-to-doctor-${app.id}`}
                          onClick={() => sendToDoctorMutation.mutate({ applicationId: app.id })}
                          disabled={sendToDoctorMutation.isPending}
                        >
                          {sendToDoctorMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Send className="h-4 w-4 mr-2" />
                          )}
                          Send to Doctor
                        </Button>
                      )}
                      {app.status === "doctor_review" && (
                        <Badge variant="outline" className="gap-1">
                          <Stethoscope className="h-3 w-3" />
                          With Doctor
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={reviewLinkDialog.open} onOpenChange={(open) => setReviewLinkDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link className="h-5 w-5" />
              Doctor Review Link Generated
            </DialogTitle>
            <DialogDescription>
              Share this link with {reviewLinkDialog.doctorName} to review the application. The link expires in 7 days.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={reviewLinkDialog.url}
                className="flex-1 font-mono text-sm"
                data-testid="input-review-link"
              />
              <Button
                size="icon"
                variant="outline"
                data-testid="button-copy-review-link"
                onClick={() => {
                  navigator.clipboard.writeText(reviewLinkDialog.url);
                  toast({ title: "Copied", description: "Review link copied to clipboard." });
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              The doctor can open this link to view patient details and approve or deny the application without needing to log in.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
