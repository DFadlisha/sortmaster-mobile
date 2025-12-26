import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, TrendingDown, Package, Clock, AlertTriangle } from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface SortingLog {
  id: string;
  part_no: string;
  part_name: string;
  quantity_all_sorting: number;
  quantity_ng: number;
  logged_at: string;
  operator_name?: string;
}

interface HourlyData {
  hour: string;
  total: number;
  ng: number;
  ngRate: number;
}

interface HourlyOperatorOutput {
  operator_name: string;
  hour: string;
  total_logs: number;
  total_sorted: number;
  total_ng: number;
  ng_rate_percent: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<SortingLog[]>([]);
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
  const [hourlyOperatorData, setHourlyOperatorData] = useState<HourlyOperatorOutput[]>([]);
  const [stats, setStats] = useState({
    totalSorted: 0,
    totalNg: 0,
    ngRate: 0,
    partsProcessed: 0,
  });

  useEffect(() => {
    fetchLogs();
    fetchHourlyOperatorOutput();
    const channel = supabase
      .channel("sorting-logs-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sorting_logs",
        },
        () => {
          fetchLogs();
          fetchHourlyOperatorOutput();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("sorting_logs")
        .select("*")
        .order("logged_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      if (data) {
        setLogs(data);
        processData(data);
      }
    } catch (error) {
      console.error("Error fetching logs:", error);
    }
  };

  const fetchHourlyOperatorOutput = async () => {
    try {
      // Fetch from the hourly_operator_output view
      const { data, error } = await supabase
        .from("hourly_operator_output")
        .select("*")
        .order("hour", { ascending: false })
        .limit(50); // Get last 50 hours of data

      if (error) throw error;
      if (data) {
        setHourlyOperatorData(data);
      }
    } catch (error) {
      console.error("Error fetching hourly operator output:", error);
    }
  };

  const processData = (data: SortingLog[]) => {
    // Calculate overall stats
    const totalSorted = data.reduce((sum, log) => sum + log.quantity_all_sorting, 0);
    const totalNg = data.reduce((sum, log) => sum + log.quantity_ng, 0);
    const ngRate = totalSorted > 0 ? (totalNg / totalSorted) * 100 : 0;
    const partsProcessed = new Set(data.map((log) => log.part_no)).size;

    setStats({
      totalSorted,
      totalNg,
      ngRate,
      partsProcessed,
    });

    // Process hourly data
    const hourlyMap = new Map<string, { total: number; ng: number }>();
    
    data.forEach((log) => {
      const hour = new Date(log.logged_at).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
      
      const existing = hourlyMap.get(hour) || { total: 0, ng: 0 };
      hourlyMap.set(hour, {
        total: existing.total + log.quantity_all_sorting,
        ng: existing.ng + log.quantity_ng,
      });
    });

    const hourlyArray: HourlyData[] = Array.from(hourlyMap.entries())
      .map(([hour, values]) => ({
        hour,
        total: values.total,
        ng: values.ng,
        ngRate: values.total > 0 ? (values.ng / values.total) * 100 : 0,
      }))
      .slice(0, 12)
      .reverse();

    setHourlyData(hourlyArray);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="hover:bg-accent"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Quality Dashboard</h1>
          <div className="w-10" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Sorted</p>
                <p className="text-3xl font-bold text-foreground mt-2">
                  {stats.totalSorted.toLocaleString()}
                </p>
              </div>
              <Package className="h-10 w-10 text-primary opacity-80" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total NG</p>
                <p className="text-3xl font-bold text-destructive mt-2">
                  {stats.totalNg.toLocaleString()}
                </p>
              </div>
              <TrendingDown className="h-10 w-10 text-destructive opacity-80" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">NG Rate</p>
                <p
                  className={`text-3xl font-bold mt-2 ${
                    stats.ngRate > 5
                      ? "text-destructive"
                      : stats.ngRate > 2
                      ? "text-warning"
                      : "text-success"
                  }`}
                >
                  {stats.ngRate.toFixed(1)}%
                </p>
              </div>
              <AlertTriangle
                className={`h-10 w-10 opacity-80 ${
                  stats.ngRate > 5
                    ? "text-destructive"
                    : stats.ngRate > 2
                    ? "text-warning"
                    : "text-success"
                }`}
              />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Parts Processed</p>
                <p className="text-3xl font-bold text-foreground mt-2">
                  {stats.partsProcessed}
                </p>
              </div>
              <Clock className="h-10 w-10 text-primary opacity-80" />
            </div>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Hourly Production</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                  }}
                />
                <Legend />
                <Bar dataKey="total" fill="hsl(var(--chart-1))" name="Total Sorted" />
                <Bar dataKey="ng" fill="hsl(var(--chart-4))" name="NG" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">NG Rate Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="ngRate"
                  stroke="hsl(var(--chart-3))"
                  strokeWidth={3}
                  name="NG Rate %"
                  dot={{ fill: "hsl(var(--chart-3))" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Hourly Operator Output */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Hourly Output Per Operator</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                    Operator
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                    Hour
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">
                    Logs
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">
                    Total Sorted
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">
                    NG
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">
                    NG Rate
                  </th>
                </tr>
              </thead>
              <tbody>
                {hourlyOperatorData.length > 0 ? (
                  hourlyOperatorData.map((row, index) => (
                    <tr key={`${row.operator_name}-${row.hour}-${index}`} className="border-b border-border hover:bg-accent/50">
                      <td className="py-3 px-4 text-sm font-semibold">
                        {row.operator_name}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {new Date(row.hour).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-semibold">
                        {row.total_logs}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-semibold">
                        {row.total_sorted}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-semibold text-destructive">
                        {row.total_ng}
                      </td>
                      <td
                        className={`py-3 px-4 text-sm text-right font-semibold ${
                          row.ng_rate_percent > 5
                            ? "text-destructive"
                            : row.ng_rate_percent > 2
                            ? "text-warning"
                            : "text-success"
                        }`}
                      >
                        {row.ng_rate_percent.toFixed(1)}%
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      No hourly operator data available yet. Start logging sorting activities to see results.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Recent Logs */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Logs</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                    Time
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                    Operator
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                    Part No
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                    Part Name
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">
                    Sorted
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">
                    NG
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">
                    NG Rate
                  </th>
                </tr>
              </thead>
              <tbody>
                {logs.slice(0, 10).map((log) => {
                  const ngRate = (log.quantity_ng / log.quantity_all_sorting) * 100;
                  return (
                    <tr key={log.id} className="border-b border-border hover:bg-accent/50">
                      <td className="py-3 px-4 text-sm">
                        {new Date(log.logged_at).toLocaleTimeString()}
                      </td>
                      <td className="py-3 px-4 text-sm font-semibold">
                        {log.operator_name || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-sm font-mono">{log.part_no}</td>
                      <td className="py-3 px-4 text-sm">{log.part_name}</td>
                      <td className="py-3 px-4 text-sm text-right font-semibold">
                        {log.quantity_all_sorting}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-semibold text-destructive">
                        {log.quantity_ng}
                      </td>
                      <td
                        className={`py-3 px-4 text-sm text-right font-semibold ${
                          ngRate > 5
                            ? "text-destructive"
                            : ngRate > 2
                            ? "text-warning"
                            : "text-success"
                        }`}
                      >
                        {ngRate.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
