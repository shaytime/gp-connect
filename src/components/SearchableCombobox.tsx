"use client";

import React, { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Option {
    value: string;
    label: string;
    description?: string;
}

interface SearchableComboboxProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

export default function SearchableCombobox({
    options,
    value,
    onChange,
    placeholder = "Select option...",
    className,
    disabled = false
}: SearchableComboboxProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const filteredOptions = options.filter(option =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        option.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (option.description && option.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen) {
            setSearchTerm("");
            setHighlightedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 0);
        }
    }, [isOpen]);

    // Auto-scroll effect
    useEffect(() => {
        if (isOpen && listRef.current) {
            const container = listRef.current;
            const activeItem = container.children[highlightedIndex] as HTMLElement;
            if (activeItem) {
                const itemTop = activeItem.offsetTop;
                const itemBottom = itemTop + activeItem.offsetHeight;
                const containerTop = container.scrollTop;
                const containerBottom = containerTop + container.offsetHeight;

                if (itemTop < containerTop) {
                    container.scrollTop = itemTop;
                } else if (itemBottom > containerBottom) {
                    container.scrollTop = itemBottom - container.offsetHeight;
                }
            }
        }
    }, [highlightedIndex, isOpen]);

    const handleSelect = (option: Option) => {
        onChange(option.value);
        setIsOpen(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlightedIndex(prev => (prev + 1) % filteredOptions.length);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlightedIndex(prev => (prev - 1 + filteredOptions.length) % filteredOptions.length);
        } else if (e.key === "Enter" && filteredOptions[highlightedIndex]) {
            e.preventDefault();
            handleSelect(filteredOptions[highlightedIndex]);
        } else if (e.key === "Escape") {
            setIsOpen(false);
        }
    };

    const selectedOption = options.find(o => o.value === value);

    return (
        <div ref={containerRef} className={cn("relative", className)}>
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={cn(
                    "w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm flex items-center justify-between transition-all outline-none",
                    isOpen ? "ring-2 ring-primary/20 border-primary" : "hover:border-slate-300",
                    disabled && "opacity-50 cursor-not-allowed"
                )}
            >
                <span className={cn("truncate", !selectedOption && "text-slate-400")}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown size={16} className={cn("text-slate-400 transition-transform", isOpen && "rotate-180")} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-2xl z-[250] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="p-2 border-b border-slate-100 bg-slate-50">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input
                                ref={inputRef}
                                type="text"
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setHighlightedIndex(0);
                                }}
                                onKeyDown={handleKeyDown}
                                placeholder="Search..."
                                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            />
                        </div>
                    </div>
                    <div ref={listRef} className="max-h-60 overflow-auto py-1">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option, index) => (
                                <div
                                    key={option.value}
                                    onClick={() => handleSelect(option)}
                                    className={cn(
                                        "px-3 py-2 cursor-pointer flex items-center justify-between transition-colors",
                                        highlightedIndex === index ? "bg-slate-100" : "hover:bg-slate-50",
                                        value === option.value && "text-primary font-medium"
                                    )}
                                >
                                    <div className="flex flex-col truncate">
                                        <span className="text-sm truncate">{option.label}</span>
                                        {option.description && (
                                            <span className="text-[10px] text-slate-500 truncate">{option.description}</span>
                                        )}
                                    </div>
                                    {value === option.value && <Check size={14} className="flex-shrink-0 ml-2" />}
                                </div>
                            ))
                        ) : (
                            <div className="px-3 py-4 text-center">
                                <p className="text-xs text-slate-400">No results found</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
