"use client";

import { useState } from "react";
import { FileText, Calendar, User, ExternalLink, ArrowUpDown, ChevronUp, ChevronDown, Activity, Tag } from 'lucide-react';
import { usePathname, useSearchParams } from "next/navigation";
import Link from 'next/link';
import { cn } from '@/lib/utils';
import InvoiceDetailModal from './InvoiceDetailModal';

interface InvoiceTableProps {
    invoices: any[];
    currentSort?: string;
    currentOrder?: 'ASC' | 'DESC';
}

export default function InvoiceTable({ invoices, currentSort, currentOrder }: InvoiceTableProps) {
    const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const openModal = (id: string) => {
        setSelectedInvoiceId(id);
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

    const getModalityBadge = (modality: string) => {
        const styles: Record<string, string> = {
            "US": "bg-blue-50 text-blue-600 border-blue-100",
            "DR": "bg-purple-50 text-purple-600 border-purple-100",
            "mCT": "bg-emerald-50 text-emerald-600 border-emerald-100",
            "Other": "bg-slate-50 text-slate-500 border-slate-100"
        };
        const style = styles[modality] || styles["Other"];

        return (
            <span className={cn("px-2 py-0.5 rounded text-[10px] font-black border uppercase tracking-wider", style)}>
                {modality}
            </span>
        );
    };

    return (
        <>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold tracking-widest">
                                <th className="px-6 py-4">
                                    <Link href={getBaseLink({ sort: 'doc', order: currentSort === 'doc' && currentOrder === 'ASC' ? 'desc' : 'asc' })} className="flex items-center gap-2 hover:text-primary transition-colors">
                                        <FileText size={14} className="text-slate-400" />
                                        <span>Document #</span>
                                        <SortIcon field="doc" />
                                    </Link>
                                </th>
                                <th className="px-6 py-4">
                                    <Link href={getBaseLink({ sort: 'modality', order: currentSort === 'modality' && currentOrder === 'ASC' ? 'desc' : 'asc' })} className="flex items-center gap-2 hover:text-primary transition-colors">
                                        <Activity size={14} className="text-slate-400" />
                                        <span>Modality</span>
                                        <SortIcon field="modality" />
                                    </Link>
                                </th>
                                <th className="px-6 py-4">
                                    <Link href={getBaseLink({ sort: 'type', order: currentSort === 'type' && currentOrder === 'ASC' ? 'desc' : 'asc' })} className="flex items-center gap-2 hover:text-primary transition-colors">
                                        <Tag size={14} className="text-slate-400" />
                                        <span>Type</span>
                                        <SortIcon field="type" />
                                    </Link>
                                </th>
                                <th className="px-6 py-4">
                                    <Link href={getBaseLink({ sort: 'date', order: currentSort === 'date' && currentOrder === 'ASC' ? 'desc' : 'asc' })} className="flex items-center gap-2 hover:text-primary transition-colors">
                                        <Calendar size={14} className="text-slate-400" />
                                        <span>Date</span>
                                        <SortIcon field="date" />
                                    </Link>
                                </th>
                                <th className="px-6 py-4">
                                    <Link href={getBaseLink({ sort: 'due', order: currentSort === 'due' && currentOrder === 'ASC' ? 'desc' : 'asc' })} className="flex items-center gap-2 hover:text-primary transition-colors">
                                        <Calendar size={14} className="text-slate-400" />
                                        <span>Due Date</span>
                                        <SortIcon field="due" />
                                    </Link>
                                </th>
                                <th className="px-6 py-4">
                                    <Link href={getBaseLink({ sort: 'customer', order: currentSort === 'customer' && currentOrder === 'ASC' ? 'desc' : 'asc' })} className="flex items-center gap-2 hover:text-primary transition-colors">
                                        <User size={14} className="text-slate-400" />
                                        <span>Customer</span>
                                        <SortIcon field="customer" />
                                    </Link>
                                </th>
                                <th className="px-6 py-4 text-right">
                                    <Link href={getBaseLink({ sort: 'amount', order: currentSort === 'amount' && currentOrder === 'ASC' ? 'desc' : 'asc' })} className="flex items-center justify-end gap-2 hover:text-primary transition-colors">
                                        <span>Amount</span>
                                        <SortIcon field="amount" />
                                    </Link>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {invoices.map((invoice: any) => (
                                <tr key={invoice.sopNumber} className="hover:bg-slate-50/80 transition-colors group">
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => openModal(invoice.sopNumber)}
                                            className="font-bold text-primary hover:underline transition-all underline-offset-4"
                                        >
                                            {invoice.sopNumber}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4">
                                        {getModalityBadge(invoice.modality)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={cn(
                                            "px-2 py-0.5 rounded text-[10px] font-black border uppercase tracking-wider",
                                            invoice.type === "Service" ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-blue-50 text-blue-600 border-blue-100"
                                        )}>
                                            {invoice.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 font-medium whitespace-nowrap">
                                        {new Date(invoice.docDate).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 font-medium whitespace-nowrap">
                                        {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-700">{invoice.customerName}</span>
                                            {invoice.shipTo && (
                                                <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500 leading-tight whitespace-nowrap overflow-hidden">
                                                    <span className="font-semibold text-slate-400 uppercase tracking-tighter text-[9px] shrink-0">Ship-to:</span>
                                                    <span className="truncate">
                                                        {invoice.shipTo.name && <span className="font-bold text-slate-600 mr-1">{invoice.shipTo.name} |</span>}
                                                        {invoice.shipTo.address1}, {invoice.shipTo.city}, {invoice.shipTo.state}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-black text-slate-900">
                                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(invoice.totalAmount)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {invoices.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 bg-slate-50/30">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
                            <FileText size={32} />
                        </div>
                        <p className="text-slate-900 font-bold">No invoices found</p>
                    </div>
                )}
            </div>

            <InvoiceDetailModal
                docNumber={selectedInvoiceId}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </>
    );
}
