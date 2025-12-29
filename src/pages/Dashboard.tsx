import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Bell, MoreHorizontal, Plus, TrendingUp, Download, Package, Clock } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import jsPDF from "jspdf";
import "jspdf-autotable";
import {
  AreaChart,
  Area,
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
  reject_image_url?: string;
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
        .from("hourly_operator_output" as any)
        .select("*")
        .order("hour", { ascending: false })
        .limit(50); // Get last 50 hours of data

      if (error) throw error;
      if (data) {
        setHourlyOperatorData(data as unknown as HourlyOperatorOutput[]);
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

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Professional color scheme
    const colors = {
      primary: [30, 58, 138],      // Deep blue
      secondary: [59, 130, 246],   // Bright blue
      accent: [16, 185, 129],      // Green
      danger: [239, 68, 68],       // Red
      warning: [245, 158, 11],     // Orange
      lightGray: [243, 244, 246],  // Light gray
      darkGray: [107, 114, 128],   // Dark gray
      white: [255, 255, 255],
      black: [0, 0, 0],
    };

    const addHeader = (yPos: number) => {
      // Header background
      doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.rect(0, 0, pageWidth, 35, "F");

      // Company/Title text
      doc.setTextColor(colors.white[0], colors.white[1], colors.white[2]);
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("SIC Triplus - Quality Sorting Report", pageWidth / 2, 18, { align: "center" });

      // Subtitle
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Generated: ${new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}`,
        pageWidth / 2,
        28,
        { align: "center" }
      );

      // Reset text color
      doc.setTextColor(colors.black[0], colors.black[1], colors.black[2]);
      return yPos + 45;
    };

    const addStatBox = (x: number, y: number, width: number, height: number, label: string, value: string, color: number[]) => {
      // Box background with gradient effect
      doc.setFillColor(color[0], color[1], color[2]);
      doc.setDrawColor(color[0] - 20, color[1] - 20, color[2] - 20);
      doc.setLineWidth(0.5);
      doc.roundedRect(x, y, width, height, 3, 3, "FD");

      // Label
      doc.setTextColor(colors.white[0], colors.white[1], colors.white[2]);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(label, x + width / 2, y + 8, { align: "center" });

      // Value
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(value, x + width / 2, y + 18, { align: "center" });

      // Reset text color
      doc.setTextColor(colors.black[0], colors.black[1], colors.black[2]);
    };

    const addCoverPage = () => {
      // Full page background gradient effect (top section)
      doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.rect(0, 0, pageWidth, pageHeight * 0.4, "F");

      // Decorative bottom section
      doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2]);
      doc.rect(0, pageHeight * 0.4, pageWidth, pageHeight * 0.6, "F");

      // Company Logo Area (placeholder - can be replaced with actual logo if available)
      const logoY = 50;
      doc.setFillColor(colors.white[0], colors.white[1], colors.white[2]);
      doc.roundedRect(pageWidth / 2 - 30, logoY, 60, 40, 5, 5, "F");
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.text("T", pageWidth / 2, logoY + 25, { align: "center" });

      // Main Title
      doc.setTextColor(colors.white[0], colors.white[1], colors.white[2]);
      doc.setFontSize(28);
      doc.setFont("helvetica", "bold");
      doc.text("Quality Sorting System", pageWidth / 2, logoY + 70, { align: "center" });

      // Subtitle
      doc.setFontSize(14);
      doc.setFont("helvetica", "normal");
      doc.text("SIC Location - Triplus Reporting", pageWidth / 2, logoY + 85, { align: "center" });

      // Description Box
      const descY = pageHeight * 0.45;
      doc.setFillColor(colors.white[0], colors.white[1], colors.white[2]);
      doc.roundedRect(20, descY, pageWidth - 40, 35, 5, 5, "F");

      doc.setTextColor(colors.black[0], colors.black[1], colors.black[2]);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const description = "Mobile data capture for SIC location Triplus reporting. Streamline your hourly quality sorting activities with automated part lookup and real-time reporting.";
      doc.text(description, pageWidth / 2, descY + 12, { align: "center", maxWidth: pageWidth - 60 });

      // Key Features Section
      const featuresY = descY + 50;
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.text("Key Features", pageWidth / 2, featuresY, { align: "center" });

      // Feature boxes
      const featureBoxY = featuresY + 15;
      const featureWidth = (pageWidth - 60) / 3;

      // Feature 1: Automated Lookup
      doc.setFillColor(colors.accent[0], colors.accent[1], colors.accent[2]);
      doc.roundedRect(20, featureBoxY, featureWidth, 40, 3, 3, "F");
      doc.setTextColor(colors.white[0], colors.white[1], colors.white[2]);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Automated Lookup", 20 + featureWidth / 2, featureBoxY + 8, { align: "center" });
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("Part names automatically", 20 + featureWidth / 2, featureBoxY + 18, { align: "center" });
      doc.text("retrieved from database", 20 + featureWidth / 2, featureBoxY + 26, { align: "center" });

      // Feature 2: Real-time Updates
      doc.setFillColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
      doc.roundedRect(20 + featureWidth + 10, featureBoxY, featureWidth, 40, 3, 3, "F");
      doc.text("Real-time Updates", 20 + featureWidth + 10 + featureWidth / 2, featureBoxY + 8, { align: "center" });
      doc.setFontSize(8);
      doc.text("Instant synchronization", 20 + featureWidth + 10 + featureWidth / 2, featureBoxY + 18, { align: "center" });
      doc.text("with live dashboard", 20 + featureWidth + 10 + featureWidth / 2, featureBoxY + 26, { align: "center" });

      // Feature 3: NG Rate Tracking
      doc.setFillColor(colors.warning[0], colors.warning[1], colors.warning[2]);
      doc.roundedRect(20 + (featureWidth + 10) * 2, featureBoxY, featureWidth, 40, 3, 3, "F");
      doc.text("NG Rate Tracking", 20 + (featureWidth + 10) * 2 + featureWidth / 2, featureBoxY + 8, { align: "center" });
      doc.setFontSize(8);
      doc.text("Monitor quality trends", 20 + (featureWidth + 10) * 2 + featureWidth / 2, featureBoxY + 18, { align: "center" });
      doc.text("and prevent issues", 20 + (featureWidth + 10) * 2 + featureWidth / 2, featureBoxY + 26, { align: "center" });

      // System Information Box
      const infoY = featureBoxY + 55;
      doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2]);
      doc.roundedRect(20, infoY, pageWidth - 40, 30, 3, 3, "F");

      doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("System Information", 30, infoY + 8);

      doc.setTextColor(colors.darkGray[0], colors.darkGray[1], colors.darkGray[2]);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("This system integrates barcode scanning with automated database lookup to reduce", 30, infoY + 18, { maxWidth: pageWidth - 60 });
      doc.text("manual input and enable timely hourly reports. All entries are timestamped and stored in real-time.", 30, infoY + 25, { maxWidth: pageWidth - 60 });

      // Report Date
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(colors.darkGray[0], colors.darkGray[1], colors.darkGray[2]);
      doc.text(
        `Report Generated: ${new Date().toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" })}`,
        pageWidth / 2,
        pageHeight - 20,
        { align: "center" }
      );
    };

    // Add cover page first
    addCoverPage();

    // Add main report content on new page
    doc.addPage();
    let yPosition = addHeader(0);

    // Summary Statistics Section with colored boxes
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.text("Summary Statistics", 14, yPosition);
    yPosition += 12;

    // Calculate box dimensions
    const boxWidth = (pageWidth - 28 - 12) / 4; // 4 boxes with spacing
    const boxHeight = 25;
    const boxSpacing = 4;

    // Stat boxes
    addStatBox(14, yPosition, boxWidth, boxHeight, "Total Sorted", stats.totalSorted.toLocaleString(), colors.secondary);
    addStatBox(14 + boxWidth + boxSpacing, yPosition, boxWidth, boxHeight, "Total NG", stats.totalNg.toLocaleString(), colors.danger);

    const ngRateColor = stats.ngRate > 5 ? colors.danger : stats.ngRate > 2 ? colors.warning : colors.accent;
    addStatBox(14 + (boxWidth + boxSpacing) * 2, yPosition, boxWidth, boxHeight, "NG Rate", `${stats.ngRate.toFixed(2)}%`, ngRateColor);
    addStatBox(14 + (boxWidth + boxSpacing) * 3, yPosition, boxWidth, boxHeight, "Parts Processed", stats.partsProcessed.toString(), colors.accent);

    yPosition += boxHeight + 20;

    // Hourly Operator Output Table
    if (hourlyOperatorData.length > 0) {
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = addHeader(0);
      }

      // Section header with background
      doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2]);
      doc.rect(14, yPosition - 5, pageWidth - 28, 8, "F");

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.text("Hourly Output Per Operator", 18, yPosition);
      yPosition += 12;

      const operatorTableData = hourlyOperatorData.slice(0, 30).map((row, index) => [
        row.operator_name,
        new Date(row.hour).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        row.total_logs.toString(),
        row.total_sorted.toString(),
        row.total_ng.toString(),
        `${row.ng_rate_percent.toFixed(1)}%`,
      ]);

      (doc as any).autoTable({
        startY: yPosition,
        head: [["Operator", "Hour", "Logs", "Total Sorted", "NG", "NG Rate"]],
        body: operatorTableData,
        theme: "striped",
        headStyles: {
          fillColor: [colors.primary[0], colors.primary[1], colors.primary[2]],
          fontStyle: "bold",
          textColor: [255, 255, 255],
          fontSize: 10,
        },
        bodyStyles: {
          fontSize: 9,
          textColor: [0, 0, 0],
        },
        alternateRowStyles: {
          fillColor: [colors.lightGray[0], colors.lightGray[1], colors.lightGray[2]],
        },
        styles: {
          cellPadding: 3,
          lineWidth: 0.1,
          lineColor: [200, 200, 200],
        },
        margin: { left: 14, right: 14 },
        columnStyles: {
          0: { fontStyle: "bold" },
          2: { halign: "right", cellWidth: 30 },
          3: { halign: "right", cellWidth: 40 },
          4: { halign: "right", cellWidth: 30, textColor: [colors.danger[0], colors.danger[1], colors.danger[2]] },
          5: { halign: "right", cellWidth: 35 },
        },
        didParseCell: (data: any) => {
          // Color code NG Rate column
          if (data.column.index === 5 && data.row.index >= 0) {
            const ngRate = parseFloat(data.cell.text[0].replace('%', ''));
            if (ngRate > 5) {
              data.cell.styles.textColor = [colors.danger[0], colors.danger[1], colors.danger[2]];
              data.cell.styles.fontStyle = "bold";
            } else if (ngRate > 2) {
              data.cell.styles.textColor = [colors.warning[0], colors.warning[1], colors.warning[2]];
              data.cell.styles.fontStyle = "bold";
            }
          }
        },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;
    }

    // Recent Logs Table
    if (logs.length > 0) {
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = addHeader(0);
      }

      // Section header with background
      doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2]);
      doc.rect(14, yPosition - 5, pageWidth - 28, 8, "F");

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.text("Recent Logs", 18, yPosition);
      yPosition += 12;

      const recentLogsData = logs.slice(0, 30).map((log) => {
        const ngRate = (log.quantity_ng / log.quantity_all_sorting) * 100;
        return [
          new Date(log.logged_at).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
          log.operator_name || "N/A",
          log.part_no,
          log.part_name.substring(0, 25), // Truncate long names
          log.quantity_all_sorting.toString(),
          log.quantity_ng.toString(),
          `${ngRate.toFixed(1)}%`,
          log.reject_image_url || "",
        ];
      });

      (doc as any).autoTable({
        startY: yPosition,
        head: [["Time", "Operator Name", "Part Number", "Part Name", "Quantity All Sorting", "Quantity NG", "NG Rate", "Reject Image"]],
        body: recentLogsData,
        theme: "striped",
        headStyles: {
          fillColor: [colors.primary[0], colors.primary[1], colors.primary[2]],
          fontStyle: "bold",
          textColor: [255, 255, 255],
          fontSize: 9,
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [0, 0, 0],
        },
        alternateRowStyles: {
          fillColor: [colors.lightGray[0], colors.lightGray[1], colors.lightGray[2]],
        },
        styles: {
          cellPadding: 2.5,
          lineWidth: 0.1,
          lineColor: [200, 200, 200],
        },
        margin: { left: 14, right: 14 },
        columnStyles: {
          1: { fontStyle: "bold", cellWidth: 25 },
          2: { fontFamily: "courier", cellWidth: 35 },
          4: { halign: "right", cellWidth: 25 },
          5: { halign: "right", cellWidth: 20, textColor: [colors.danger[0], colors.danger[1], colors.danger[2]] },
          6: { halign: "right", cellWidth: 20 },
          7: { halign: "center", cellWidth: 25 },
        },
        didParseCell: (data: any) => {
          // Add link to Image column
          if (data.column.index === 7 && data.cell.raw) {
            data.cell.link = data.cell.raw;
            data.cell.text = ["View Image"];
            data.cell.styles.textColor = [colors.secondary[0], colors.secondary[1], colors.secondary[2]];
          }

          // Color code NG Rate column
          if (data.column.index === 6 && data.row.index >= 0) {
            const ngRate = parseFloat(data.cell.text[0].replace('%', ''));
            if (ngRate > 5) {
              data.cell.styles.textColor = [colors.danger[0], colors.danger[1], colors.danger[2]];
              data.cell.styles.fontStyle = "bold";
            } else if (ngRate > 2) {
              data.cell.styles.textColor = [colors.warning[0], colors.warning[1], colors.warning[2]];
              data.cell.styles.fontStyle = "bold";
            }
          }
        },
      });
    }

    // Professional Footer on report pages (skip cover page)
    const pageCount = (doc as any).getNumberOfPages();
    for (let i = 2; i <= pageCount; i++) {
      doc.setPage(i);

      // Footer line
      doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.setLineWidth(0.5);
      doc.line(14, pageHeight - 20, pageWidth - 14, pageHeight - 20);

      // Footer text (adjust page number for cover page)
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(colors.darkGray[0], colors.darkGray[1], colors.darkGray[2]);
      doc.text(
        `SIC Triplus Quality Sorting System | Page ${i - 1} of ${pageCount - 1}`,
        pageWidth / 2,
        pageHeight - 12,
        { align: "center" }
      );

      // Confidential notice
      doc.setFontSize(7);
      doc.setFont("helvetica", "italic");
      doc.text(
        "Confidential - For Internal Use Only",
        pageWidth / 2,
        pageHeight - 7,
        { align: "center" }
      );
    }

    // Save the PDF
    const fileName = `Quality_Sorting_Report_${new Date().toISOString().split("T")[0]}.pdf`;
    doc.save(fileName);
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white pb-24 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-900/20 to-transparent pointer-events-none" />

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-slate-400 text-sm">Real-time production stats</p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={exportToPDF}
              variant="ghost"
              size="icon"
              className="bg-[#1e293b]/50 border border-white/10 text-white hover:bg-white/10 rounded-full w-10 h-10"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="bg-[#1e293b]/50 border border-white/10 text-white hover:bg-white/10 rounded-full w-10 h-10"
            >
              <Bell className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Start Chart Section */}
        <div className="mb-6">
          <div className="h-72 w-full bg-[#1e293b]/50 backdrop-blur-md rounded-3xl border border-white/5 p-6 shadow-xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-t from-blue-500/10 to-transparent pointer-events-none" />
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div>
                <p className="text-slate-400 text-sm font-medium">Hourly Production</p>
                <h2 className="text-3xl font-bold text-white mt-1">{stats.totalSorted.toLocaleString()} <span className="text-sm font-normal text-slate-500">units</span></h2>
              </div>
              <div className="bg-blue-500/20 p-2 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-400" />
              </div>
            </div>

            <div className="h-40 w-full mt-4 -ml-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyData}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff' }}
                    cursor={{ stroke: '#ffffff20' }}
                  />
                  <Area type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        {/* End Chart Section */}

        {/* Middle Stats Section (Cards) */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-[#1e293b]/50 backdrop-blur-md rounded-3xl border border-white/5 p-5 shadow-lg flex flex-col justify-between h-36 relative overflow-hidden group hover:bg-[#1e293b]/70 transition-colors">
            <div className="absolute right-[-10px] top-[-10px] p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <Package className="w-20 h-20 text-white" />
            </div>
            <p className="text-slate-400 text-sm font-medium relative z-10">NG Rate</p>
            <div className="relative z-10">
              <h3 className="text-2xl font-bold text-white">{stats.ngRate.toFixed(2)}%</h3>
              <p className={`text-xs mt-1 ${stats.ngRate < 3 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {stats.ngRate < 3 ? 'Within Limits' : 'Action Required'}
              </p>
            </div>
          </div>

          <div className="bg-[#1e293b]/50 backdrop-blur-md rounded-3xl border border-white/5 p-5 shadow-lg flex flex-col justify-between h-36 relative overflow-hidden group hover:bg-[#1e293b]/70 transition-colors">
            <div className="absolute right-[-10px] top-[-10px] p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <Clock className="w-20 h-20 text-white" />
            </div>
            <p className="text-slate-400 text-sm font-medium relative z-10">Parts Processed</p>
            <div className="relative z-10">
              <h3 className="text-2xl font-bold text-white">{stats.partsProcessed}</h3>
              <p className="text-xs text-blue-400 mt-1">Unique IDs Scanned</p>
            </div>
          </div>
        </div>

        {/* Horizontal Scroll List (Simulating 'Bills Due' / Status) */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-white">Shift Status</h3>
            <MoreHorizontal className="text-slate-400 w-5 h-5" />
          </div>

          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
            {[
              { label: "Shift A", sub: "Active", icon: "A", color: "bg-rose-500" },
              { label: "Housing", sub: "High Priority", icon: "H", color: "bg-amber-500" },
              { label: "Bracket", sub: "Normal", icon: "B", color: "bg-blue-500" },
            ].map((item, i) => (
              <div key={i} className="min-w-[150px] bg-[#1e293b]/50 backdrop-blur-md rounded-3xl border border-white/5 p-4 flex items-center gap-3 shadow-lg hover:scale-105 transition-transform">
                <div className={`w-10 h-10 rounded-full ${item.color} flex items-center justify-center text-white font-bold shadow-lg`}>
                  {item.icon}
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{item.label}</p>
                  <p className="text-slate-400 text-xs">{item.sub}</p>
                </div>
              </div>
            ))}
            <div className="min-w-[150px] bg-white/5 border border-white/10 border-dashed rounded-3xl p-4 flex items-center justify-center gap-2 cursor-pointer hover:bg-white/10 transition-colors">
              <Plus className="w-5 h-5 text-slate-400" />
              <span className="text-slate-400 text-sm">Add Filter</span>
            </div>
          </div>
        </div>

        {/* Floating Main Action Button */}
        <div className="fixed bottom-24 left-4 right-4 z-40">
          <Button
            onClick={() => navigate('/scan')}
            className="w-full py-7 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-lg font-bold rounded-2xl shadow-xl shadow-blue-500/20 transition-all active:scale-[0.98]"
          >
            <div className="flex items-center gap-2">
              <div className="bg-white/20 p-1 rounded-full">
                <Plus className="w-4 h-4" />
              </div>
              New Inspection Log
            </div>
          </Button>
        </div>

      </div>
      <BottomNav />
    </div>
  );
};

export default Dashboard;
