import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useSearch } from "wouter";
import { GizmoForm, type GizmoFormData } from "@/components/shared/GizmoForm";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AlertCircle, FileText, CreditCard, Mail } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";

interface FormDataWithExtras extends GizmoFormData {
  letterTemplateUrl?: string;
}

type TabType = "form" | "esaletter";

export default function FormViewerPage() {
  const params = useParams<{ applicationId: string }>();
  const applicationId = params.applicationId;
  const { user } = useAuth();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const tabParam = searchParams.get("tab") as TabType | null;
  const [activeTab, setActiveTab] = useState<TabType>(tabParam || "form");

  const { data, isLoading, error } = useQuery<FormDataWithExtras>({
    queryKey: ["/api/forms/data", applicationId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/forms/data/${applicationId}`);
      return res.json();
    },
    enabled: !!applicationId && !!user,
  });

  const hasForm = !!data?.gizmoFormUrl;
  const hasLetter = !!data?.letterTemplateUrl;
  const hasMultipleTabs = [hasForm, hasLetter].filter(Boolean).length > 1;

  useEffect(() => {
    if (!data) return;
    if (activeTab === "form" && hasForm) return;
    if (activeTab === "esaletter" && hasLetter) return;
    if (hasForm) setActiveTab("form");
    else if (hasLetter) setActiveTab("esaletter");
  }, [data, hasForm, hasLetter]);

  const letterData: GizmoFormData | null = data && hasLetter ? { ...data, gizmoFormUrl: data.letterTemplateUrl! } : null;

  return (
    <DashboardLayout>
      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-[600px] w-full" />
        </div>
      )}
      {error && (
        <div className="p-6 border rounded-lg text-center space-y-3">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
          <p className="text-destructive font-medium">Failed to load form data</p>
          <p className="text-sm text-muted-foreground">{(error as any)?.message || "Please try again later."}</p>
        </div>
      )}
      {data && (
        <>
          {hasMultipleTabs && (
            <div className="flex gap-2 mb-4 flex-wrap" data-testid="form-viewer-tabs">
              {hasForm && (
                <Button variant={activeTab === "form" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("form")} data-testid="button-tab-form">
                  <FileText className="h-4 w-4 mr-2" />PDF Form
                </Button>
              )}
              {hasLetter && (
                <Button variant={activeTab === "esaletter" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("esaletter")} data-testid="button-tab-esaletter">
                  <Mail className="h-4 w-4 mr-2" />Letter
                </Button>
              )}
            </div>
          )}
          {activeTab === "form" && hasForm && <GizmoForm data={data} onClose={() => window.history.back()} />}
          {activeTab === "form" && !hasForm && (
            <div className="p-6 border rounded-lg text-center space-y-3">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="font-medium">No PDF Form Available</p>
              <p className="text-sm text-muted-foreground">A PDF template has not been assigned for this application yet.</p>
            </div>
          )}
          {activeTab === "esaletter" && letterData && <GizmoForm data={letterData} onClose={() => window.history.back()} />}
        </>
      )}
    </DashboardLayout>
  );
}
