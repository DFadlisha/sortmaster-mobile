
import { Home, LayoutDashboard, User, ScanLine } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const BottomNav = () => {
    const location = useLocation();

    const isActive = (path: string) => location.pathname === path;

    return (
        <div className="fixed bottom-6 left-4 right-4 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex justify-around items-center z-50 shadow-2xl">
            <Link to="/" className={`flex flex-col items-center gap-1 transition-colors ${isActive("/") ? "text-blue-400" : "text-slate-400 hover:text-slate-200"}`}>
                <Home className="w-6 h-6" />
                <span className="text-xs font-medium">Home</span>
            </Link>

            <Link to="/scan" className={`flex flex-col items-center gap-1 transition-colors ${isActive("/scan") ? "text-blue-400" : "text-slate-400 hover:text-slate-200"}`}>
                <ScanLine className="w-6 h-6" />
                <span className="text-xs font-medium">Scan</span>
            </Link>

            <Link to="/dashboard" className={`flex flex-col items-center gap-1 transition-colors ${isActive("/dashboard") ? "text-blue-400" : "text-slate-400 hover:text-slate-200"}`}>
                <LayoutDashboard className="w-6 h-6" />
                <span className="text-xs font-medium">Dashboard</span>
            </Link>

            <div className="flex flex-col items-center gap-1 transition-colors text-slate-400 hover:text-slate-200 cursor-not-allowed opacity-50">
                <User className="w-6 h-6" />
                <span className="text-xs font-medium">Profile</span>
            </div>
        </div>
    );
};

export default BottomNav;
