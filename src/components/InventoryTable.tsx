"use client";

import { useState } from "react";
import { Package, ChevronUp, ChevronDown, ArrowUpDown, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from '@/lib/utils';
import InventoryDetailModal from './InventoryDetailModal';

interface InventoryTableProps {
    items: any[];
    currentSort: string;
    currentOrder: 'ASC' | 'DESC';
}

export default function InventoryTable({
    items,
    currentSort,
    currentOrder
}: InventoryTableProps) {
    const [selectedItem, setSelectedItem] = useState<{ itemNumber: string, itemDesc: string, siteId: string } | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const openModal = (itemNumber: string, itemDesc: string, siteId: string) => {
        setSelectedItem({ itemNumber, itemDesc, siteId });
        setIsModalOpen(true);
    };

    const getBaseLink = (paramsUpdates: Record<string, string | null>) => {
        const params = new URLSearchParams(searchParams.toString());
        Object.entries(paramsUpdates).forEach(([key, value]) => {
            if (value === null) params.delete(key);
            else params.set(key, value);
        });
        return `${pathname}?${params.toString()}`;
    };

    const SortIcon = ({ field }: { field: string }) => {
        if (currentSort !== field) return <ArrowUpDown size={14} className="text-slate-300" />;
        return currentOrder === 'ASC' ? <ChevronUp size={14} className="text-primary" /> : <ChevronDown size={14} className="text-primary" />;
    };

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
    };

    return (
        <>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-200">
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    <Link href={getBaseLink({ sort: 'ITEMNMBR', order: currentSort === 'ITEMNMBR' && currentOrder === 'ASC' ? 'desc' : 'asc' })} className="flex items-center gap-2 hover:text-primary transition-colors group">
                                        <span>Item Number</span>
                                        <SortIcon field="ITEMNMBR" />
                                    </Link>
                                </th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    <span>Description</span>
                                </th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    <span>Site ID</span>
                                </th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                                    <span>OH Qty</span>
                                </th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                                    <span>Allocated</span>
                                </th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                                    <span>Available</span>
                                </th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {items.map((item: any) => (
                                <tr
                                    key={`${item.ITEMNMBR.trim()}-${item.LOCNCODE.trim()}`}
                                    className="hover:bg-slate-50 cursor-pointer transition-colors group"
                                    onClick={() => openModal(item.ITEMNMBR.trim(), item.ITEMDESC.trim(), item.LOCNCODE.trim())}
                                >
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 group-hover:bg-primary group-hover:text-white transition-colors">
                                            {item.ITEMNMBR.trim()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-medium text-slate-900">
                                        {item.ITEMDESC.trim()}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        {item.LOCNCODE.trim()}
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm font-semibold text-slate-900">
                                        {formatNumber(item.QTYONHND)}
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm text-slate-500">
                                        {formatNumber(item.ATYALLOC)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={cn(
                                            "text-sm font-bold",
                                            item.QTYAVAIL > 0 ? "text-emerald-600" : "text-slate-400"
                                        )}>
                                            {formatNumber(item.QTYAVAIL)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/10 rounded-lg transition-all"
                                        >
                                            <ExternalLink size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {items.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 bg-slate-50/30">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
                            <Package size={32} />
                        </div>
                        <p className="text-slate-900 font-bold">No inventory items found</p>
                    </div>
                )}
            </div>

            <InventoryDetailModal
                item={selectedItem}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </>
    );
}
