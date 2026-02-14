"use client";

import { useState, useEffect } from "react";
import { X, Package, Hash, History, Calendar, AlertCircle, Download } from 'lucide-react';
import Link from "next/link";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface InventoryDetailModalProps {
    item: {
        itemNumber: string;
        itemDesc: string;
        siteId: string;
    } | null;
    isOpen: boolean;
    onClose: () => void;
}

export default function InventoryDetailModal({ item, isOpen, onClose }: InventoryDetailModalProps) {
    const [details, setDetails] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && item) {
            fetchDetails();
        } else {
            setDetails(null);
        }
    }, [isOpen, item]);

    const fetchDetails = async () => {
        if (!item) return;
        setLoading(true);
        try {
            const resp = await fetch(`/api/inventory/detail?itemNumber=${encodeURIComponent(item.itemNumber)}&siteId=${encodeURIComponent(item.siteId)}`);
            const data = await resp.json();
            setDetails(data);
        } catch (error) {
            console.error("Failed to fetch details", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = () => {
        if (details?.tracking === 2) {
            // Serialized CSV
            const headers = ["Serial Number", "Receipt No", "Date Received", "Days Old", "Bin", "Allocated Order", "Customer"];
            const rows = details.items.map((it: any) => [
                it.SERLTNUM,
                it.RCPTNMBR,
                it.DATERECD ? format(new Date(it.DATERECD), 'yyyy-MM-dd') : '',
                it.DaysOld,
                it.BIN || '',
                it.SOPNUMBE || '',
                it.CUSTNAME || ''
            ]);

            const csvContent = [
                headers.join(","),
                ...rows.map((row: any[]) => row.map(cell => `"${cell}"`).join(","))
            ].join("\n");

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            saveAs(blob, `Inventory_Serial_${item?.itemNumber}.csv`);
        } else {
            // Non-serialized Sections
            let csvContent = "";

            // Aging Section
            if (details?.items?.length) {
                csvContent += "INVENTORY AGING\n";
                csvContent += "Receipt No,Date Received,QTY Available,Days Old,Site/Bin\n";
                details.items.forEach((it: any) => {
                    csvContent += `"${it.RCPTNMBR}","${it.DATERECD ? format(new Date(it.DATERECD), 'yyyy-MM-dd') : ''}","${it.QTYAVAILABLE}","${it.DaysOld}","${it.BIN || ''}"\n`;
                });
                csvContent += "\n";
            }

            // Allocations Section
            if (details?.allocations?.length) {
                csvContent += "CURRENT ALLOCATIONS\n";
                csvContent += "Order Number,Customer,Allocated Qty,Total Qty,Order Date\n";
                details.allocations.forEach((it: any) => {
                    csvContent += `"${it.SOPNUMBE}","${it.CUSTNAME}","${it.ATYALLOC}","${it.QUANTITY}","${it.DOCDATE ? format(new Date(it.DOCDATE), 'yyyy-MM-dd') : ''}"\n`;
                });
            }

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            saveAs(blob, `Inventory_Detail_${item?.itemNumber}.csv`);
        }
    };

    const saveAs = (blob: Blob, filename: string) => {
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex items-start justify-between bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                            <Package size={24} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                    {item?.siteId}
                                </span>
                                <h2 className="text-xl font-bold text-slate-900">{item?.itemNumber}</h2>
                            </div>
                            <p className="text-slate-500 text-sm mt-0.5">{item?.itemDesc}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {(details?.items?.length > 0 || details?.allocations?.length > 0) && (
                            <button
                                onClick={handleDownload}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all text-sm font-bold active:scale-95"
                                title="Download as CSV"
                            >
                                <Download size={18} />
                                <span>Download list</span>
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>


                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 space-y-4">
                            <div className="w-10 h-10 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
                            <p className="text-slate-500 font-medium animate-pulse">Fetching inventory details...</p>
                        </div>
                    ) : details ? (
                        <div className="space-y-8">
                            {details.tracking === 2 ? (
                                /* Serialized View */
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="bg-slate-50 border-b border-slate-100">
                                                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Serial Number</th>
                                                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Receipt No</th>
                                                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date Received</th>
                                                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Days Old</th>
                                                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bin</th>
                                                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Allocated Order</th>
                                                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Customer</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {details.items?.length > 0 ? (
                                                    details.items.map((it: any, idx: number) => (
                                                        <tr key={`${it.SERLTNUM}-${idx}`} className="hover:bg-slate-50/50 transition-colors">
                                                            <td className="px-6 py-4 font-bold text-slate-700">{it.SERLTNUM}</td>
                                                            <td className="px-6 py-4 text-xs font-medium text-slate-500">{it.RCPTNMBR}</td>
                                                            <td className="px-6 py-4 text-sm text-slate-500">
                                                                {it.DATERECD ? format(new Date(it.DATERECD), 'MMM dd, yyyy') : '-'}
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                <span className={cn(
                                                                    "px-2 py-1 rounded-lg text-[10px] font-bold inline-block min-w-[60px]",
                                                                    it.DaysOld > 365 ? "bg-red-50 text-red-600" :
                                                                        it.DaysOld > 180 ? "bg-amber-50 text-amber-600" :
                                                                            "bg-emerald-50 text-emerald-600"
                                                                )}>
                                                                    {it.DaysOld} days
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-sm text-slate-600">{it.BIN || '-'}</td>
                                                            <td className="px-6 py-4 text-sm font-bold text-primary">
                                                                {it.SOPNUMBE ? (
                                                                    <Link
                                                                        href={`/?so=${encodeURIComponent(it.SOPNUMBE.trim())}`}
                                                                        className="hover:underline decoration-2 underline-offset-4"
                                                                    >
                                                                        {it.SOPNUMBE}
                                                                    </Link>
                                                                ) : '-'}
                                                            </td>
                                                            <td className="px-6 py-4 text-sm text-slate-600">{it.CUSTNAME || '-'}</td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">No detailed inventory records found.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                /* Non-Serialized View */
                                <>
                                    {/* Aging Section */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-slate-900 font-bold px-1">
                                            <History size={18} className="text-primary" />
                                            <h3>Inventory Aging (Receipt Layers)</h3>
                                        </div>
                                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left">
                                                    <thead>
                                                        <tr className="bg-slate-50 border-b border-slate-100">
                                                            <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Receipt No</th>
                                                            <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date Received</th>
                                                            <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">QTY Available</th>
                                                            <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Days Old</th>
                                                            <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bin</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-50">
                                                        {details.items?.length > 0 ? (
                                                            details.items.map((it: any, idx: number) => (
                                                                <tr key={`${it.RCPTNMBR}-${idx}`} className="hover:bg-slate-50/50 transition-colors">
                                                                    <td className="px-6 py-4 font-bold text-slate-700">{it.RCPTNMBR}</td>
                                                                    <td className="px-6 py-4 text-sm text-slate-500">
                                                                        {it.DATERECD ? format(new Date(it.DATERECD), 'MMM dd, yyyy') : '-'}
                                                                    </td>
                                                                    <td className="px-6 py-4 text-sm font-bold text-emerald-600">{it.QTYAVAILABLE}</td>
                                                                    <td className="px-6 py-4 text-center">
                                                                        <span className={cn(
                                                                            "px-2 py-1 rounded-lg text-[10px] font-bold inline-block min-w-[60px]",
                                                                            it.DaysOld > 365 ? "bg-red-50 text-red-600" :
                                                                                it.DaysOld > 180 ? "bg-amber-50 text-amber-600" :
                                                                                    "bg-emerald-50 text-emerald-600"
                                                                        )}>
                                                                            {it.DaysOld} days
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-6 py-4 text-sm text-slate-600">{it.BIN || '-'}</td>
                                                                </tr>
                                                            ))
                                                        ) : (
                                                            <tr>
                                                                <td colSpan={5} className="px-6 py-8 text-center text-slate-400 italic">No inventory layers found.</td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Allocations Section */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-slate-900 font-bold px-1">
                                            <Hash size={18} className="text-primary" />
                                            <h3>Current Allocations (Reserved Stock)</h3>
                                        </div>
                                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left">
                                                    <thead>
                                                        <tr className="bg-slate-50 border-b border-slate-100">
                                                            <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Order Number</th>
                                                            <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Customer</th>
                                                            <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Allocated Qty</th>
                                                            <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Qty</th>
                                                            <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Order Date</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-50">
                                                        {details.allocations?.length > 0 ? (
                                                            details.allocations.map((it: any, idx: number) => (
                                                                <tr key={`${it.SOPNUMBE}-${idx}`} className="hover:bg-slate-50/50 transition-colors">
                                                                    <td className="px-6 py-4 font-bold text-primary">
                                                                        <Link
                                                                            href={`/?so=${encodeURIComponent(it.SOPNUMBE.trim())}`}
                                                                            className="hover:underline decoration-2 underline-offset-4"
                                                                        >
                                                                            {it.SOPNUMBE}
                                                                        </Link>
                                                                    </td>
                                                                    <td className="px-6 py-4 text-sm text-slate-700">{it.CUSTNAME}</td>
                                                                    <td className="px-6 py-4 text-sm font-bold text-blue-600">{it.ATYALLOC}</td>
                                                                    <td className="px-6 py-4 text-sm text-slate-500">{it.QUANTITY}</td>
                                                                    <td className="px-6 py-4 text-sm text-slate-500">
                                                                        {it.DOCDATE ? format(new Date(it.DOCDATE), 'MMM dd, yyyy') : '-'}
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        ) : (
                                                            <tr>
                                                                <td colSpan={5} className="px-6 py-8 text-center text-slate-400 italic">No current allocations found.</td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <AlertCircle size={48} className="mb-4 opacity-20" />
                            <p>Failed to load inventory details.</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-8 py-4 border-t border-slate-100 bg-white flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-xl font-bold bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-sm active:scale-95"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
