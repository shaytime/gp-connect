"use client";

import { useState } from "react";
import { User, MapPin, Building, Globe, ExternalLink, ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from '@/lib/utils';
import { FavoriteButton } from './FavoriteButton';
import CustomerDetailModal from './CustomerDetailModal';

interface CustomerTableProps {
    customers: any[];
    favorites: string[];
    userId: string;
    currentSort: string;
    currentOrder: 'ASC' | 'DESC';
    status: string;
    query: string;
}

export default function CustomerTable({
    customers,
    favorites,
    userId,
    currentSort,
    currentOrder
}: CustomerTableProps) {
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const openModal = (id: string) => {
        setSelectedCustomerId(id);
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

    return (
        <>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-200">
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-16 text-center">Fav</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    <Link href={getBaseLink({ sort: 'id', order: currentSort === 'id' && currentOrder === 'ASC' ? 'desc' : 'asc' })} className="flex items-center gap-2 hover:text-primary transition-colors group">
                                        <Building size={14} className="text-slate-400 group-hover:text-primary" />
                                        <span>Customer ID</span>
                                        <SortIcon field="id" />
                                    </Link>
                                </th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    <Link href={getBaseLink({ sort: 'name', order: currentSort === 'name' && currentOrder === 'ASC' ? 'desc' : 'asc' })} className="flex items-center gap-2 hover:text-primary transition-colors group">
                                        <User size={14} className="text-slate-400 group-hover:text-primary" />
                                        <span>Customer Name</span>
                                        <SortIcon field="name" />
                                    </Link>
                                </th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    <Link href={getBaseLink({ sort: 'address', order: currentSort === 'address' && currentOrder === 'ASC' ? 'desc' : 'asc' })} className="flex items-center gap-2 hover:text-primary transition-colors group">
                                        <MapPin size={14} className="text-slate-400 group-hover:text-primary" />
                                        <span>Primary Address</span>
                                        <SortIcon field="address" />
                                    </Link>
                                </th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    <Link href={getBaseLink({ sort: 'city', order: currentSort === 'city' && currentOrder === 'ASC' ? 'desc' : 'asc' })} className="flex items-center gap-2 hover:text-primary transition-colors group">
                                        <Globe size={14} className="text-slate-400 group-hover:text-primary" />
                                        <span>City</span>
                                        <SortIcon field="city" />
                                    </Link>
                                </th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {customers.map((customer: any) => (
                                <tr key={customer.id.trim()} className="hover:bg-slate-50/80 transition-colors group">
                                    <td className="px-6 py-4 text-center">
                                        <FavoriteButton
                                            userId={userId}
                                            customerId={customer.id.trim()}
                                            initialIsFavorite={favorites.includes(customer.id.trim())}
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 group-hover:bg-primary group-hover:text-white transition-colors">
                                            {customer.id.trim()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-slate-900">
                                        {customer.name.trim()}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        {customer.address1?.trim()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm font-medium text-slate-600">
                                            {customer.city?.trim()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => openModal(customer.id.trim())}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/10 rounded-lg transition-all"
                                        >
                                            <span>View</span>
                                            <ExternalLink size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {customers.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 bg-slate-50/30">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
                            <User size={32} />
                        </div>
                        <p className="text-slate-900 font-bold">No customers found</p>
                    </div>
                )}
            </div>

            <CustomerDetailModal
                customerId={selectedCustomerId}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </>
    );
}
