"use client";

import { useEffect, useState, useRef } from "react";
import { X, FileText, Loader2, Maximize2, Minimize2, Download } from "lucide-react";
import { getInvoiceDetails } from "@/app/customers/actions";
import { cn } from "@/lib/utils";

interface InvoiceLine {
    itemNumber: string;
    description: string;
    unitPrice: number;
    extendedPrice: number;
    quantity: number;
    uom: string;
    serialNumbers: string[];
}

interface InvoiceHeader {
    sopNumber: string;
    docDate: string;
    customerName: string;
    poNumber: string;
    subtotal: number;
    tradeDiscount: number;
    freight: number;
    tax: number;
    total: number;
    shippingMethod: string;
    paymentTerms: string;
    siteId: string;
    shipTo: {
        contact: string;
        address1: string;
        address2: string;
        city: string;
        state: string;
        zip: string;
        country: string;
    };
}

interface InvoiceDetailModalProps {
    docNumber: string | null;
    isOpen: boolean;
    onClose: () => void;
}

export default function InvoiceDetailModal({ docNumber, isOpen, onClose }: InvoiceDetailModalProps) {
    const [data, setData] = useState<{ header: InvoiceHeader; lines: InvoiceLine[] } | null>(null);
    const [loading, setLoading] = useState(false);
    const [position, setPosition] = useState({ x: 20, y: 20 });
    const [isMaximized, setIsMaximized] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const dragStartPos = useRef({ x: 0, y: 0 });
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && docNumber) {
            fetchDetails(docNumber);
            setPosition({ x: 20, y: 20 });
            setIsMaximized(false);
        }
    }, [isOpen, docNumber]);

    const fetchDetails = async (num: string) => {
        setLoading(true);
        try {
            const result = await getInvoiceDetails(num);
            setData(result);
        } catch (err) {
            console.error("Fetch error:", err);
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

    const exportToCSV = () => {
        if (!data) return;

        const headers = ["Item Number", "Description", "Quantity", "UOM", "Unit Price", "Extended Price", "Serial Numbers"];
        const rows = data.lines.map(line => [
            line.itemNumber,
            `"${line.description.replace(/"/g, '""')}"`,
            line.quantity,
            line.uom,
            line.unitPrice,
            line.extendedPrice,
            `"${(line.serialNumbers || []).join("; ").replace(/"/g, '""')}"`
        ]);

        const csvContent = [
            ["Invoice Details"],
            [`Invoice Number:`, data.header.sopNumber],
            [`Customer:`, data.header.customerName],
            [`Date:`, new Date(data.header.docDate).toLocaleDateString()],
            [`PO Number:`, data.header.poNumber || "N/A"],
            [],
            headers,
            ...rows,
            [],
            ["", "", "", "", "Subtotal", data.header.subtotal],
            ["", "", "", "", "Trade Discount", data.header.tradeDiscount],
            ["", "", "", "", "Tax", data.header.tax],
            ["", "", "", "", "Freight", data.header.freight],
            ["", "", "", "", "Total", data.header.total]
        ].map(e => e.join(",")).join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `Invoice_${data.header.sopNumber}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[120] pointer-events-none flex items-center justify-center">
            <div
                ref={modalRef}
                style={{
                    transform: isMaximized ? 'none' : `translate(${position.x}px, ${position.y}px)`,
                    transition: isDragging ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                className={cn(
                    "bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-slate-200 overflow-hidden pointer-events-auto flex flex-col transition-all duration-300",
                    isMaximized ? "w-full max-w-[1024px] h-[95vh]" : "w-full max-w-3xl max-h-[85vh]",
                    isDragging && "cursor-grabbing select-none"
                )}
            >
                {/* Header */}
                <div
                    onMouseDown={!isMaximized ? handleMouseDown : undefined}
                    className={cn(
                        "px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50",
                        !isMaximized ? "cursor-grab active:cursor-grabbing" : ""
                    )}
                >
                    <div className="flex items-center gap-3">
                        <FileText size={20} className="text-primary" />
                        <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-slate-900 leading-none">Invoice Detail</h3>
                            <span className="text-lg font-bold text-slate-500">{docNumber}</span>
                            {docNumber && (
                                <span className={cn(
                                    "px-2 py-0.5 rounded text-[10px] font-black border uppercase tracking-wider ml-1",
                                    docNumber.startsWith("USINV") ? "bg-blue-50 text-blue-600 border-blue-100" :
                                        docNumber.startsWith("DRINV") ? "bg-purple-50 text-purple-600 border-purple-100" :
                                            docNumber.startsWith("CTINV") ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                                "bg-slate-50 text-slate-500 border-slate-100"
                                )}>
                                    {docNumber.startsWith("USINV") ? "US" :
                                        docNumber.startsWith("DRINV") ? "DR" :
                                            docNumber.startsWith("CTINV") ? "mCT" : "Other"}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsMaximized(!isMaximized)}
                            className="p-1.5 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
                            title={isMaximized ? "Restore size" : "Maximize"}
                        >
                            {isMaximized ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
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
                <div className="flex-1 overflow-y-auto p-0">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <Loader2 size={32} className="animate-spin mb-4 text-primary" />
                            <p className="text-sm">Fetching invoice details...</p>
                        </div>
                    ) : data ? (
                        <div className="flex flex-col">
                            {/* Summary Header */}
                            <div className="px-6 py-6 bg-white border-b border-slate-50 grid grid-cols-3 gap-8">
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Customer</span>
                                        <p className="text-sm font-bold text-slate-800">{data.header.customerName}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Date</span>
                                        <p className="text-sm font-bold text-slate-800">{new Date(data.header.docDate).toLocaleDateString()}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">PO Number</span>
                                        <p className="text-sm font-bold text-slate-800">{data.header.poNumber || "N/A"}</p>
                                    </div>
                                </div>

                                <div className="space-y-4 border-l border-slate-50 pl-8">
                                    <div className="space-y-1">
                                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Site ID</span>
                                        <p className="text-sm font-bold text-slate-800">{data.header.siteId || "N/A"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Payment Terms</span>
                                        <p className="text-sm font-bold text-slate-800">{data.header.paymentTerms || "N/A"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Shipping Method</span>
                                        <p className="text-sm font-bold text-slate-800">{data.header.shippingMethod || "N/A"}</p>
                                    </div>
                                </div>

                                <div className="space-y-1 border-l border-slate-50 pl-8">
                                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Ship-To Address</span>
                                    <div className="text-xs text-slate-600 space-y-0.5 leading-relaxed">
                                        {data.header.shipTo?.contact && <p className="font-bold text-slate-800 truncate">{data.header.shipTo.contact}</p>}
                                        <p>{data.header.shipTo?.address1}</p>
                                        {data.header.shipTo?.address2 && <p>{data.header.shipTo.address2}</p>}
                                        <p>{data.header.shipTo?.city}, {data.header.shipTo?.state} {data.header.shipTo?.zip}</p>
                                        <p className="uppercase text-[10px] font-bold text-slate-400 mt-1">{data.header.shipTo?.country}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Lines Table */}
                            <table className="w-full text-left border-collapse text-sm">
                                <thead className="bg-slate-50/50">
                                    <tr className="text-slate-400 font-bold border-b border-slate-100 italic">
                                        <th className="px-6 py-3 font-bold uppercase text-[10px] tracking-widest">Item / Description</th>
                                        <th className="px-6 py-3 font-bold uppercase text-[10px] tracking-widest text-center">Qty</th>
                                        <th className="px-6 py-3 font-bold uppercase text-[10px] tracking-widest text-right">Price</th>
                                        <th className="px-6 py-3 font-bold uppercase text-[10px] tracking-widest text-right">Extended</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {data.lines.map((line, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-900">{line.itemNumber}</span>
                                                        <span className="text-xs text-slate-500 line-clamp-1">{line.description}</span>
                                                    </div>
                                                    {line.serialNumbers && line.serialNumbers.length > 0 && (
                                                        <div className="mt-1 flex flex-wrap gap-1.5">
                                                            {line.serialNumbers.map((sn, snIdx) => (
                                                                <span key={snIdx} className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-mono font-bold text-slate-600 border border-slate-200">
                                                                    SN: {sn}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className="font-bold text-slate-700">{Math.round(line.quantity)}</span>
                                                    <span className="text-[10px] text-slate-400 font-medium uppercase">{line.uom}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-medium text-slate-600">
                                                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(line.unitPrice)}
                                            </td>
                                            <td className="px-6 py-4 text-right font-black text-slate-900">
                                                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(line.extendedPrice)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400 italic">
                            Transaction detail not found in history.
                        </div>
                    )}
                </div>

                {/* Footer Totals */}
                {data && (
                    <div className="px-6 py-6 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
                        <button
                            onClick={exportToCSV}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                        >
                            <Download size={16} className="text-primary" />
                            Export to CSV
                        </button>
                        <div className="w-64 space-y-2">
                            <div className="flex justify-between text-xs font-medium text-slate-500">
                                <span>Subtotal</span>
                                <span>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(data.header.subtotal)}</span>
                            </div>
                            {data.header.tradeDiscount > 0 && (
                                <div className="flex justify-between text-xs font-semibold text-primary">
                                    <span>Trade Discount</span>
                                    <span>-{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(data.header.tradeDiscount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-xs font-medium text-slate-500">
                                <span>Tax</span>
                                <span>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(data.header.tax)}</span>
                            </div>
                            <div className="flex justify-between text-xs font-medium text-slate-500 pb-2">
                                <span>Freight</span>
                                <span>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(data.header.freight)}</span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                                <span className="text-sm font-black text-slate-900 uppercase tracking-tighter">Total Amount</span>
                                <span className="text-xl font-black text-primary tracking-tight">
                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(data.header.total)}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
