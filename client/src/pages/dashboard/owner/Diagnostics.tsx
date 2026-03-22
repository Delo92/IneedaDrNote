import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle, AlertCircle, Info, ShieldAlert,
  ChevronDown, ChevronRight, RefreshCw, Search,
  BarChart3, TrendingUp, Users, Eye, Clock,
  Globe, FileText, Loader2, Activity,
} from "lucide-react";

interface ErrorLog {
  id: string;
  errorType: string;
  severity: string;
  message: string;
  stackTrace?: string;
  userUid?: string;
  userName?: string;
  userEmail?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  context?: Record<string, any>;
  wasShownToUser?: boolean;
  timestamp: string;
  createdAt: string;
}

interface GA4Data {
  overview: {
    activeUsers: number;
    sessions: number;
    pageViews: number;
    avgSessionDuration: number;
    bounceRate: number;
    newUsers: number;
  };
  topPages: Array<{ path: string; views: number; users: number }>;
  dailyData: Array<{ date: string; users: number; sessions: number; pageViews: number }>;
  trafficSources: Array<{ source: string; sessions: number }>;
}

const severityColors: Record<string, string> = {
  critical: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300",
  error: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300",
  warning: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300",
  info: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300",
};

const SeverityIcon = ({ severity }: { severity: string }) => {
  const icons: Record<string, any> = {
    critical: ShieldAlert, error: AlertCircle, warning: AlertTriangle, info: Info,
  };
  const Icon = icons[severity] || Info;
  return <Icon className="h-4 w-4" />;
};

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

