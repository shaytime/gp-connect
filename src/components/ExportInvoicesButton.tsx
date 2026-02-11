"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { getAllInvoicesForExport } from "@/app/customers/actions";

interface ExportInvoicesButtonProps {
    search: string;
    sort: string;
    order: 'ASC' | 'DESC';
    modality: string;
    type: string;
}

export default function ExportInvoicesButton({ search, sort, order, modality, type }: ExportInvoicesButtonProps) {
    const [exporting, setExporting] = useState(false);

    const handleExport = async () => {
        setExporting(true);
        try {
            const invoices = await getAllInvoicesForExport({
                q: search,
                sort,
                order,
                modality,
                type
            });

            if (!invoices || invoices.length === 0) {
                alert("No invoices found to export.");
                return;
            }

            const headers = [
                "Document #",
                "Modality",
                "Type",
                "Date",
                "Due Date",
                "Customer Name",
                "Amount",
                "Ship-to Contact",
                "Ship-to Address",
                "Ship-to City",
                "Ship-to State"
            ];

            const rows = invoices.map(inv => [
                inv.sopNumber,
                inv.modality,
                inv.type,
                inv.docDate ? new Date(inv.docDate).toLocaleDateString() : "",
                inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "",
                `"${inv.customerName.replace(/"/g, '""')}"`,
                inv.totalAmount.toFixed(2),
                `"${(inv.shipTo?.name || "").replace(/"/g, '""')}"`,
                `"${(inv.shipTo?.address1 || "").replace(/"/g, '""')}"`,
                `"${(inv.shipTo?.city || "").replace(/"/g, '""')}"`,
                `"${(inv.shipTo?.state || "").replace(/"/g, '""')}"`
            ]);

            const csvContent = [
                headers.join(","),
                ...rows.map(row => row.join(","))
            ].join("\n");

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `Invoices_Export_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Export error:", error);
            alert("Failed to export invoices. Please try again.");
        } finally {
            setExporting(false);
        }
    };

    return (
        <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {exporting ? (
                <>
                    <Loader2 size={16} className="animate-spin text-primary" />
                    Exporting...
                </>
            ) : (
                <>
                    <Download size={16} className="text-primary" />
                    Export CSV
                </>
            )}
        </button>
    );
}
