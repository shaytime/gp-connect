"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import Pagination from "@/components/Pagination";
import SearchInput from "@/components/SearchInput";
import {
    History,
    Search,
    Calendar,
    Hash,
    Package,
    ArrowRight,
    BadgeInfo,
    AlertCircle,
    Check,
    ChevronDown,
    X,
    User2,
    Clock,
    Loader2,
    Tag,
    FileText,
    Filter,
    ShoppingCart,
    Binary
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { searchProducts } from "../../customers/actions";

function InventoryTrackingContent() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState<"item" | "sn">("item");
    const [serialNumberSearch, setSerialNumberSearch] = useState("");
    const [filters, setFilters] = useState<{ classIds: string[], siteIds: string[] }>({ classIds: [], siteIds: [] });
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Item Search State
    const [itemSearch, setItemSearch] = useState("");
    const [gpProducts, setGpProducts] = useState<any[]>([]);
    const [isLoadingProducts, setIsLoadingProducts] = useState(false);
    const [showSearchList, setShowSearchList] = useState(false);
    const [activeSearchIndex, setActiveSearchIndex] = useState(-1);
    const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

    const q = searchParams.get("q") || ""; // Secondary search (SN, Doc#)
    const itemNumber = searchParams.get("itemNumber") || "";
    const siteId = searchParams.get("siteId") || "ALL";
    const selectedClassIds = searchParams.get("classIds")?.split(",").filter(Boolean) || [];
    const page = parseInt(searchParams.get("page") || "1");

    useEffect(() => {
        fetchFilters();
    }, []);

    useEffect(() => {
        if (itemNumber) {
            fetchHistory();
        } else {
            setData(null);
            setLoading(false);
        }
    }, [itemNumber, q, siteId, searchParams.get("classIds"), page, viewMode]);

    // Handle initial item load if param exists
    useEffect(() => {
        if (itemNumber && !selectedProduct) {
            // We could fetch product details here if needed, 
            // but for tracking we mainly need the history./
            // Minimal product stub until selected/searched
            setSelectedProduct({ itemNumber, description: "Loading item details..." });
        }
    }, [itemNumber]);

    const handleProductSearch = async (val: string) => {
        setItemSearch(val);
        if (val.length < 2) {
            setGpProducts([]);
            setShowSearchList(false);
            return;
        }

        setIsLoadingProducts(true);
        try {
            const results = await searchProducts(val, siteId);
            setGpProducts(results);
            setActiveSearchIndex(results.length > 0 ? 0 : -1);
            setShowSearchList(true);
        } catch (error) {
            console.error("Search failed", error);
        } finally {
            setIsLoadingProducts(false);
        }
    };

    const selectProduct = (product: any) => {
        setSelectedProduct(product);
        setShowSearchList(false);
        setActiveSearchIndex(-1);
        setItemSearch("");
        updateParams({ itemNumber: product.itemNumber, page: "1", q: null });
    };

    const fetchFilters = async () => {
        try {
            const resp = await fetch("/api/inventory/filters");
            const data = await resp.json();
            setFilters(data);
        } catch (error) {
            console.error("Failed to fetch filters", error);
        }
    };

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams(searchParams.toString());
            params.set("viewMode", viewMode);
            const resp = await fetch(`/api/inventory/tracking?${params.toString()}`);
            const data = await resp.json();
            setData(data);
        } catch (error) {
            console.error("Failed to fetch inventory tracking history", error);
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
        if (!updates.page) params.set("page", "1");
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

    const getMovementBadgeStyle = (type: string) => {
        switch (type.toLowerCase()) {
            case 'adjustment': return "bg-amber-50 text-amber-700 border-amber-200";
            case 'sales': return "bg-blue-50 text-blue-700 border-blue-200";
            case 'purchase': return "bg-green-50 text-green-700 border-green-200";
            case 'transfer': return "bg-purple-50 text-purple-700 border-purple-200";
            case 'variance': return "bg-slate-50 text-slate-700 border-slate-200";
            case 'return': return "bg-rose-50 text-rose-700 border-rose-200";
            default: return "bg-slate-50 text-slate-600 border-slate-100";
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <History className="text-primary w-5 h-5" />
                        <span className="text-primary font-bold text-xs uppercase tracking-widest">Inventory</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Inventory Tracking</h1>
                    <p className="text-slate-500 font-medium">Detailed history of inventory movements and serial number logs.</p>
                </div>
                <div className="flex flex-1 items-center gap-3 relative max-w-2xl">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Select an item to track history..."
                            value={itemSearch}
                            onChange={(e) => handleProductSearch(e.target.value)}
                            onFocus={() => itemSearch.length >= 2 && setShowSearchList(true)}
                            onKeyDown={(e) => {
                                if (e.key === "ArrowDown") {
                                    e.preventDefault();
                                    setActiveSearchIndex(prev => (prev < gpProducts.length - 1 ? prev + 1 : prev));
                                } else if (e.key === "ArrowUp") {
                                    e.preventDefault();
                                    setActiveSearchIndex(prev => (prev > 0 ? prev - 1 : prev));
                                } else if (e.key === "Enter" && activeSearchIndex >= 0) {
                                    selectProduct(gpProducts[activeSearchIndex]);
                                } else if (e.key === "Escape") {
                                    setShowSearchList(false);
                                }
                            }}
                            className="w-full bg-white border border-slate-200 pl-11 pr-4 py-3 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all shadow-sm"
                        />
                        {isLoadingProducts && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                <Loader2 size={16} className="animate-spin text-primary" />
                            </div>
                        )}

                        {showSearchList && gpProducts.length > 0 && (
                            <>
                                <div className="fixed inset-0 z-30" onClick={() => setShowSearchList(false)}></div>
                                <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl border border-slate-200 shadow-2xl z-40 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="max-h-[400px] overflow-y-auto">
                                        {gpProducts.map((p, i) => (
                                            <button
                                                key={i}
                                                onClick={() => selectProduct(p)}
                                                onMouseEnter={() => setActiveSearchIndex(i)}
                                                className={cn(
                                                    "w-full flex items-center gap-4 px-4 py-3 transition-colors border-b border-slate-50 last:border-0 group/item",
                                                    i === activeSearchIndex ? "bg-primary/5" : "hover:bg-slate-50"
                                                )}
                                            >
                                                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 group-hover/item:scale-110 transition-transform">
                                                    <Package size={20} className="text-slate-400" />
                                                </div>
                                                <div className="text-left flex-1 min-w-0">
                                                    <p className="font-black text-slate-900 truncate leading-tight">{p.itemNumber}</p>
                                                    <p className="text-xs text-slate-500 font-medium truncate mt-0.5">{p.description}</p>
                                                </div>
                                                <div className="text-right">
                                                    <div className="flex flex-col items-end gap-0.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">OH:</span>
                                                            <span className="text-[11px] font-black text-slate-700 tabular-nums">{(p.inventory?.onHand || 0).toLocaleString()}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 bg-primary/5 px-2 py-0.5 rounded-md">
                                                            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">AVL:</span>
                                                            <span className="text-sm font-black text-primary tabular-nums">{(p.inventory?.available || 0).toLocaleString()}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {itemNumber && (
                        <div className="flex items-center gap-2">
                            <SearchInput placeholder="Filter within history (SN, Doc#)..." />
                            <div className="relative">
                                <button
                                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-3 bg-white border rounded-xl text-sm font-bold transition-all active:scale-95 shadow-sm",
                                        isFilterOpen || selectedClassIds.length > 0 || siteId !== "ALL"
                                            ? "border-primary text-primary"
                                            : "border-slate-200 text-slate-600 hover:border-slate-300"
                                    )}
                                >
                                    <Filter size={16} />
                                    <span>Filters</span>
                                </button>

                                {isFilterOpen && (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={() => setIsFilterOpen(false)}></div>
                                        <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl border border-slate-200 shadow-xl z-20 p-4 animate-in fade-in zoom-in-95 duration-100 text-left">
                                            <div className="space-y-4">
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
                                                                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left",
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
                    )}
                </div>
            </div>

            {itemNumber ? (
                <>
                    {/* Item Details Header */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="flex items-center gap-5">
                            <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center border border-primary/10">
                                <Package size={32} className="text-primary" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight">{itemNumber}</h2>
                                <p className="text-slate-500 font-bold flex items-center gap-2">
                                    {selectedProduct?.description || "Loading description..."}
                                    {data?.items?.[0]?.CLASS_ID && (
                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[10px] uppercase tracking-widest">
                                            {data.items[0].CLASS_ID}
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>

                        {data?.items && (
                            <div className="flex items-center gap-8 border-l border-slate-100 pl-8">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Records</p>
                                    <p className="text-2xl font-black text-slate-900 tabular-nums">{data.pagination.total}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Last Movement</p>
                                    <p className="text-sm font-black text-slate-700">
                                        {data.items.length > 0 ? format(new Date(data.items[0].POSTING_DATE), 'MMM dd, yyyy') : 'No history'}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Mode Selector Tabs */}
                    <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit mb-6">
                        <button
                            onClick={() => setViewMode("item")}
                            className={cn(
                                "px-6 py-2 rounded-lg text-xs font-black tracking-widest uppercase transition-all",
                                viewMode === "item"
                                    ? "bg-white text-primary shadow-sm"
                                    : "text-slate-400 hover:text-slate-600"
                            )}
                        >
                            Overview
                        </button>
                        <button
                            onClick={() => setViewMode("sn")}
                            className={cn(
                                "px-6 py-2 rounded-lg text-xs font-black tracking-widest uppercase transition-all",
                                viewMode === "sn"
                                    ? "bg-white text-primary shadow-sm"
                                    : "text-slate-400 hover:text-slate-600"
                            )}
                        >
                            Trace Inquiry
                        </button>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100 text-left">
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                            {viewMode === "item" ? "Type" : "Transaction Source"}
                                        </th>
                                        {viewMode === "item" ? (
                                            <>
                                                <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-wider w-24">Qty</th>
                                                <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-wider w-32">Balance Qty</th>
                                            </>
                                        ) : (
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Serial/Lot Number</th>
                                        )}
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider w-36">Doc. Date</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Site ID</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Document Number</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={6} className="py-24 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <Loader2 size={32} className="animate-spin text-primary" />
                                                    <p className="text-sm text-slate-500 font-bold uppercase tracking-widest animate-pulse">Fetching transactions...</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (!data?.items || data.items.length === 0) ? (
                                        <tr>
                                            <td colSpan={6} className="py-24 text-center">
                                                <div className="flex flex-col items-center gap-3 opacity-40">
                                                    <AlertCircle size={48} className="text-slate-300" />
                                                    <p className="text-lg font-bold text-slate-500">No history found for this item</p>
                                                    <p className="text-sm text-slate-400 text-center max-w-[300px]">Check if you have selected the correct site or adjusted search filters.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        data.items.map((item: any, idx: number) => (
                                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors group border-b border-slate-100 last:border-0 font-medium">
                                                <td className="px-6 py-5">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-black text-slate-900 tracking-tight">
                                                            {viewMode === "sn" ? item.SOURCE_DISPLAY : item.MOVEMENT_TYPE}
                                                        </span>
                                                        {viewMode === "sn" && (
                                                            <div className={cn(
                                                                "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border w-fit mt-1",
                                                                item.MOVEMENT_TYPE === "Sales" ? "bg-amber-50 text-amber-600 border-amber-100" :
                                                                    item.MOVEMENT_TYPE === "Receipt" || item.MOVEMENT_TYPE === "Purchase" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                                                        item.MOVEMENT_TYPE === "Transfer" ? "bg-blue-50 text-blue-600 border-blue-100" :
                                                                            "bg-slate-50 text-slate-500 border-slate-100"
                                                            )}>
                                                                {item.MOVEMENT_TYPE}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                {viewMode === "item" ? (
                                                    <>
                                                        <td className="px-6 py-5 text-right">
                                                            <span className={cn(
                                                                "text-sm font-black tabular-nums tracking-tight",
                                                                (siteId === 'ALL' || !siteId) && item.MOVEMENT_TYPE === 'Transfer'
                                                                    ? "text-slate-500 font-bold"
                                                                    : Number(item.BALANCE_EFFECT || 0) < 0 ? "text-rose-500" : "text-emerald-500"
                                                            )}>
                                                                {(siteId === 'ALL' || !siteId) && item.MOVEMENT_TYPE === 'Transfer'
                                                                    ? Math.abs(Number(item.QTY || 0)).toLocaleString()
                                                                    : (Number(item.BALANCE_EFFECT || 0) > 0 ? "+" : "") + Number(item.BALANCE_EFFECT || 0).toLocaleString()}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-5 text-right">
                                                            <span className="text-sm font-black tabular-nums tracking-tight text-slate-900 bg-slate-50 px-2 py-1 rounded-lg">
                                                                {Number(item.BALANCE_QTY || 0).toLocaleString()}
                                                            </span>
                                                        </td>
                                                    </>
                                                ) : (
                                                    <td className="px-6 py-5">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 rounded bg-primary/5 flex items-center justify-center">
                                                                <Binary size={12} className="text-primary" />
                                                            </div>
                                                            <span className="text-[11px] font-black text-slate-700 font-mono tracking-wider">
                                                                {item.SERIAL_NUMBER}
                                                            </span>
                                                        </div>
                                                    </td>
                                                )}
                                                <td className="px-6 py-5">
                                                    <span className="text-xs font-bold text-slate-600">{format(new Date(item.POSTING_DATE), "MM/dd/yyyy")}</span>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-2">
                                                        {item.MOVEMENT_TYPE.includes('Transfer') ? (
                                                            <>
                                                                <span className="text-xs font-black text-slate-700">{item.FROM_SITE || 'MAIN'}</span>
                                                                <ArrowRight size={10} className="text-slate-300" />
                                                                <span className="text-xs font-black text-slate-700">{item.TO_SITE || 'MAIN'}</span>
                                                            </>
                                                        ) : (
                                                            <span className="text-xs font-black text-slate-700">{item.TO_SITE || item.FROM_SITE || 'MAIN'}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-2 group/doc">
                                                        <FileText size={14} className="text-slate-300 group-hover/doc:text-primary transition-colors" />
                                                        <span className="text-xs font-black text-slate-900 tracking-wider">#{item.DOC_NUMBER}</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                <div className="py-40 text-center bg-white rounded-3xl border border-dashed border-slate-200 animate-in fade-in zoom-in-95 duration-700">
                    <div className="flex flex-col items-center gap-4 max-w-sm mx-auto">
                        <div className="w-20 h-20 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-300">
                            <Search size={40} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">Search for an item</h3>
                        <p className="text-slate-500 font-medium">Please enter an item number or description above to view its detailed inventory movement history.</p>
                    </div>
                </div>
            )}

            {!loading && data?.pagination?.totalPages > 1 && (
                <div className="flex justify-center mt-2">
                    <Pagination totalPages={data.pagination.totalPages} />
                </div>
            )}
        </div>
    );
}

export default function InventoryTrackingPage() {
    return (
        <DashboardLayout breadcrumbs={[{ label: "Inventory", href: "/inventory" }, { label: "Tracking" }]}>
            <Suspense fallback={
                <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-500">
                    <Loader2 size={32} className="animate-spin text-primary transition-all" />
                    <p className="text-sm text-slate-500 font-bold uppercase tracking-widest mt-4">Initializing Tracking Page...</p>
                </div>
            }>
                <InventoryTrackingContent />
            </Suspense>
        </DashboardLayout>
    );
}
