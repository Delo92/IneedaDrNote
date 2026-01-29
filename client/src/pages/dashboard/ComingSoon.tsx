import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Construction, ArrowLeft } from "lucide-react";

interface ComingSoonProps {
  title: string;
  description?: string;
  backPath: string;
}

export default function ComingSoon({ title, description, backPath }: ComingSoonProps) {
  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <Card className="text-center">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <Construction className="h-10 w-10 text-muted-foreground" />
            </div>
            <CardTitle className="text-2xl">{title}</CardTitle>
            <CardDescription>
              {description || "This feature is coming soon. Check back later!"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <Link href={backPath}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

export function ApplicantDocuments() {
  return <ComingSoon title="Documents" description="Upload and manage your documents here." backPath="/dashboard/applicant" />;
}

export function ApplicantMessages() {
  return <ComingSoon title="Messages" description="Communicate with support and reviewers." backPath="/dashboard/applicant" />;
}

export function ApplicantPayments() {
  return <ComingSoon title="Payments" description="View your payment history and invoices." backPath="/dashboard/applicant" />;
}

export function ApplicantSettings() {
  return <ComingSoon title="Settings" description="Manage your account settings." backPath="/dashboard/applicant" />;
}

export function ReviewerQueue() {
  return <ComingSoon title="Review Queue" description="View and claim applications for review." backPath="/dashboard/reviewer" />;
}

export function AgentReferrals() {
  return <ComingSoon title="My Referrals" description="Track your referred users." backPath="/dashboard/agent" />;
}

export function AgentCommissions() {
  return <ComingSoon title="Commissions" description="View your commission earnings and payouts." backPath="/dashboard/agent" />;
}

export function AdminAnalytics() {
  return <ComingSoon title="Analytics" description="View platform performance metrics." backPath="/dashboard/admin" />;
}

export function AdminPackages() {
  return <ComingSoon title="Package Management" description="Create and manage service packages." backPath="/dashboard/admin" />;
}

export function OwnerAnalytics() {
  return <ComingSoon title="Analytics" description="Comprehensive platform analytics and reporting." backPath="/dashboard/owner" />;
}

export function OwnerCommissions() {
  return <ComingSoon title="Commission Management" description="Review and approve agent commissions." backPath="/dashboard/owner" />;
}
