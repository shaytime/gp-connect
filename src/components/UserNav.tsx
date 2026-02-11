"use client";

import { signOut, useSession } from "next-auth/react";
import { LogOut, User, Mail, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

export default function UserNav() {
    const { data: session } = useSession();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const user = session?.user || {
        name: "Dev User",
        email: "dev@nextlogistics.com",
        image: null
    };

    const initials = user.name
        ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase()
        : "??";

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-4 hover:bg-slate-50 p-1.5 pr-3 rounded-2xl transition-all border border-transparent hover:border-slate-100"
            >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shadow-sm border border-primary/10">
                    {user.image ? (
                        <img src={user.image} alt={user.name || ""} className="w-full h-full rounded-xl object-cover" />
                    ) : (
                        <span>{initials}</span>
                    )}
                </div>
                <div className="text-left hidden sm:block">
                    <p className="text-sm font-bold text-slate-900 leading-none">{user.name}</p>
                    <p className="text-[11px] text-slate-500 mt-1 font-medium italic">{user.email}</p>
                </div>
                <ChevronDown size={14} className={cn("text-slate-400 transition-transform duration-200", isOpen && "rotate-180")} />
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[100] p-2 animate-in fade-in slide-in-from-top-2">
                    <div className="p-4 border-b border-slate-50 mb-2">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Account</p>
                        <p className="text-sm font-black text-slate-900 truncate">{user.name}</p>
                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    </div>

                    <button
                        onClick={() => signOut()}
                        className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-all font-bold text-sm group"
                    >
                        <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center group-hover:bg-red-200 transition-colors">
                            <LogOut size={16} />
                        </div>
                        Sign Out
                    </button>
                </div>
            )}
        </div>
    );
}
