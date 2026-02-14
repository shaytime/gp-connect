"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
    Package,
    LayoutDashboard,
    ShoppingCart,
    User,
    LogOut,
    ChevronRight,
    ChevronDown,
    FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import UserNav from "./UserNav";

interface DashboardLayoutProps {
    children: React.ReactNode;
    breadcrumbs?: { label: string; href?: string }[];
}

export default function DashboardLayout({ children, breadcrumbs }: DashboardLayoutProps) {
    const pathname = usePathname();

    const navigation = [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { label: "Sales Orders", href: "/", icon: ShoppingCart },
        { label: "Invoices", href: "/invoices", icon: FileText },
        { label: "Customers", href: "/customers", icon: User },
        {
            label: "Inventory",
            href: "/inventory",
            icon: Package,
            items: [
                { label: "Stock Overview", href: "/inventory" },
                { label: "Inventory Tracking", href: "/inventory/tracking" },
            ]
        },
    ];

    return (
        <div className="flex min-h-screen bg-[#F8FAFC]">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-slate-200 flex flex-col fixed inset-y-0 z-50">
                <div className="p-6">
                    <div className="flex items-center gap-2 text-primary font-bold text-xl">
                        <Package className="w-6 h-6" />
                        <span>GP Connect</span>
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-1">
                    {navigation.map((item) => (
                        <div key={item.label} className="space-y-1">
                            <SidebarItem
                                icon={<item.icon size={20} />}
                                label={item.label}
                                href={item.href}
                                active={pathname === item.href || (item.items?.some(sub => pathname === sub.href) ?? false)}
                                hasSubItems={!!item.items}
                            />
                            {item.items && (
                                <div className="ml-9 space-y-1 pb-2">
                                    {item.items.map(subItem => (
                                        <SubItem
                                            key={subItem.label}
                                            label={subItem.label}
                                            href={subItem.href}
                                            active={pathname === subItem.href}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-100">
                    <button
                        onClick={() => signOut()}
                        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors w-full px-4 py-2"
                    >
                        <LogOut size={20} />
                        <span className="font-medium">Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 pl-64">
                <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10">
                    <div className="flex items-center gap-2 text-slate-500 uppercase tracking-wider text-xs font-semibold">
                        {breadcrumbs ? (
                            breadcrumbs.map((crumb, index) => (
                                <React.Fragment key={crumb.label}>
                                    {index > 0 && <ChevronRight size={14} />}
                                    {crumb.href ? (
                                        <Link href={crumb.href} className="hover:text-primary transition-colors">
                                            {crumb.label}
                                        </Link>
                                    ) : (
                                        <span className={index === breadcrumbs.length - 1 ? "text-slate-900" : ""}>
                                            {crumb.label}
                                        </span>
                                    )}
                                </React.Fragment>
                            ))
                        ) : (
                            <>
                                <span>Sales</span>
                                <ChevronRight size={14} />
                                <span className="text-slate-900">Dashboard</span>
                            </>
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        <UserNav />
                    </div>
                </header>

                <main className="p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}

function SidebarItem({
    icon,
    label,
    href,
    active = false,
    hasSubItems = false
}: {
    icon: React.ReactNode;
    label: string;
    href: string;
    active?: boolean;
    hasSubItems?: boolean;
}) {
    return (
        <Link
            href={href}
            className={cn(
                "flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all font-medium",
                active
                    ? "bg-primary text-white shadow-lg shadow-primary/20"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            )}
        >
            {icon}
            <span className="flex-1">{label}</span>
            {hasSubItems && (
                <ChevronDown size={14} className={cn("transition-transform duration-200", active ? "rotate-0" : "-rotate-90 opacity-40")} />
            )}
        </Link>
    );
}

function SubItem({
    label,
    href,
    active = false
}: {
    label: string,
    href: string,
    active?: boolean
}) {
    return (
        <Link
            href={href}
            className={cn(
                "flex items-center gap-3 w-full px-3 py-2 rounded-lg transition-all text-xs font-bold uppercase tracking-wider",
                active
                    ? "text-primary bg-primary/5"
                    : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
            )}
        >
            <div className={cn("w-1.5 h-1.5 rounded-full", active ? "bg-primary" : "bg-slate-200 group-hover:bg-slate-300")} />
            <span>{label}</span>
        </Link>
    );
}
