"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import { useDebouncedCallback } from "use-debounce";

export default function SearchInput({ placeholder = "Search..." }: { placeholder?: string }) {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { replace } = useRouter();
    const [searchTerm, setSearchTerm] = useState(searchParams.get("q")?.toString() || "");

    const handleSearch = useDebouncedCallback((term) => {
        const params = new URLSearchParams(searchParams);
        params.set("page", "1");
        if (term) {
            params.set("q", term);
        } else {
            params.delete("q");
        }
        replace(`${pathname}?${params.toString()}`);
    }, 300);

    const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchTerm(value);
        handleSearch(value);
    };

    const clearSearch = () => {
        setSearchTerm("");
        handleSearch("");
    };

    return (
        <div className="relative flex flex-1 flex-shrink-0">
            <label htmlFor="search" className="sr-only">
                Search
            </label>
            <Search className="absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 peer-focus:text-primary transition-colors" />
            <input
                className="peer block w-full rounded-xl border border-slate-200 py-[9px] pl-10 pr-10 text-sm outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white"
                placeholder={placeholder}
                onChange={onChange}
                value={searchTerm}
            />
            {searchTerm && (
                <button
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                    <X size={16} />
                </button>
            )}
        </div>
    );
}
