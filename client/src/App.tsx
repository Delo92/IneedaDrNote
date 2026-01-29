import { lazy, Suspense } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { ConfigProvider } from "@/contexts/ConfigContext";
import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Loader2 } from "lucide-react";

// Lazy load pages for code-splitting
const Home = lazy(() => import("@/pages/Home"));
const Login = lazy(() => import("@/pages/Login"));
const Register = lazy(() => import("@/pages/Register"));
const Packages = lazy(() => import("@/pages/Packages"));
const SetupRequired = lazy(() => import("@/pages/SetupRequired"));
const NotFound = lazy(() => import("@/pages/not-found"));

// Dashboard pages
const ApplicantDashboard = lazy(() => import("@/pages/dashboard/ApplicantDashboard"));
const ReviewerDashboard = lazy(() => import("@/pages/dashboard/ReviewerDashboard"));
const AgentDashboard = lazy(() => import("@/pages/dashboard/AgentDashboard"));
const AdminDashboard = lazy(() => import("@/pages/dashboard/AdminDashboard"));
const OwnerDashboard = lazy(() => import("@/pages/dashboard/OwnerDashboard"));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        {/* Public routes */}
        <Route path="/" component={Home} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/packages" component={Packages} />
        <Route path="/setup" component={SetupRequired} />

        {/* Applicant Dashboard (Level 1) */}
        <Route path="/dashboard/applicant">
          <ProtectedRoute requiredLevel={1}>
            <ApplicantDashboard />
          </ProtectedRoute>
        </Route>
        <Route path="/dashboard/applicant/:rest*">
          <ProtectedRoute requiredLevel={1}>
            <ApplicantDashboard />
          </ProtectedRoute>
        </Route>

        {/* Reviewer Dashboard (Level 2) */}
        <Route path="/dashboard/reviewer">
          <ProtectedRoute requiredLevel={2}>
            <ReviewerDashboard />
          </ProtectedRoute>
        </Route>
        <Route path="/dashboard/reviewer/:rest*">
          <ProtectedRoute requiredLevel={2}>
            <ReviewerDashboard />
          </ProtectedRoute>
        </Route>

        {/* Agent Dashboard (Level 3) */}
        <Route path="/dashboard/agent">
          <ProtectedRoute requiredLevel={3}>
            <AgentDashboard />
          </ProtectedRoute>
        </Route>
        <Route path="/dashboard/agent/:rest*">
          <ProtectedRoute requiredLevel={3}>
            <AgentDashboard />
          </ProtectedRoute>
        </Route>

        {/* Admin Dashboard (Level 4) */}
        <Route path="/dashboard/admin">
          <ProtectedRoute requiredLevel={4}>
            <AdminDashboard />
          </ProtectedRoute>
        </Route>
        <Route path="/dashboard/admin/:rest*">
          <ProtectedRoute requiredLevel={4}>
            <AdminDashboard />
          </ProtectedRoute>
        </Route>

        {/* Owner Dashboard (Level 5) */}
        <Route path="/dashboard/owner">
          <ProtectedRoute requiredLevel={5}>
            <OwnerDashboard />
          </ProtectedRoute>
        </Route>
        <Route path="/dashboard/owner/:rest*">
          <ProtectedRoute requiredLevel={5}>
            <OwnerDashboard />
          </ProtectedRoute>
        </Route>

        {/* Fallback to 404 */}
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="app-theme">
        <AuthProvider>
          <ConfigProvider>
            <TooltipProvider>
              <Toaster />
              <Switch>
                {/* Dashboard routes don't use AppShell (they have their own layout) */}
                <Route path="/dashboard/:rest*">
                  <Router />
                </Route>
                {/* All other routes use AppShell */}
                <Route>
                  <AppShell>
                    <Router />
                  </AppShell>
                </Route>
              </Switch>
            </TooltipProvider>
          </ConfigProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
