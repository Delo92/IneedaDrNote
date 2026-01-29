import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useConfig } from "@/contexts/ConfigContext";
import type { Commission } from "@shared/schema";
import {
  Users,
  DollarSign,
  ClipboardList,
  ArrowRight,
  Copy,
  CheckCircle2,
  Clock,
  TrendingUp,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AgentDashboard() {
  const { user } = useAuth();
  const { config, getLevelName } = useConfig();
  const { toast } = useToast();

  const { data: commissions, isLoading: commissionsLoading } = useQuery<Commission[]>({
    queryKey: ["/api/commissions"],
  });

  const pendingCommissions = commissions?.filter((c) => c.status === "pending") || [];
  const approvedCommissions = commissions?.filter((c) => c.status === "approved") || [];
  const paidCommissions = commissions?.filter((c) => c.status === "paid") || [];

  const totalEarnings = paidCommissions.reduce(
    (sum, c) => sum + Number(c.amount),
    0
  );

  const pendingEarnings = [...pendingCommissions, ...approvedCommissions].reduce(
    (sum, c) => sum + Number(c.amount),
    0
  );

  const referralLink = user?.referralCode
    ? `${window.location.origin}/register?ref=${user.referralCode}`
    : null;

  const copyReferralLink = () => {
    if (referralLink) {
      navigator.clipboard.writeText(referralLink);
      toast({
        title: "Copied!",
        description: "Referral link copied to clipboard",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-dashboard-title">
            {getLevelName(3)} Dashboard
          </h1>
          <p className="text-muted-foreground">
            Manage your referrals and track your commissions.
          </p>
        </div>

        {/* Referral Link Card */}
        {referralLink && (
          <Card className="border-primary/20 bg-primary/5" data-testid="card-referral-link">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Your Referral Link</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 bg-background rounded-lg border px-3 py-2 text-sm font-mono truncate">
                  {referralLink}
                </div>
                <Button onClick={copyReferralLink} data-testid="button-copy-referral">
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Link
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Share this link to earn commissions on referrals
              </p>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card data-testid="card-stat-referrals">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
              <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">Registered users</p>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-pending">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {commissionsLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold">${pendingEarnings.toFixed(2)}</div>
              )}
              <p className="text-xs text-muted-foreground">
                {pendingCommissions.length + approvedCommissions.length} commissions
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-paid">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
              <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {commissionsLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold">${totalEarnings.toFixed(2)}</div>
              )}
              <p className="text-xs text-muted-foreground">
                {paidCommissions.length} paid commissions
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-work-queue">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
              <CardTitle className="text-sm font-medium">Work Queue</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">Tasks pending</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Commissions */}
        <Card data-testid="card-recent-commissions">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Commissions</CardTitle>
              <CardDescription>
                Track your commission status and payments
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/agent/commissions">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {commissionsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </div>
            ) : commissions && commissions.length > 0 ? (
              <div className="space-y-3">
                {commissions.slice(0, 5).map((commission) => (
                  <div
                    key={commission.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 border rounded-lg hover-elevate transition-all"
                    data-testid={`commission-${commission.id}`}
                  >
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      commission.status === "paid"
                        ? "bg-chart-2/10 text-chart-2"
                        : commission.status === "approved"
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {commission.status === "paid" ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <DollarSign className="h-5 w-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">
                        ${Number(commission.amount).toFixed(2)} Commission
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(commission.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge
                      variant={
                        commission.status === "paid"
                          ? "default"
                          : commission.status === "approved"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {commission.status.charAt(0).toUpperCase() + commission.status.slice(1)}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                  <TrendingUp className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No commissions yet</h3>
                <p className="text-muted-foreground max-w-sm">
                  Share your referral link to start earning commissions!
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
