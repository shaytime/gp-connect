"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Pagination({ totalPages }: { totalPages: number }) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const currentPage = Number(searchParams.get("page")) || 1;

    const createPageURL = (pageNumber: number | string) => {
        const params = new URLSearchParams(searchParams);
        params.set("page", pageNumber.toString());
        return `${pathname}?${params.toString()}`;
    };

    if (totalPages <= 1) return null;

    return (
        <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3 sm:px-6 rounded-xl shadow-sm mt-8">
            <div className="flex flex-1 justify-between sm:hidden">
                <Link
                    href={createPageURL(currentPage - 1)}
                    className={cn(
                        "relative inline-flex items-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors",
                        currentPage <= 1 && "pointer-events-none opacity-50"
                    )}
                >
                    Previous
                </Link>
                <Link
                    href={createPageURL(currentPage + 1)}
                    className={cn(
                        "relative ml-3 inline-flex items-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors",
                        currentPage >= totalPages && "pointer-events-none opacity-50"
                    )}
                >
                    Next
                </Link>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm text-slate-700">
                        Page <span className="font-semibold">{currentPage}</span> of{" "}
                        <span className="font-semibold">{totalPages}</span>
                    </p>
                </div>
                <div>
                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                        <Link
                            href={createPageURL(currentPage - 1)}
                            className={cn(
                                "relative inline-flex items-center rounded-l-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 transition-colors",
                                currentPage <= 1 && "pointer-events-none opacity-50"
                            )}
                        >
                            <span className="sr-only">Previous</span>
                            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                        </Link>

                        {[...Array(totalPages)].map((_, i) => {
                            const page = i + 1;
                            // Basic pagination logic to only show a few pages if there are many
                            if (
                                totalPages > 7 &&
                                page !== 1 &&
                                page !== totalPages &&
                                (page < currentPage - 1 || page > currentPage + 1)
                            ) {
                                if (page === 2 || page === totalPages - 1) {
                                    return <span key={page} className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-300">...</span>;
                                }
                                return null;
                            }

                            return (
                                <Link
                                    key={page}
                                    href={createPageURL(page)}
                                    className={cn(
                                        "relative inline-flex items-center px-4 py-2 text-sm font-semibold focus:z-20 transition-all",
                                        currentPage === page
                                            ? "z-10 bg-primary text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary shadow-md"
                                            : "text-slate-900 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:outline-offset-0"
                                    )}
                                >
                                    {page}
                                </Link>
                            );
                        })}

                        <Link
                            href={createPageURL(currentPage + 1)}
                            className={cn(
                                "relative inline-flex items-center rounded-r-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 transition-colors",
                                currentPage >= totalPages && "pointer-events-none opacity-50"
                            )}
                        >
                            <span className="sr-only">Next</span>
                            <ChevronRight className="h-5 w-5" aria-hidden="true" />
                        </Link>
                    </nav>
                </div>
            </div>
        </div>
    );
}
