import { getInvoices } from '../customers/actions';
import DashboardLayout from '@/components/DashboardLayout';
import SearchInput from '@/components/SearchInput';
import InvoiceTable from '@/components/InvoiceTable';
import Pagination from '@/components/Pagination';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { FileText } from 'lucide-react';
import ExportInvoicesButton from '@/components/ExportInvoicesButton';

export default async function InvoicesPage(props: {
    searchParams: Promise<{ q?: string; page?: string; sort?: string; order?: string; modality?: string; type?: string }>;
}) {
    const searchParams = await props.searchParams;
    const search = searchParams.q || "";
    const currentPage = Number(searchParams.page) || 1;
    const currentSort = searchParams.sort || 'date';
    const currentOrder = (searchParams.order?.toLowerCase() === 'asc' ? 'ASC' : 'DESC') as 'ASC' | 'DESC';
    const modality = searchParams.modality || "all";
    const type = searchParams.type || "all";

    const { invoices, totalItems, itemsPerPage } = await getInvoices({
        q: search,
        page: currentPage,
        sort: currentSort,
        order: currentOrder,
        modality,
        type
    });

    const totalPages = Math.ceil(totalItems / itemsPerPage);

    const getBaseLink = (paramsUpdates: Record<string, string | null>) => {
        const params = new URLSearchParams();
        if (search) params.set('q', search);
        params.set('page', '1');
        params.set('sort', currentSort);
        params.set('order', currentOrder.toLowerCase());
        params.set('modality', modality);
        params.set('type', type);

        Object.entries(paramsUpdates).forEach(([key, value]) => {
            if (value === null) params.delete(key);
            else params.set(key, value);
        });
        return `?${params.toString()}`;
    };

    const modalityTabs = [
        { id: "all", label: "All Modalities" },
        { id: "US", label: "US" },
        { id: "DR", label: "DR" },
        { id: "mCT", label: "mCT" },
    ];

    const typeTabs = [
        { id: "all", label: "All Types" },
        { id: "sales", label: "Sales" },
        { id: "service", label: "Service" },
    ];

    return (
        <DashboardLayout breadcrumbs={[{ label: "Sales" }, { label: "Invoices" }]}>
            <div className="space-y-6">
                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Invoices</h1>
                        <p className="text-slate-500 mt-1">Manage and track historical sales invoices from Dynamics GP.</p>
                    </div>
                    <ExportInvoicesButton
                        search={search}
                        sort={currentSort}
                        order={currentOrder}
                        modality={modality}
                        type={type}
                    />
                </div>

                {/* Filters Row */}
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="w-full max-w-md">
                            <SearchInput placeholder="Search document number or customer..." />
                        </div>
                        <div className="text-sm font-medium text-slate-500 px-4 py-2 bg-slate-50 rounded-lg border border-slate-100 shrink-0">
                            Total: <span className="text-slate-900 font-bold">{totalItems.toLocaleString()}</span> invoices
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-6">
                        {/* Modality Tabs */}
                        <div className="space-y-1.5">
                            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold ml-1">Modality</span>
                            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit">
                                {modalityTabs.map((tab) => (
                                    <Link
                                        key={tab.id}
                                        href={getBaseLink({ modality: tab.id })}
                                        className={cn(
                                            "px-4 py-1.5 text-xs font-bold rounded-lg transition-all",
                                            modality === tab.id
                                                ? "bg-white text-primary shadow-sm"
                                                : "text-slate-500 hover:text-slate-700"
                                        )}
                                    >
                                        {tab.label}
                                    </Link>
                                ))}
                            </div>
                        </div>

                        {/* Type Tabs */}
                        <div className="space-y-1.5">
                            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold ml-1">Invoice Type</span>
                            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit">
                                {typeTabs.map((tab) => (
                                    <Link
                                        key={tab.id}
                                        href={getBaseLink({ type: tab.id })}
                                        className={cn(
                                            "px-4 py-1.5 text-xs font-bold rounded-lg transition-all",
                                            type === tab.id
                                                ? "bg-white text-primary shadow-sm"
                                                : "text-slate-500 hover:text-slate-700"
                                        )}
                                    >
                                        {tab.label}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <InvoiceTable
                    invoices={invoices}
                    currentSort={currentSort}
                    currentOrder={currentOrder}
                />

                {invoices.length > 0 && <Pagination totalPages={totalPages} />}

                {invoices.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 bg-slate-50/30 rounded-2xl border border-dashed border-slate-200">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
                            <FileText size={32} />
                        </div>
                        <p className="text-slate-900 font-bold text-lg">No invoices found</p>
                        <p className="text-slate-500 text-sm mt-1">
                            {search ? `No results match "${search}".` : "Try adjusting your search criteria."}
                        </p>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
