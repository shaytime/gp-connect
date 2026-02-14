"use client";

import { useState, useEffect } from "react";
import { X, Building, MapPin, DollarSign, User, Phone, Loader2, CreditCard, ChevronRight } from "lucide-react";
import { getCustomerDetails } from "@/app/customers/actions";
import { cn } from "@/lib/utils";
import ARDetailModal from "./ARDetailModal";

interface Address {
    code: string;
    address1: string;
    address2: string;
    city: string;
    state: string;
    zip: string;
    country: string;
}

interface CustomerDetails {
    id: string;
    name: string;
    contact: string;
    phone: string;
    billTo: Address | null;
    shipTo: Address | null;
    openAR: number;
    overdueAR: number;
}

interface CustomerDetailModalProps {
    customerId: string | null;
    isOpen: boolean;
    onClose: () => void;
}

export default function CustomerDetailModal({ customerId, isOpen, onClose }: CustomerDetailModalProps) {
    const [details, setDetails] = useState<CustomerDetails | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isARModalOpen, setIsARModalOpen] = useState(false);

    useEffect(() => {
        if (isOpen && customerId) {
            fetchDetails(customerId);
        } else {
            setDetails(null);
            setError(null);
            setIsARModalOpen(false);
        }
    }, [isOpen, customerId]);

    const fetchDetails = async (id: string) => {
        setLoading(true);
        setError(null);
        try {
            const data = await getCustomerDetails(id);
            if (data) {
                setDetails(data);
            } else {
                setError("Customer not found");
            }
        } catch (err) {
            setError("Failed to load customer details");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                <div
                    className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <div>
                            <div className="flex items-center gap-2 text-primary font-bold text-sm mb-1">
                                <Building size={16} />
                                <span>Customer Profile</span>
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 leading-tight">
                                {loading ? "Loading..." : details?.name || "Customer Detail"}
                            </h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-8">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                                <Loader2 size={48} className="animate-spin mb-4 text-primary" />
                                <p className="font-medium">Fetching secure data from Dynamics GP...</p>
                            </div>
                        ) : error ? (
                            <div className="text-center py-20">
                                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <X size={32} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900">{error}</h3>
                                <button
                                    onClick={onClose}
                                    className="mt-4 px-6 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all"
                                >
                                    Close
                                </button>
                            </div>
                        ) : details ? (
                            <div className="space-y-8">
                                {/* Key Stats */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <StatCard
                                        icon={<CreditCard className="text-blue-500" />}
                                        label="Customer ID"
                                        value={details.id}
                                        className="bg-blue-50/30 border-blue-100"
                                    />
                                    <StatCard
                                        icon={<User className="text-slate-500" />}
                                        label="Contact Person"
                                        value={details.contact || "N/A"}
                                    />
                                    <StatCard
                                        icon={<DollarSign className={cn(
                                            details.overdueAR >= details.openAR && details.openAR > 0 ? "text-red-500" :
                                                details.overdueAR > 0 ? "text-amber-500" : "text-emerald-500"
                                        )} />}
                                        label="Current Open AR"
                                        value={new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(details.openAR)}
                                        className={cn(
                                            "border ring-2 cursor-pointer hover:shadow-md active:scale-95 transition-all group",
                                            details.overdueAR >= details.openAR && details.openAR > 0 ? "bg-red-50/40 border-red-100 ring-red-500/10 hover:bg-red-50" :
                                                details.overdueAR > 0 ? "bg-amber-50/40 border-amber-100 ring-amber-500/10 hover:bg-amber-50" :
                                                    "bg-emerald-50/40 border-emerald-100 ring-emerald-500/10 hover:bg-emerald-50"
                                        )}
                                        valueClassName={cn(
                                            details.overdueAR >= details.openAR && details.openAR > 0 ? "text-red-700" :
                                                details.overdueAR > 0 ? "text-amber-700" : "text-emerald-700"
                                        )}
                                        onClick={() => setIsARModalOpen(true)}
                                        suffix={<ChevronRight size={16} className={cn(
                                            "transition-transform group-hover:translate-x-1",
                                            details.overdueAR >= details.openAR && details.openAR > 0 ? "text-red-400" :
                                                details.overdueAR > 0 ? "text-amber-400" : "text-emerald-400"
                                        )} />}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Bill To */}
                                    <div className="space-y-4">
                                        <SectionTitle icon={<CreditCard size={18} />} title="Bill-To Address" />
                                        <AddressCard address={details.billTo} />
                                    </div>
                                    {/* Ship To */}
                                    <div className="space-y-4">
                                        <SectionTitle icon={<MapPin size={18} />} title="Ship-To Address" />
                                        <AddressCard address={details.shipTo} />
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-100">
                                    <div className="flex items-center gap-2 text-slate-500 text-sm italic">
                                        <Phone size={14} />
                                        <span>Primary Phone: {details.phone || "No phone record"}</span>
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </div>

                    {/* Footer */}
                    <div className="px-8 py-6 border-t border-slate-100 bg-slate-50/30 flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all"
                        >
                            Close
                        </button>
                        <button className="px-6 py-2.5 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
                            Edit Information
                        </button>
                    </div>
                </div>
            </div>

            <ARDetailModal
                customerId={customerId}
                customerName={details?.name || ""}
                isOpen={isARModalOpen}
                onClose={() => setIsARModalOpen(false)}
            />
        </>
    );
}

function StatCard({ icon, label, value, className, valueClassName, onClick, suffix }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    className?: string;
    valueClassName?: string;
    onClick?: () => void;
    suffix?: React.ReactNode;
}) {
    return (
        <div
            onClick={onClick}
            className={cn("p-4 rounded-2xl border border-slate-100 bg-white shadow-sm flex flex-col", className)}
        >
            <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
                {icon}
                <span>{label}</span>
            </div>
            <div className="flex items-center justify-between mt-auto min-w-0">
                <div className={cn("text-lg font-bold text-slate-900 truncate", valueClassName)} title={value}>
                    {value}
                </div>
                {suffix}
            </div>
        </div>
    );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
    return (
        <div className="flex items-center gap-2 text-slate-900 font-bold border-b border-primary/20 pb-2 w-fit">
            <span className="text-primary">{icon}</span>
            <span>{title}</span>
        </div>
    );
}

function AddressCard({ address }: { address: Address | null }) {
    if (!address) {
        return (
            <div className="p-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 flex items-center justify-center text-slate-400 text-sm italic">
                No address assigned
            </div>
        );
    }

    return (
        <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <MapPin size={48} />
            </div>
            <div className="relative z-10 space-y-1">
                <div className="text-primary font-bold text-xs uppercase mb-2">Code: {address.code}</div>
                <div className="text-slate-900 font-medium">{address.address1}</div>
                {address.address2 && <div className="text-slate-900 font-medium">{address.address2}</div>}
                <div className="text-slate-600">
                    {address.city}, {address.state} {address.zip}
                </div>
                <div className="text-slate-500 text-sm mt-2">{address.country}</div>
            </div>
        </div>
    );
}
