"use client";

import { useEffect, useState, useRef } from "react";
import { X, DollarSign, Calendar, FileText, Loader2, GripHorizontal } from "lucide-react";
import { getARTransactions } from "@/app/customers/actions";
import { cn } from "@/lib/utils";
import InvoiceDetailModal from "./InvoiceDetailModal";

interface ARTransaction {
    docNumber: string;
    docDate: string;
    dueDate: string;
    type: string;
    originalAmount: number;
    balance: number;
    isCredit: boolean;
}

interface ARDetailModalProps {
    customerId: string | null;
    customerName: string;
    isOpen: boolean;
    onClose: () => void;
}

export default function ARDetailModal({ customerId, customerName, isOpen, onClose }: ARDetailModalProps) {
    const [transactions, setTransactions] = useState<ARTransaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);
    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
    const dragStartPos = useRef({ x: 0, y: 0 });
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && customerId) {
            fetchTransactions(customerId);
            // Reset position when opened
            setPosition({ x: 0, y: 0 });
        }
    }, [isOpen, customerId]);

    const fetchTransactions = async (id: string) => {
        setLoading(true);
        try {
            const data = await getARTransactions(id);
            setTransactions(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        dragStartPos.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y
        };
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            setPosition({
                x: e.clientX - dragStartPos.current.x,
                y: e.clientY - dragStartPos.current.y
            });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", handleMouseUp);
        }

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isDragging]);

    const handleExportCSV = () => {
        if (transactions.length === 0) return;

        const headers = ["Doc Date", "Due Date", "Document #", "Type", "Balance"];
        const rows = transactions.map(trx => [
            new Date(trx.docDate).toLocaleDateString(),
            new Date(trx.dueDate).toLocaleDateString(),
            trx.docNumber,
            trx.type,
            (trx.isCredit ? -trx.balance : trx.balance).toFixed(2)
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map(row => row.join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `Open_AR_${customerName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] pointer-events-none flex items-center justify-center">
            <div
                ref={modalRef}
                style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
                className={cn(
                    "bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden pointer-events-auto flex flex-col max-h-[70vh]",
                    isDragging && "cursor-grabbing select-none"
                )}
            >
                {/* Header - Drag Handle */}
                <div
                    onMouseDown={handleMouseDown}
                    className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 cursor-grab active:cursor-grabbing"
                >
                    <div className="flex items-center gap-3">
                        <GripHorizontal size={20} className="text-slate-400" />
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 leading-none">Open AR List</h3>
                            <p className="text-xs text-slate-500 mt-1">{customerName}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleExportCSV}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 font-bold text-xs rounded-lg hover:bg-slate-50 transition-all shadow-sm"
                            title="Export to CSV"
                        >
                            <FileText size={16} className="text-emerald-500" />
                            <span>Export CSV</span>
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1.5 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <Loader2 size={32} className="animate-spin mb-4 text-primary" />
                            <p className="text-sm">Loading transactions...</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse text-sm">
                            <thead className="sticky top-0 bg-white z-10 shadow-sm">
                                <tr className="text-slate-500 font-bold border-b border-slate-100">
                                    <th className="px-6 py-3">Doc Date</th>
                                    <th className="px-6 py-3">Due Date</th>
                                    <th className="px-6 py-3">Document #</th>
                                    <th className="px-6 py-3">Type</th>
                                    <th className="px-6 py-3 text-right">Balance</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {transactions.map((trx) => {
                                    const isOverdue = !trx.isCredit && new Date(trx.dueDate) < new Date();
                                    return (
                                        <tr key={trx.docNumber} className={cn(
                                            "hover:bg-slate-50 transition-colors",
                                            isOverdue && "bg-red-50/30"
                                        )}>
                                            <td className={cn(
                                                "px-6 py-4 whitespace-nowrap",
                                                isOverdue ? "text-red-500 font-medium" : "text-slate-600"
                                            )}>
                                                {new Date(trx.docDate).toLocaleDateString()}
                                            </td>
                                            <td className={cn(
                                                "px-6 py-4 whitespace-nowrap font-bold",
                                                isOverdue ? "text-red-600" : "text-slate-600"
                                            )}>
                                                {new Date(trx.dueDate).toLocaleDateString()}
                                            </td>
                                            <td className={cn(
                                                "px-6 py-4 font-medium focus:outline-none",
                                                isOverdue ? "text-red-600" : "text-slate-900"
                                            )}>
                                                {trx.type === "Invoice" ? (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedInvoice(trx.docNumber);
                                                            setIsInvoiceModalOpen(true);
                                                        }}
                                                        className="hover:underline text-blue-600 font-bold decoration-2 underline-offset-4 decoration-blue-200 pointer-events-auto cursor-pointer"
                                                    >
                                                        {trx.docNumber}
                                                    </button>
                                                ) : (
                                                    <span>{trx.docNumber}</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase",
                                                    (trx.isCredit || isOverdue) ? "bg-red-50 text-red-600 border border-red-100" : "bg-blue-50 text-blue-600"
                                                )}>
                                                    {trx.type}
                                                </span>
                                            </td>
                                            <td className={cn(
                                                "px-6 py-4 text-right font-black",
                                                (trx.isCredit || isOverdue) ? "text-red-600" : "text-slate-900"
                                            )}>
                                                {trx.isCredit ? "-" : ""}
                                                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(trx.balance)}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {transactions.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center text-slate-400 italic">
                                            No open transactions found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 grid grid-cols-3 items-center text-xs">
                    <div className="text-slate-500 font-medium">
                        Showing {transactions.length} items
                    </div>

                    <div className="flex justify-end">
                        <div className="bg-primary/5 px-4 py-2 rounded-xl border border-primary/10 flex flex-col items-end gap-0.5 min-w-[140px]">
                            <span className="text-[10px] uppercase tracking-wider text-primary font-bold opacity-70">Total AR Balance</span>
                            <span className="text-lg font-black text-primary leading-none">
                                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                                    transactions.reduce((sum, trx) => sum + (trx.isCredit ? -trx.balance : trx.balance), 0)
                                )}
                            </span>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <div className="bg-red-50 px-4 py-2 rounded-xl border border-red-100 flex flex-col items-end gap-0.5 min-w-[140px]">
                            <span className="text-[10px] uppercase tracking-wider text-red-500 font-bold opacity-70">Total Overdue Balance</span>
                            <span className="text-lg font-black text-red-600 leading-none">
                                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                                    transactions.reduce((sum, trx) => {
                                        const isOverdue = !trx.isCredit && new Date(trx.dueDate) < new Date();
                                        return isOverdue ? sum + trx.balance : sum;
                                    }, 0)
                                )}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <InvoiceDetailModal
                docNumber={selectedInvoice}
                isOpen={isInvoiceModalOpen}
                onClose={() => setIsInvoiceModalOpen(false)}
            />
        </div>
    );
}
