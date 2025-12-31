import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScanLine, ArrowUpRight, ArrowDownLeft, Wallet, Bell } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import OfflineSyncIndicator from "@/components/OfflineSyncIndicator";

interface DashboardStats {
  totalScanned: number;
  ngRate: number;
}

interface RecentActivity {
  id: string;
  part_name: string;
  status: string;
  count: string;
  time: string;
  user: string;
  color: string;
}

const Index = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({ totalScanned: 0, ngRate: 0 });
  const [recentLogs, setRecentLogs] = useState<RecentActivity[]>([]);

  useEffect(() => {
    fetchDashboardData();

    const channel = supabase
      .channel("index-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sorting_logs" },
        () => fetchDashboardData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch stats
      const { data: allLogs } = await supabase
        .from("sorting_logs")
        .select("quantity_all_sorting, quantity_ng, logged_at");

      if (allLogs) {
        const total = allLogs.reduce((sum, log) => sum + log.quantity_all_sorting, 0);
        const totalNg = allLogs.reduce((sum, log) => sum + log.quantity_ng, 0);
        const rate = total > 0 ? (totalNg / total) * 100 : 0;
        setStats({ totalScanned: total, ngRate: rate });
      }

      // Fetch Recent Activity
      const { data: recent } = await supabase
        .from("sorting_logs")
        .select(`
          id,
          logged_at,
          quantity_all_sorting,
          quantity_ng,
          operator_name,
          parts_master(part_name)
        `)
        .order("logged_at", { ascending: false })
        .limit(3);

      if (recent) {
        const formattedRecent = recent.map((log: any) => {
          const isNg = log.quantity_ng > 0;
          return {
            id: log.id,
            part_name: log.parts_master?.part_name || "Unknown Part",
            status: isNg ? "Rejected" : "Sorted",
            count: isNg ? `-${log.quantity_ng}` : `+${log.quantity_all_sorting}`,
            time: new Date(log.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            user: log.operator_name ? log.operator_name.substring(0, 2).toUpperCase() : "NA",
            color: isNg ? "bg-rose-500" : "bg-emerald-500"
          };
        });
        setRecentLogs(formattedRecent);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white pb-24 relative overflow-hidden">
      <OfflineSyncIndicator />
      {/* Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[40%] bg-blue-600/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="container mx-auto px-6 pt-12">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold">Let's Sort Today</h1>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="text-slate-300 hover:text-white hover:bg-white/10 rounded-full">
            <Bell className="w-6 h-6" />
          </Button>
        </div>

        {/* Main Card */}
        <div className="relative mb-8 group cursor-pointer" onClick={() => navigate("/dashboard")}>
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl blur opacity-40 group-hover:opacity-60 transition-opacity duration-500" />
          <div className="relative bg-gradient-to-br from-[#1e293b] to-[#0f172a] border border-white/10 rounded-3xl p-6 shadow-2xl overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-10">
              <ScanLine className="w-32 h-32 transform rotate-12 translate-x-8 -translate-y-8" />
            </div>

            <div className="relative z-10 flex justify-between items-center mb-4">
              <div>
                <p className="text-slate-400 font-medium mb-1">Total Scanned Today</p>
                <h2 className="text-4xl font-bold text-white tracking-tight">{stats.totalScanned.toLocaleString()}</h2>
              </div>
              <div className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                <span className={`text-xs font-semibold flex items-center gap-1 ${stats.ngRate > 3 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {stats.ngRate > 3 ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                  NG Rate: {stats.ngRate.toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="relative z-10">
              <p className="text-xs text-slate-500">Tap to view full dashboard analytics</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 gap-4 mb-8">
          <Button
            onClick={() => navigate("/scan")}
            className="h-auto py-6 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-lg shadow-blue-900/20 flex flex-row items-center justify-center gap-3 transition-all hover:scale-[1.02]"
          >
            <div className="bg-white/20 p-2 rounded-full">
              <ScanLine className="w-6 h-6" />
            </div>
            <span className="font-semibold text-lg">Start New Scan</span>
          </Button>
        </div>

        {/* Recent Activity List */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-slate-200">Recent Statistics</h3>
            <span className="text-sm text-blue-400 font-medium cursor-pointer hover:text-blue-300" onClick={() => navigate("/dashboard")}>View All &gt;</span>
          </div>

          <div className="space-y-4">
            {recentLogs.length > 0 ? (
              recentLogs.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 bg-[#1e293b]/40 border border-white/5 rounded-2xl hover:bg-[#1e293b]/60 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full ${item.color} flex items-center justify-center text-xs font-bold shadow-lg`}>
                      {item.user}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-200">{item.part_name}</h4>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs ${item.status === 'Rejected' ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {item.status === 'Rejected' ? <ArrowDownLeft className="w-3 h-3 inline mr-1" /> : <ArrowUpRight className="w-3 h-3 inline mr-1" />}
                          {item.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-white">{item.count}</p>
                    <p className="text-xs text-slate-500">{item.time}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-slate-500 text-sm">No recent activity</div>
            )}
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Index;