function MiniBarChart({ data, dataKey, maxHeight = 80 }: {
  data: Array<Record<string, any>>; dataKey: string; maxHeight?: number;
}) {
  if (!data.length) return null;
  const values = data.map(d => d[dataKey] as number);
  const max = Math.max(...values, 1);
  const barW = Math.max(3, Math.min(16, Math.floor(560 / data.length) - 2));
  return (
    <div className="flex items-end gap-[2px]" style={{ height: maxHeight }}>
      {data.map((d, i) => {
        const h = Math.max(2, (d[dataKey] / max) * (maxHeight - 4));
        return (
          <div
            key={i}
            className="bg-primary/70 hover:bg-primary rounded-t transition-colors cursor-default flex-shrink-0"
            style={{ width: barW, height: h }}
            title={`${d.date}: ${d[dataKey]}`}
          />
        );
      })}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, sub }: {
  label: string; value: string | number; icon: any; sub?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">{label}</span>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="text-2xl font-semibold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function AnalyticsTab() {
  const [dateRange, setDateRange] = useState("30d");

  const { data, isLoading, error, refetch } = useQuery<GA4Data>({
    queryKey: ["/api/admin/ga4-analytics", dateRange],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/admin/ga4-analytics?dateRange=${dateRange}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed to fetch analytics");
      return json.data;
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const rangeLabel: Record<string, string> = {
    "1d": "1 day", "3d": "3 days", "7d": "7 days",
    "30d": "30 days", "90d": "90 days", "1y": "1 year",
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Connecting to Google Analytics...
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-40" />
        <div className="grid md:grid-cols-2 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    const msg = (error as Error)?.message || "";
    const isNotConfigured = msg.includes("GA4_PROPERTY_ID");
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-3">
          <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/40" />
          <p className="font-medium">
            {isNotConfigured ? "GA4 Property ID not configured" : "Analytics unavailable"}
          </p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {isNotConfigured
              ? "Add your numeric GA4 Property ID as the GA4_PROPERTY_ID secret to enable live traffic data."
              : msg || "Could not connect to Google Analytics. Check that the service account has Viewer access and the Analytics Data API is enabled."}
          </p>
          <Button size="sm" variant="outline" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { overview, topPages, dailyData, trafficSources } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            Showing data for the last {rangeLabel[dateRange]}
          </p>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            GA4 Connected
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">Last 1 day</SelectItem>
              <SelectItem value="3d">Last 3 days</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Active Users" value={overview.activeUsers.toLocaleString()} icon={Users} />
        <StatCard label="New Users" value={overview.newUsers.toLocaleString()} icon={TrendingUp} />
        <StatCard label="Sessions" value={overview.sessions.toLocaleString()} icon={Activity} />
        <StatCard label="Page Views" value={overview.pageViews.toLocaleString()} icon={Eye} />
        <StatCard label="Avg. Duration" value={formatDuration(overview.avgSessionDuration)} icon={Clock} />
        <StatCard label="Bounce Rate" value={`${(overview.bounceRate * 100).toFixed(1)}%`} icon={TrendingUp} />
      </div>

      {dailyData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Daily Users</CardTitle>
          </CardHeader>
          <CardContent>
            <MiniBarChart data={dailyData} dataKey="users" maxHeight={100} />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{dailyData[0]?.date}</span>
              <span>{dailyData[dailyData.length - 1]?.date}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" /> Top Pages
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topPages.length === 0 ? (
              <p className="text-sm text-muted-foreground">No page data yet</p>
            ) : topPages.map((page, i) => {
              const maxViews = topPages[0]?.views || 1;
              return (
                <div key={i} className="space-y-0.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate text-muted-foreground font-mono text-xs max-w-[65%]">
                      {page.path}
                    </span>
                    <span className="font-medium">{page.views.toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary/60 rounded-full"
                      style={{ width: `${(page.views / maxViews) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Globe className="h-4 w-4" /> Traffic Sources
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {trafficSources.length === 0 ? (
              <p className="text-sm text-muted-foreground">No source data yet</p>
            ) : trafficSources.map((src, i) => {
              const maxSessions = trafficSources[0]?.sessions || 1;
              return (
                <div key={i} className="space-y-0.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate text-muted-foreground">{src.source}</span>
                    <span className="font-medium">{src.sessions.toLocaleString()} sessions</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary/60 rounded-full"
                      style={{ width: `${(src.sessions / maxSessions) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ErrorLogsTab() {
  const [severityFilter, setSeverityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;

  const params = new URLSearchParams({
    limit: String(PAGE_SIZE),
    offset: String(page * PAGE_SIZE),
  });
  if (severityFilter !== "all") params.set("severity", severityFilter);
  if (typeFilter !== "all") params.set("errorType", typeFilter);

  const { data, isLoading, refetch } = useQuery<{ logs: ErrorLog[]; total: number }>({
    queryKey: ["/api/admin/error-logs", severityFilter, typeFilter, page],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/admin/error-logs?${params}`);
      return res.json();
    },
    staleTime: 60 * 1000,
  });

  const logs = data?.logs || [];
  const total = data?.total || 0;

  const filtered = search
    ? logs.filter(l =>
        l.message.toLowerCase().includes(search.toLowerCase()) ||
        l.errorType.toLowerCase().includes(search.toLowerCase()) ||
        l.endpoint?.toLowerCase().includes(search.toLowerCase()) ||
        l.userEmail?.toLowerCase().includes(search.toLowerCase())
      )
    : logs;

  const stats = {
    critical: logs.filter(l => l.severity === "critical").length,
    error: logs.filter(l => l.severity === "error").length,
    warning: logs.filter(l => l.severity === "warning").length,
    info: logs.filter(l => l.severity === "info").length,
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(["critical", "error", "warning", "info"] as const).map(sev => {
          const iconMap = { critical: ShieldAlert, error: AlertCircle, warning: AlertTriangle, info: Info };
          const colorMap = {
            critical: "text-red-500", error: "text-orange-500",
            warning: "text-yellow-500", info: "text-blue-500",
          };
          const Icon = iconMap[sev];
          return (
            <Card key={sev}>
              <CardContent className="p-4 flex items-center gap-3">
                <Icon className={`h-5 w-5 ${colorMap[sev]}`} />
                <div>
                  <p className="text-2xl font-bold">{stats[sev]}</p>
                  <p className="text-xs text-muted-foreground capitalize">{sev}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <Select value={severityFilter} onValueChange={(v) => { setSeverityFilter(v); setPage(0); }}>
            <SelectTrigger className="w-36" data-testid="select-severity-filter">
              <SelectValue placeholder="All severities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="info">Info</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(0); }}>
            <SelectTrigger className="w-40" data-testid="select-type-filter">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {[
                "api", "client", "payment", "authentication", "email",
                "database", "system", "validation", "form_upload",
                "registration", "pdf", "workflow", "uncategorized",
              ].map(t => (
                <SelectItem key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1).replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 w-52 h-9"
              data-testid="input-log-search"
            />
          </div>
          <Button size="sm" variant="ghost" onClick={() => refetch()} className="gap-1.5" data-testid="button-refresh-logs">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Activity className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">
              {search ? "No logs match your search" : "No error logs yet — that's a good sign!"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1.5">
          {filtered.map(log => (
            <div
              key={log.id}
              className={`border rounded-lg overflow-hidden transition-colors ${severityColors[log.severity] || ""}`}
              data-testid={`log-entry-${log.id}`}
            >
              <button
                className="w-full text-left p-3 flex items-start gap-3"
                onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                data-testid={`button-expand-log-${log.id}`}
              >
                <SeverityIcon severity={log.severity} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs font-mono">{log.errorType}</Badge>
                    {log.wasShownToUser && (
                      <Badge variant="outline" className="text-xs">Shown to user</Badge>
                    )}
                    <span className="text-sm font-medium truncate">{log.message}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs opacity-70 flex-wrap">
                    {log.endpoint && <span>{log.method} {log.endpoint}</span>}
                    {log.userEmail && <span>{log.userEmail}</span>}
                    <span>{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                </div>
                {expanded === log.id
                  ? <ChevronDown className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  : <ChevronRight className="h-4 w-4 flex-shrink-0 mt-0.5" />}
              </button>

              {expanded === log.id && (
                <div className="px-4 pb-4 space-y-2 border-t border-current/10">
                  {log.userEmail && (
                    <div className="text-xs mt-2">
                      <span className="font-medium">User: </span>
                      {log.userName && <span>{log.userName} — </span>}
                      <span>{log.userEmail}</span>
                      {log.userUid && <span className="opacity-60 ml-1">({log.userUid})</span>}
                    </div>
                  )}
                  {log.statusCode && (
                    <div className="text-xs">
                      <span className="font-medium">Status: </span>{log.statusCode}
                    </div>
                  )}
                  {log.context && Object.keys(log.context).length > 0 && (
                    <div className="text-xs">
                      <span className="font-medium">Context:</span>
                      <pre className="mt-1 bg-black/10 dark:bg-white/10 rounded p-2 overflow-x-auto text-xs whitespace-pre-wrap">
                        {JSON.stringify(log.context, null, 2)}
                      </pre>
                    </div>
                  )}
                  {log.stackTrace && (
                    <div className="text-xs">
                      <span className="font-medium">Stack trace:</span>
                      <pre className="mt-1 bg-black/10 dark:bg-white/10 rounded p-2 overflow-x-auto text-xs whitespace-pre-wrap opacity-80">
                        {log.stackTrace}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm text-muted-foreground pt-2">
          <span>{total} total logs · page {page + 1} of {Math.ceil(total / PAGE_SIZE)}</span>
          <div className="flex gap-2">
            <Button
              size="sm" variant="outline"
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
              data-testid="button-logs-prev"
            >
              Previous
            </Button>
            <Button
              size="sm" variant="outline"
              disabled={(page + 1) * PAGE_SIZE >= total}
              onClick={() => setPage(p => p + 1)}
              data-testid="button-logs-next"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Diagnostics() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-diagnostics-title">
            Diagnostics
          </h1>
          <p className="text-muted-foreground">Site traffic analytics and error monitoring</p>
        </div>

        <Tabs defaultValue="errors">
          <TabsList className="mb-2">
            <TabsTrigger value="analytics" className="flex items-center gap-2" data-testid="tab-analytics">
              <BarChart3 className="h-4 w-4" /> Analytics
            </TabsTrigger>
            <TabsTrigger value="errors" className="flex items-center gap-2" data-testid="tab-error-logs">
              <AlertTriangle className="h-4 w-4" /> Error Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics">
            <AnalyticsTab />
          </TabsContent>

          <TabsContent value="errors">
            <ErrorLogsTab />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
