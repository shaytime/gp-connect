"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
    ClipboardList,
    TrendingUp,
    CheckCircle2,
    AlertCircle,
    FileText,
    Calendar,
    ExternalLink,
    RefreshCw,
    Search
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function SfDashboardPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    const [selectedYear, setSelectedYear] = useState("");
    const [selectedMonth, setSelectedMonth] = useState("");
    const [selectedModality, setSelectedModality] = useState("");

    const [pageSize, setPageSize] = useState(20);
    const [currentPage, setCurrentPage] = useState(1);

    const fetchData = async () => {
        setLoading(true);
        try {
            const resp = await fetch("/api/dashboard/sf-fulfillment");
            const result = await resp.json();
            setData(result);
        } catch (error) {
            console.error("Dashboard error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedYear, selectedMonth, selectedModality, pageSize]);

    const years = Array.from(new Set(data?.orders?.map((o: any) => o.execYear).filter(Boolean))).sort((a: any, b: any) => b - a);
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const modalities = Array.from(new Set(data?.orders?.map((o: any) => o.modality).filter(Boolean))).sort() as string[];

    const allFilteredOrders = data?.orders?.filter((o: any) => {
        const matchesSearch = !searchTerm ||
            o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.accountName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.gpOrderNumber?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesYear = !selectedYear || String(o.execYear) === selectedYear;
        const matchesMonth = !selectedMonth || String(o.execMonth) === selectedMonth;
        const matchesModality = !selectedModality || o.modality === selectedModality;

        return matchesSearch && matchesYear && matchesMonth && matchesModality;
    }) || [];

    // Totals for ALL filtered rows
    const grandNetTotal = allFilteredOrders.reduce((sum: number, o: any) => sum + Number(o.netAmount || 0), 0);
    const grandGrossTotal = allFilteredOrders.reduce((sum: number, o: any) => sum + Number(o.grossAmount || 0), 0);

    // Pagination
    const totalPages = Math.ceil(allFilteredOrders.length / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedOrders = allFilteredOrders.slice(startIndex, startIndex + pageSize);

    // Totals for CURRENT PAGE rows
    const pageNetTotal = paginatedOrders.reduce((sum: number, o: any) => sum + Number(o.netAmount || 0), 0);
    const pageGrossTotal = paginatedOrders.reduce((sum: number, o: any) => sum + Number(o.grossAmount || 0), 0);

    return (
        <DashboardLayout breadcrumbs={[{ label: "Sales" }, { label: "Salesforce Dashboard" }]}>
            <div className="space-y-6 overflow-visible">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Salesforce Order Tracker</h1>
                        <p className="text-slate-500 mt-1">Cross-check Salesforce orders and their fulfillment status in Dynamics GP.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search orders..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 transition-all w-64"
                            />
                        </div>
                        <button
                            onClick={fetchData}
                            className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all active:scale-95"
                            title="Refresh Data"
                        >
                            <RefreshCw size={20} className={cn("text-slate-600", loading && "animate-spin")} />
                        </button>
                    </div>
                </div>

                {/* Filters Row */}
                <div className="relative z-[100] flex flex-wrap gap-4 items-center bg-slate-50/50 p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Year:</span>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            className="text-xs font-bold bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer"
                        >
                            <option value="">All Years</option>
                            {years.map((y: any) => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Month:</span>
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="text-xs font-bold bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer"
                        >
                            <option value="">All Months</option>
                            {months.map(m => <option key={m} value={m}>{String(m).padStart(2, '0')}</option>)}
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Modality:</span>
                        <select
                            value={selectedModality}
                            onChange={(e) => setSelectedModality(e.target.value)}
                            className="text-xs font-bold bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer"
                        >
                            <option value="">All Modalities</option>
                            {modalities.map((m: string) => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>

                    <div className="flex items-center gap-2 ml-auto">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Per Page:</span>
                        <select
                            value={pageSize}
                            onChange={(e) => setPageSize(Number(e.target.value))}
                            className="text-xs font-bold bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer"
                        >
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                    </div>

                    {(selectedYear || selectedMonth || selectedModality) && (
                        <button
                            onClick={() => { setSelectedYear(""); setSelectedMonth(""); setSelectedModality(""); }}
                            className="text-[10px] font-bold text-primary hover:underline"
                        >
                            Clear Filters
                        </button>
                    )}
                </div>

                {/* Summary Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <SummaryCard
                        title="Total SF Orders"
                        value={data?.summary?.totalSfOrders || 0}
                        icon={<ClipboardList className="text-blue-600" size={24} />}
                        desc="Orders in Salesforce"
                    />
                    <SummaryCard
                        title="GP Orders Created"
                        value={data?.summary?.linkedToGp || 0}
                        icon={<FileText className="text-purple-600" size={24} />}
                        desc="Successfully synced to GP"
                    />
                    <SummaryCard
                        title="GP Conversion Rate"
                        value={`${(data?.summary?.gpConversionRate || 0).toFixed(1)}%`}
                        icon={<TrendingUp className="text-emerald-600" size={24} />}
                        desc="SF orders with GP match"
                    />
                    <SummaryCard
                        title="Fulfillment Rate"
                        value={`${(data?.summary?.fulfillmentRate || 0).toFixed(1)}%`}
                        icon={<CheckCircle2 className="text-orange-600" size={24} />}
                        desc="Linked orders shipped/invoiced"
                    />
                </div>

                {/* Orders Table */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-visible relative z-10">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                        <h2 className="text-lg font-bold text-slate-900">Salesforce & GP Orders</h2>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{allFilteredOrders.length} records</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/50">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">SF Order #</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Account Name</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Modality</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Exec Period</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Net Amount</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Gross Amount</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">GP Order #</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">GP Status</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 border-b border-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={9} className="px-6 py-12 text-center text-slate-400">Loading data...</td>
                                    </tr>
                                ) : paginatedOrders.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="px-6 py-12 text-center text-slate-400">No orders found.</td>
                                    </tr>
                                ) : paginatedOrders.map((order: any) => (
                                    <tr key={order.sfId} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4 font-bold text-slate-900">{order.orderNumber}</td>
                                        <td className="px-6 py-4 text-sm text-slate-600 font-medium">{order.accountName}</td>
                                        <td className="px-6 py-4">
                                            {order.modality ? (
                                                <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-full uppercase italic">
                                                    {order.modality}
                                                </span>
                                            ) : (
                                                <span className="text-slate-200">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                                                <Calendar size={12} />
                                                <span>{order.execYear}-{String(order.execMonth).padStart(2, '0')}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs font-bold text-slate-900 text-right">
                                            ${Number(order.netAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs font-bold text-slate-900 text-right">
                                            ${Number(order.grossAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4">
                                            {order.gpOrderNumber ? (
                                                <a
                                                    href={`/?so=${order.gpOrderNumber}`}
                                                    target="_blank"
                                                    className="font-mono text-xs font-bold bg-blue-50 px-2 py-1 rounded text-blue-600 hover:bg-blue-600 hover:text-white transition-all inline-flex items-center gap-1"
                                                >
                                                    {order.gpOrderNumber}
                                                    <ExternalLink size={10} />
                                                </a>
                                            ) : (
                                                <span className="text-slate-300 italic text-xs">Not linked</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <StatusBadge status={order.gpStatus} />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <a
                                                    href={`https://login.salesforce.com/${order.sfId}`}
                                                    target="_blank"
                                                    className="p-2 text-slate-400 hover:text-primary transition-colors"
                                                    title="View in Salesforce"
                                                >
                                                    <ExternalLink size={16} />
                                                </a>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-slate-50/30">
                                <tr className="border-b border-slate-100">
                                    <td colSpan={4} className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase text-right tracking-widest">Page Totals ({paginatedOrders.length})</td>
                                    <td className="px-6 py-3 font-mono text-xs font-black text-slate-900 text-right">
                                        ${pageNetTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-3 font-mono text-xs font-black text-slate-900 text-right">
                                        ${pageGrossTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                    <td colSpan={3}></td>
                                </tr>
                                <tr>
                                    <td colSpan={4} className="px-6 py-3 text-[10px] font-black text-primary uppercase text-right tracking-widest">Grand Totals ({allFilteredOrders.length})</td>
                                    <td className="px-6 py-3 font-mono text-xs font-black text-primary text-right">
                                        ${grandNetTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-3 font-mono text-xs font-black text-primary text-right">
                                        ${grandGrossTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                    <td colSpan={3}></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="p-6 bg-white border-t border-slate-100 flex items-center justify-between">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 disabled:opacity-50 hover:bg-slate-100 transition-all"
                            >
                                Previous
                            </button>
                            <div className="flex items-center gap-2">
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pageNum = i + 1;
                                    if (totalPages > 5 && currentPage > 3) {
                                        pageNum = currentPage - 3 + i + 1;
                                        if (pageNum > totalPages) pageNum = totalPages - 4 + i;
                                    }
                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setCurrentPage(pageNum)}
                                            className={cn(
                                                "w-8 h-8 rounded-lg text-xs font-bold transition-all",
                                                currentPage === pageNum
                                                    ? "bg-primary text-white shadow-lg shadow-primary/20"
                                                    : "text-slate-500 hover:bg-slate-50"
                                            )}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                                {totalPages > 5 && currentPage < totalPages - 2 && <span className="text-slate-300">...</span>}
                            </div>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 disabled:opacity-50 hover:bg-slate-100 transition-all"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}

function SummaryCard({ title, value, icon, desc }: { title: string, value: string | number, icon: React.ReactNode, desc: string }) {
    return (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 hover:shadow-md transition-all">
            <div className="flex items-start justify-between">
                <div className="p-3 bg-slate-50 rounded-2xl">{icon}</div>
            </div>
            <div>
                <h3 className="text-slate-500 text-sm font-bold">{title}</h3>
                <div className="text-2xl font-black text-slate-900 mt-1">{value}</div>
                <p className="text-[10px] font-bold text-slate-400 mt-1">{desc}</p>
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const variants: Record<string, string> = {
        'Shipped': 'bg-emerald-50 text-emerald-600 border-emerald-100',
        'Invoiced': 'bg-blue-50 text-blue-600 border-blue-100',
        'Picked': 'bg-orange-50 text-orange-600 border-orange-100',
        'New': 'bg-slate-50 text-slate-600 border-slate-100',
        'Not Linked': 'bg-slate-100 text-slate-400 border-transparent',
    };

    const variant = variants[status] || 'bg-slate-50 text-slate-600 border-slate-100';

    return (
        <span className={cn(
            "inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border",
            variant
        )}>
            {status}
        </span>
    );
}
