"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import InventoryTable from "@/components/InventoryTable";
import Pagination from "@/components/Pagination";
import SearchInput from "@/components/SearchInput";
import { Filter, ChevronDown, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

function InventoryContent() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState<{ classIds: string[], siteIds: string[] }>({ classIds: [], siteIds: [] });
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    const q = searchParams.get("q") || "";
    const siteId = searchParams.get("siteId") || "ALL";
    const selectedClassIds = searchParams.get("classIds")?.split(",").filter(Boolean) || [];
    const page = parseInt(searchParams.get("page") || "1");
    const sort = searchParams.get("sort") || "ITEMNMBR";
    const order = (searchParams.get("order") || "ASC").toUpperCase() as 'ASC' | 'DESC';
    const hideZero = searchParams.get("hideZero") !== "false";

    useEffect(() => {
        fetchFilters();
    }, []);

    useEffect(() => {
        fetchInventory();
    }, [q, siteId, searchParams.get("classIds"), page, sort, order, hideZero]);

    const fetchFilters = async () => {
        try {
            const resp = await fetch("/api/inventory/filters");
            const data = await resp.json();
            setFilters(data);
        } catch (error) {
            console.error("Failed to fetch filters", error);
        }
    };

    const fetchInventory = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams(searchParams.toString());
            const resp = await fetch(`/api/inventory?${params.toString()}`);
            const data = await resp.json();
            setData(data);
        } catch (error) {
            console.error("Failed to fetch inventory", error);
        } finally {
            setLoading(false);
        }
    };

    const updateParams = (updates: Record<string, string | null>) => {
        const params = new URLSearchParams(searchParams.toString());
        Object.entries(updates).forEach(([key, value]) => {
            if (value === null) params.delete(key);
            else params.set(key, value);
        });
        if (!updates.page) params.set("page", "1"); // Reset to page 1 on filter change
        router.push(`${pathname}?${params.toString()}`);
    };

    const toggleClassId = (id: string) => {
        let newClasses = [...selectedClassIds];
        if (newClasses.includes(id)) {
            newClasses = newClasses.filter(c => c !== id);
        } else {
            newClasses.push(id);
        }
        updateParams({ classIds: newClasses.join(",") || null });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Inventory</h1>
                    <p className="text-slate-500 mt-1">Monitor and manage your stock levels across all sites.</p>
                </div>
                <div className="flex items-center gap-3">
                    <SearchInput placeholder="Search items..." />
                    <div className="relative">
                        <button
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 bg-white border rounded-xl text-sm font-bold transition-all active:scale-95",
                                isFilterOpen || selectedClassIds.length > 0 || siteId !== "ALL" || hideZero
                                    ? "border-primary text-primary shadow-sm"
                                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                            )}
                        >
                            <Filter size={16} />
                            <span>Filters</span>
                            {(selectedClassIds.length > 0 || siteId !== "ALL" || hideZero) && (
                                <span className="flex items-center justify-center w-5 h-5 bg-primary text-white rounded-full text-[10px]">
                                    {(selectedClassIds.length > 0 ? 1 : 0) + (siteId !== "ALL" ? 1 : 0) + (hideZero ? 1 : 0)}
                                </span>
                            )}
                        </button>

                        {isFilterOpen && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setIsFilterOpen(false)}></div>
                                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl border border-slate-200 shadow-xl z-20 p-4 animate-in fade-in zoom-in-95 duration-100">
                                    <div className="space-y-4">
                                        <div className="pb-3 border-b border-slate-100">
                                            <button
                                                onClick={() => updateParams({ hideZero: (!hideZero).toString() })}
                                                className={cn(
                                                    "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold transition-all",
                                                    hideZero
                                                        ? "bg-primary/5 text-primary border border-primary/20"
                                                        : "bg-slate-50 text-slate-600 border border-transparent hover:border-slate-200"
                                                )}
                                            >
                                                <span>Hide Zero Stock</span>
                                                <div className={cn(
                                                    "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                                                    hideZero ? "bg-primary border-primary text-white" : "bg-white border-slate-300"
                                                )}>
                                                    {hideZero && <Check size={14} />}
                                                </div>
                                            </button>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Site ID</label>
                                            <select
                                                value={siteId}
                                                onChange={(e) => updateParams({ siteId: e.target.value })}
                                                className="w-full bg-slate-50 border-none rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-primary/20"
                                            >
                                                <option value="ALL">All Sites</option>
                                                {filters.siteIds.map(id => (
                                                    <option key={id} value={id}>{id}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Class ID</label>
                                                {selectedClassIds.length > 0 && (
                                                    <button
                                                        onClick={() => updateParams({ classIds: null })}
                                                        className="text-[10px] font-bold text-primary hover:underline"
                                                    >
                                                        Clear
                                                    </button>
                                                )}
                                            </div>
                                            <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                                                {filters.classIds.map(id => (
                                                    <button
                                                        key={id}
                                                        onClick={() => toggleClassId(id)}
                                                        className={cn(
                                                            "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                                                            selectedClassIds.includes(id)
                                                                ? "bg-primary/5 text-primary"
                                                                : "text-slate-600 hover:bg-slate-50"
                                                        )}
                                                    >
                                                        <span>{id}</span>
                                                        {selectedClassIds.includes(id) && <Check size={14} />}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm h-96 flex flex-col items-center justify-center space-y-4">
                    <div className="w-10 h-10 border-4 border-slate-100 border-t-primary rounded-full animate-spin"></div>
                    <p className="text-slate-400 font-medium animate-pulse">Loading inventory data...</p>
                </div>
            ) : (
                <>
                    <InventoryTable
                        items={data?.items || []}
                        currentSort={sort}
                        currentOrder={order}
                    />
                    <Pagination totalPages={data?.pagination.totalPages || 0} />
                </>
            )}
        </div>
    );
}

export default function InventoryPage() {
    return (
        <DashboardLayout breadcrumbs={[{ label: "Sales" }, { label: "Inventory" }]}>
            <Suspense fallback={<div>Loading...</div>}>
                <InventoryContent />
            </Suspense>
        </DashboardLayout>
    );
}
