"use client";

import { useEffect, useState } from "react";
import { X, Loader2, CreditCard, History, AlertCircle } from "lucide-react";
import { getInvoicePaymentStatus } from "@/app/customers/actions";
import { cn } from "@/lib/utils";

interface PaymentStatusModalProps {
    docNumber: string | null;
    isOpen: boolean;
    onClose: () => void;
}

export default function PaymentStatusModal({ docNumber, isOpen, onClose }: PaymentStatusModalProps) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && docNumber) {
            fetchPaymentStatus(docNumber);
        }
    }, [isOpen, docNumber]);

    const fetchPaymentStatus = async (num: string) => {
        setLoading(true);
        try {
            const result = await getInvoicePaymentStatus(num);
            setData(result);
        } catch (err) {
            console.error("Fetch payment status error:", err);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[140] pointer-events-auto flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                            <CreditCard size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 leading-none">Payment Status</h3>
                            <p className="text-xs text-slate-500 mt-1 font-medium">{docNumber}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <Loader2 size={32} className="animate-spin mb-4 text-blue-600" />
                            <p className="text-sm font-medium">Loading payment data...</p>
                        </div>
                    ) : data ? (
                        <div className="space-y-8">
                            {/* Balance Summary */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Invoice Total</span>
                                    <span className="text-lg font-black text-slate-900">
                                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(data.totalAmount)}
                                    </span>
                                </div>
                                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                                    <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest block mb-1">Amount Paid</span>
                                    <span className="text-lg font-black text-emerald-600">
                                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(data.amountPaid)}
                                    </span>
                                </div>
                                <div className={cn(
                                    "p-4 rounded-2xl border",
                                    data.amountRemaining > 0 ? "bg-amber-50 border-amber-100" : "bg-blue-50 border-blue-100"
                                )}>
                                    <span className={cn(
                                        "text-[10px] font-bold uppercase tracking-widest block mb-1",
                                        data.amountRemaining > 0 ? "text-amber-500" : "text-blue-500"
                                    )}>Remaining</span>
                                    <span className={cn(
                                        "text-lg font-black",
                                        data.amountRemaining > 0 ? "text-amber-600" : "text-blue-600"
                                    )}>
                                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(data.amountRemaining)}
                                    </span>
                                </div>
                            </div>

                            {/* Applied Payments Table */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <History size={16} className="text-slate-400" />
                                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Application History</h4>
                                </div>
                                {data.payments.length > 0 ? (
                                    <div className="border border-slate-100 rounded-xl overflow-hidden">
                                        <table className="w-full text-left border-collapse text-xs">
                                            <thead>
                                                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold">
                                                    <th className="px-4 py-2.5">Date</th>
                                                    <th className="px-4 py-2.5">Doc #</th>
                                                    <th className="px-4 py-2.5">Type</th>
                                                    <th className="px-4 py-2.5 text-right">Applied</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {data.payments.map((p: any, idx: number) => (
                                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="px-4 py-3 text-slate-600 font-medium">
                                                            {new Date(p.date).toLocaleDateString()}
                                                        </td>
                                                        <td className="px-4 py-3 font-bold text-slate-900">{p.docNumber}</td>
                                                        <td className="px-4 py-3">
                                                            <span className={cn(
                                                                "px-1.5 py-0.5 rounded-[4px] text-[9px] font-black uppercase tracking-tight border",
                                                                p.type === "Payment" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-blue-50 text-blue-600 border-blue-100"
                                                            )}>
                                                                {p.type}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-bold text-slate-900">
                                                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(p.amountApplied)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="py-8 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                                        <AlertCircle size={24} className="mb-2 opacity-20" />
                                        <p className="text-xs italic">No applied payments found in RM history.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="py-12 flex flex-col items-center justify-center text-slate-400 italic">
                            <AlertCircle size={32} className="mb-4 opacity-20" />
                            <p className="text-sm">Transaction not found in Receivabl Management tables.</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
