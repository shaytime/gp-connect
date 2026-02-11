import { prismaGP, prismaApp } from '@/lib/db';
import { FavoriteButton } from '@/components/FavoriteButton';
import DashboardLayout from '@/components/DashboardLayout';
import SearchInput from '@/components/SearchInput';
import Pagination from '@/components/Pagination';
import CustomerTable from '@/components/CustomerTable';
import { User, MapPin, Building, Globe, ExternalLink, ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default async function CustomersPage(props: {
    searchParams: Promise<{ q?: string; page?: string; sort?: string; order?: string; status?: string }>;
}) {
    const searchParams = await props.searchParams;
    const query = searchParams.q || '';
    const currentPage = Number(searchParams.page) || 1;
    const currentSort = searchParams.sort || 'id';
    const currentOrder = (searchParams.order?.toLowerCase() === 'desc' ? 'DESC' : 'ASC') as 'ASC' | 'DESC';
    const status = searchParams.status === 'inactive' ? 'inactive' : 'active';
    const itemsPerPage = 15;

    // Mapping for RM00101 INACTIVE field: 0 = Active, 1 = Inactive
    const inactiveValue = status === 'active' ? 0 : 1;

    // Sorting whitelist to prevent SQL injection
    const sortMapping: Record<string, string> = {
        id: 'CUSTNMBR',
        name: 'CUSTNAME',
        address: 'ADDRESS1',
        city: 'CITY'
    };
    const orderByColumn = sortMapping[currentSort] || 'CUSTNMBR';

    console.log('Search Query:', query);
    console.log('Status Filter:', status);

    const queryTrim = query.trim();
    const skip = (currentPage - 1) * itemsPerPage;
    const likeQuery = `%${queryTrim}%`;

    // SQL components for dynamic building
    const baseWhere = `INACTIVE = ${inactiveValue}`;
    const searchClause = queryTrim
        ? `AND (CUSTNMBR LIKE @P1 OR CUSTNAME LIKE @P2 OR ADDRESS1 LIKE @P3 OR CITY LIKE @P4)`
        : '';

    const baseQuery = `FROM RM00101 WHERE ${baseWhere} ${searchClause}`;
    const sortClause = `ORDER BY ${orderByColumn} ${currentOrder}`;
    const paginationClause = `OFFSET ${skip} ROWS FETCH NEXT ${itemsPerPage} ROWS ONLY`;

    const [countResult, gpCustomers] = await Promise.all([
        prismaGP.$queryRawUnsafe<{ count: number }[]>(
            `SELECT COUNT(*) as count ${baseQuery}`,
            ...(queryTrim ? [likeQuery, likeQuery, likeQuery, likeQuery] : [])
        ),
        prismaGP.$queryRawUnsafe<any[]>(
            `SELECT CUSTNMBR as id, CUSTNAME as name, ADDRESS1 as address1, CITY as city, STATE as state, ZIP as zip 
             ${baseQuery} ${sortClause} ${paginationClause}`,
            ...(queryTrim ? [likeQuery, likeQuery, likeQuery, likeQuery] : [])
        )
    ]);

    const totalItems = Number(countResult[0]?.count || 0);
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    const userId = 'demo-user';
    const preference = await prismaApp.userPreference.findUnique({
        where: { userId },
    });
    const favorites = preference?.favorites || [];

    const getBaseLink = (paramsUpdates: Record<string, string | null>) => {
        const params = new URLSearchParams();
        if (query) params.set('q', query);
        params.set('page', '1');
        params.set('sort', currentSort);
        params.set('order', currentOrder.toLowerCase());
        params.set('status', status);

        Object.entries(paramsUpdates).forEach(([key, value]) => {
            if (value === null) params.delete(key);
            else params.set(key, value);
        });
        return `?${params.toString()}`;
    };

    const SortIcon = ({ field }: { field: string }) => {
        if (currentSort !== field) return <ArrowUpDown size={14} className="text-slate-300" />;
        return currentOrder === 'ASC' ? <ChevronUp size={14} className="text-primary" /> : <ChevronDown size={14} className="text-primary" />;
    };

    return (
        <DashboardLayout breadcrumbs={[{ label: "Sales" }, { label: "Customers" }]}>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Customers</h1>
                        <p className="text-slate-500 mt-1">Browse and manage your Dynamics GP customer directory.</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-hidden shrink-0">
                        <Link
                            href={getBaseLink({ status: 'active' })}
                            className={cn(
                                "px-4 py-2 text-sm font-bold rounded-lg transition-all",
                                status === 'active' ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            Active
                        </Link>
                        <Link
                            href={getBaseLink({ status: 'inactive' })}
                            className={cn(
                                "px-4 py-2 text-sm font-bold rounded-lg transition-all",
                                status === 'inactive' ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            Inactive
                        </Link>
                    </div>

                    <div className="w-full max-w-md">
                        <SearchInput placeholder="Search within results..." />
                    </div>

                    <div className="text-sm font-medium text-slate-500 px-4 py-2 bg-slate-50 rounded-lg border border-slate-100 shrink-0">
                        Total: <span className="text-slate-900 font-bold">{totalItems.toLocaleString()}</span> customers
                    </div>
                </div>

                <CustomerTable
                    customers={gpCustomers}
                    favorites={favorites}
                    userId={userId}
                    currentSort={currentSort}
                    currentOrder={currentOrder}
                    status={status}
                    query={query}
                />

                {gpCustomers.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 bg-slate-50/30">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
                            <User size={32} />
                        </div>
                        <p className="text-slate-900 font-bold">No {status} customers found</p>
                        <p className="text-sm text-slate-500 mt-1">"{query}"에 대한 검색 결과가 없습니다.</p>
                    </div>
                )}

                <Pagination totalPages={totalPages} />
            </div>
        </DashboardLayout>
    );
}
