import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScanLine, ArrowUpRight, ArrowDownLeft, Wallet, Bell } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0f172a] text-white pb-24 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[40%] bg-blue-600/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="container mx-auto px-6 pt-12">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Avatar className="w-12 h-12 border-2 border-white/10 ring-2 ring-blue-500/20">
              <AvatarImage src="/placeholder-user.jpg" />
              <AvatarFallback className="bg-slate-700 text-blue-400 font-bold">QS</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-slate-400 text-sm">Welcome Operator!</p>
              <h1 className="text-xl font-bold">Let's Sort Today</h1>
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
              <Wallet className="w-32 h-32 transform rotate-12 translate-x-8 -translate-y-8" />
            </div>

            <div className="relative z-10 flex justify-between items-start mb-8">
              <div>
                <p className="text-slate-400 font-medium mb-1">Total Scanned Today</p>
                <h2 className="text-4xl font-bold text-white tracking-tight">1,248</h2>
              </div>
              <div className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3" /> +12.5%
                </span>
              </div>
            </div>

            <div className="relative z-10 flex justify-between items-end">
              <div>
                <p className="text-xs text-slate-500 font-mono mb-1">CURRENT SHIFT</p>
                <p className="text-lg font-semibold tracking-widest">#### 8842</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 mb-1">STATUS</p>
                <p className="text-sm font-semibold text-blue-400">Active</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <Button
            onClick={() => navigate("/scan")}
            className="h-auto py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-lg shadow-blue-900/20 flex flex-col gap-2 transition-all hover:scale-[1.02]"
          >
            <div className="bg-white/20 p-2 rounded-full">
              <ScanLine className="w-6 h-6" />
            </div>
            <span className="font-semibold">Scan Parts</span>
          </Button>

          <div className="bg-[#1e293b]/50 border border-white/5 rounded-2xl p-4 flex flex-col justify-center items-center gap-2">
            <div className="text-center">
              <p className="text-xs text-slate-400">NG Rate</p>
              <p className="text-xl font-bold text-emerald-400">2.4%</p>
            </div>
            <p className="text-[10px] text-slate-500">Target: &lt;3.0%</p>
          </div>
        </div>

        {/* Recent Activity List */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-slate-200">Recent Statistics</h3>
            <span className="text-sm text-blue-400 font-medium cursor-pointer hover:text-blue-300">View All &gt;</span>
          </div>

          <div className="space-y-4">
            {[
              { name: "Housing Rear", status: "Sorted", count: "+450", time: "10:42 AM", user: "HA", color: "bg-emerald-500" },
              { name: "Bracket Mount", status: "Rejected", count: "-12", time: "09:15 AM", user: "CF", color: "bg-rose-500" },
              { name: "Seal Ring", status: "Sorted", count: "+890", time: "08:30 AM", user: "GH", color: "bg-blue-500" },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-[#1e293b]/40 border border-white/5 rounded-2xl hover:bg-[#1e293b]/60 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full ${item.color} flex items-center justify-center text-xs font-bold shadow-lg`}>
                    {item.user}
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-200">{item.name}</h4>
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
            ))}
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Index;
