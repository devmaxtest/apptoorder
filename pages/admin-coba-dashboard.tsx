import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { useCobaStats, useCobaReports, useCobaAnalysis } from "@/hooks/useCoba";
import { 
  AlertCircle, 
  TrendingUp, 
  Activity, 
  AlertTriangle,
  Download,
  RefreshCw,
  BarChart3,
  Zap,
  CheckCircle2,
  AlertOctagon
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

function getHealthColor(score: number) {
  if (score >= 8) return "bg-green-500";
  if (score >= 6) return "bg-yellow-500";
  if (score >= 4) return "bg-orange-500";
  return "bg-red-500";
}

function getHealthBadge(score: number): "default" | "destructive" | "outline" | "secondary" {
  if (score >= 8) return "default";
  if (score >= 6) return "secondary";
  return "destructive";
}

function SeverityBadge({ severity }: { severity: string }) {
  const variants: Record<string, "default" | "destructive" | "secondary"> = {
    critical: "destructive",
    warning: "secondary",
    info: "default",
  };
  return <Badge variant={variants[severity] || "default"}>{severity.toUpperCase()}</Badge>;
}

export default function AdminCobaDashboard() {
  const [selectedRestaurant, setSelectedRestaurant] = useState<string | null>(null);
  
  // Fetch all restaurants for comparison
  const { data: restaurants } = useQuery({
    queryKey: ["/api/restaurants"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/restaurants");
      return res.json();
    },
  });

  // Fetch COBA stats for all restaurants
  const { data: allStats, isLoading: statsLoading, isError: statsError } = useCobaStats();
  const { data: selectedStats } = useCobaStats(selectedRestaurant || undefined);
  const { data: reports, isLoading: reportsLoading } = useCobaReports(selectedRestaurant || undefined);
  const { data: analysis, isLoading: analysisLoading } = useCobaAnalysis(selectedRestaurant || undefined);

  const cobaConfigured = !!(import.meta.env.VITE_COBA_API_URL && import.meta.env.VITE_COBA_API_KEY);
  const cobaOffline = cobaConfigured && (statsError || (!statsLoading && !allStats));

  const handleGenerateReport = async (restaurantId: string) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_COBA_API_URL}/api/coba/reports/generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-coba-key": import.meta.env.VITE_COBA_API_KEY,
          },
          body: JSON.stringify({ tenantId: restaurantId }),
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `coba-report-${restaurantId}-${new Date().toISOString().split('T')[0]}.pdf`;
        a.click();
      }
    } catch (error) {
      console.error("Failed to generate report:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">MaxAI COBA Monitoring</h1>
          <p className="text-muted-foreground">Platform health, alerts & insights</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Real-time
        </Button>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="comparison">Restaurants</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-4">
          {statsLoading ? (
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
            </div>
          ) : (
            <>
              {cobaOffline && (
                <Alert variant="destructive" className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Serveur COBA hors ligne</AlertTitle>
                  <AlertDescription>
                    Impossible de joindre le serveur MaxAI COBA ({import.meta.env.VITE_COBA_API_URL}). 
                    Le monitoring sera opérationnel dès que le serveur sera déployé. 
                    Les données ci-dessous sont basées sur les informations locales.
                  </AlertDescription>
                </Alert>
              )}
              {!cobaConfigured && (
                <Alert className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>COBA non configuré</AlertTitle>
                  <AlertDescription>
                    Les variables VITE_COBA_API_URL et VITE_COBA_API_KEY doivent être configurées pour activer le monitoring MaxAI.
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Santé plateforme</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end gap-4">
                      <div>
                        <div className={`text-4xl font-bold ${allStats ? getHealthColor(allStats.healthScore || 0) : "text-muted-foreground"}`}>
                          {allStats ? `${allStats.healthScore || 0}/10` : "—"}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">Score global</p>
                      </div>
                      <BarChart3 className="w-8 h-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Restaurants actifs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end gap-4">
                      <div>
                        <div className="text-4xl font-bold">{restaurants?.length || 0}</div>
                        <p className="text-xs text-muted-foreground mt-2">Surveillés</p>
                      </div>
                      <Activity className="w-8 h-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Alertes critiques</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end gap-4">
                      <div>
                        <div className="text-4xl font-bold text-muted-foreground">{allStats?.criticalErrors || 0}</div>
                        <p className="text-xs text-muted-foreground mt-2">Dernières 24h</p>
                      </div>
                      <AlertOctagon className="w-8 h-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {allStats?.recentAlerts && allStats.recentAlerts.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Alertes récentes</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {allStats.recentAlerts.slice(0, 3).map((alert: any, idx: number) => (
                      <Alert key={idx} variant={alert.severity === "critical" ? "destructive" : "default"}>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle className="text-sm">{alert.message}</AlertTitle>
                        <AlertDescription className="text-xs">{alert.restaurant} • {alert.timestamp}</AlertDescription>
                      </Alert>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* COMPARISON */}
        <TabsContent value="comparison" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Restaurant Health Comparison</CardTitle>
              <CardDescription>Real-time scores and metrics</CardDescription>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-64" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Restaurant</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Errors (24h)</TableHead>
                      <TableHead>Slow Requests</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {restaurants?.map((r: any) => {
                      const stats = allStats?.restaurants?.[r.id];
                      return (
                        <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedRestaurant(r.id)}>
                          <TableCell className="font-medium">{r.name}</TableCell>
                          <TableCell>
                            <Badge variant={getHealthBadge(stats?.score || 0)}>
                              {stats?.score || 0}/10
                            </Badge>
                          </TableCell>
                          <TableCell>{stats?.errorCount || 0}</TableCell>
                          <TableCell>{stats?.slowRequests || 0}</TableCell>
                          <TableCell>
                            <Badge variant={stats?.score >= 8 ? "default" : stats?.score >= 6 ? "secondary" : "destructive"}>
                              {stats?.score >= 8 ? "Healthy" : stats?.score >= 6 ? "Warning" : "Critical"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleGenerateReport(r.id)}
                            >
                              <Download className="w-3 h-3 mr-1" />
                              Report
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ALERTS */}
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Alerts & Warnings</CardTitle>
              <CardDescription>Issues requiring attention</CardDescription>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-96" />
              ) : allStats?.alerts && allStats.alerts.length > 0 ? (
                <div className="space-y-3">
                  {allStats.alerts.map((alert: any, idx: number) => (
                    <Alert key={idx} variant={alert.severity === "critical" ? "destructive" : "default"}>
                      <AlertTriangle className="h-4 w-4" />
                      <div className="ml-4 flex-1">
                        <AlertTitle>{alert.title}</AlertTitle>
                        <AlertDescription>
                          {alert.description}
                          <div className="mt-2 flex gap-2 items-center text-xs">
                            <SeverityBadge severity={alert.severity} />
                            <span>{alert.affectedRestaurants} restaurants</span>
                            <span className="text-muted-foreground">{alert.timestamp}</span>
                          </div>
                        </AlertDescription>
                      </div>
                    </Alert>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-green-500 mb-2" />
                  <p className="text-muted-foreground">All systems operational</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI INSIGHTS */}
        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI-Powered Recommendations</CardTitle>
              <CardDescription>Insights from MaxAI COBA analysis</CardDescription>
            </CardHeader>
            <CardContent>
              {analysisLoading ? (
                <Skeleton className="h-64" />
              ) : analysis ? (
                <div className="space-y-4">
                  {/* Top Insights */}
                  {analysis.insights && (
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        Key Insights
                      </h4>
                      <ul className="space-y-2">
                        {analysis.insights.map((insight: string, idx: number) => (
                          <li key={idx} className="text-sm p-3 bg-muted rounded-lg border-l-4 border-blue-500">
                            {insight}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recommendations */}
                  {analysis.recommendations && (
                    <div>
                      <h4 className="font-semibold mb-2">Actionable Recommendations</h4>
                      <ul className="space-y-2">
                        {analysis.recommendations.map((rec: any, idx: number) => (
                          <li key={idx} className="text-sm p-3 bg-muted rounded-lg border-l-4 border-green-500">
                            <div className="font-medium">{rec.title}</div>
                            <div className="text-xs text-muted-foreground mt-1">{rec.description}</div>
                            <div className="text-xs mt-2">Impact: <Badge variant="secondary">{rec.impact}</Badge></div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No analysis available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
