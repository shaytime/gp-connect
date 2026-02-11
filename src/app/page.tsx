"use client";

import React, { useState, useRef, useEffect } from "react";
import {
    Plus,
    Trash2,
    Search,
    ChevronRight,
    Package,
    User,
    Truck,
    ArrowRight,
    LogOut,
    LayoutDashboard,
    ShoppingCart,
    CheckCircle2,
    Settings,
    X
} from "lucide-react";
import { cn } from "@/lib/utils";
import DashboardLayout from "@/components/DashboardLayout";
import { searchCustomers, getCustomerAddresses, searchProducts, getSites, searchSalesOrders, getSalesOrderDetails } from "./customers/actions";
import { Loader2, History } from "lucide-react";

interface LineItem {
    id: string;
    itemNumber: string;
    description: string;
    quantity: number;
    unitPrice: number;
    unitCost: number;
    total: number;
    uom: string;
    siteId: string;
    priceLevel: string;
    shipToAddressId: string;
    markdown: number;
}

export default function SalesOrderPage() {
    const [items, setItems] = useState<LineItem[]>([]);
    const [customerSearch, setCustomerSearch] = useState("");
    const [gpCustomers, setGpCustomers] = useState<any[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
    const [showCustomerList, setShowCustomerList] = useState(false);
    const [customerHighlightedIndex, setCustomerHighlightedIndex] = useState(0);
    const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
    const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
    const [gpAddresses, setGpAddresses] = useState<any[]>([]);

    const [searchTerm, setSearchTerm] = useState("");
    const [quantity, setQuantity] = useState<string>("1");
    const [price, setPrice] = useState<string>("0.00");
    const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
    const [showSearchList, setShowSearchList] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(0);

    const [selectedBillTo, setSelectedBillTo] = useState<string>("");
    const [selectedShipTo, setSelectedShipTo] = useState<string>("");

    const [sites, setSites] = useState<{ id: string; name: string }[]>([]);
    const [defaultSiteId, setDefaultSiteId] = useState<string>("MAIN");
    const [poNumber, setPoNumber] = useState("");
    const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
    const [gpProducts, setGpProducts] = useState<any[]>([]);
    const [isLoadingProducts, setIsLoadingProducts] = useState(false);

    const [editingItem, setEditingItem] = useState<LineItem | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isTaxExempt, setIsTaxExempt] = useState(false);

    // Order Search State
    const [orderSearch, setOrderSearch] = useState("");
    const [gpOrders, setGpOrders] = useState<any[]>([]);
    const [isLoadingOrders, setIsLoadingOrders] = useState(false);
    const [showOrderList, setShowOrderList] = useState(false);
    const [isLoadingOrderDetails, setIsLoadingOrderDetails] = useState(false);
    const [orderSearchError, setOrderSearchError] = useState<string | null>(null);
    const [tradeDiscount, setTradeDiscount] = useState(0);
    const [modality, setModality] = useState<"US" | "DR" | "mCT">("US");
    const [loadedOrderNumber, setLoadedOrderNumber] = useState<string | null>(null);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    };

    const productInputRef = useRef<HTMLInputElement>(null);
    const quantityInputRef = useRef<HTMLInputElement>(null);
    const priceInputRef = useRef<HTMLInputElement>(null);
    const searchListRef = useRef<HTMLDivElement>(null);
    const customerSearchListRef = useRef<HTMLDivElement>(null);
    const orderSearchListRef = useRef<HTMLDivElement>(null);

    // Order highlighting state
    const [orderHighlightedIndex, setOrderHighlightedIndex] = useState(0);


    const subtotal = items.reduce((acc, item) => acc + item.total, 0);
    const tax = isTaxExempt ? 0 : (subtotal - tradeDiscount) * 0.0825; // Example 8.25%, 0 if exempt, calculated AFTER trade discount
    const grandTotal = subtotal - tradeDiscount + tax;

    const currentShipToAddress = gpAddresses.find(a => a.id === selectedShipTo);
    const shipToState = currentShipToAddress?.state || "";

    // Fetch sites on mount
    useEffect(() => {
        const fetchSites = async () => {
            try {
                const results = await getSites();
                setSites(results);
                if (results.length > 0 && !results.find(s => s.id === "MAIN")) {
                    setDefaultSiteId(results[0].id);
                }
            } catch (error) {
                console.error("Error fetching sites:", error);
            }
        };
        fetchSites();
    }, []);

    // Debounced customer search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (customerSearch.length >= 3 && !selectedCustomer) {
                setIsLoadingCustomers(true);
                try {
                    const results = await searchCustomers(customerSearch);
                    setGpCustomers(results);
                    setShowCustomerList(results.length > 0);
                } catch (error) {
                    console.error("Search error:", error);
                } finally {
                    setIsLoadingCustomers(false);
                }
            } else {
                setGpCustomers([]);
                setShowCustomerList(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [customerSearch, selectedCustomer]);

    // Debounced product search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchTerm.length >= 3 && !selectedProduct) {
                setIsLoadingProducts(true);
                try {
                    const results = await searchProducts(searchTerm, defaultSiteId);
                    setGpProducts(results);
                    setShowSearchList(results.length > 0);
                } catch (error) {
                    console.error("Product search error:", error);
                } finally {
                    setIsLoadingProducts(false);
                }
            } else {
                setGpProducts([]);
                setShowSearchList(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchTerm, selectedProduct]);

    // Debounced order search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (orderSearch.length >= 3) {
                setIsLoadingOrders(true);
                setOrderSearchError(null);
                try {
                    const response = await searchSalesOrders(orderSearch);
                    setGpOrders(response.results);
                    setOrderSearchError(response.error);
                    setShowOrderList(true); // Show list even if empty, to show "No Results" or Error
                } catch (error: any) {
                    console.error("Order search error:", error);
                    setOrderSearchError(error.message);
                } finally {
                    setIsLoadingOrders(false);
                }
            } else {
                setGpOrders([]);
                setShowOrderList(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [orderSearch]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!productInputRef.current?.contains(event.target as Node) && !searchListRef.current?.contains(event.target as Node)) {
                setShowSearchList(false);
            }
            if (showCustomerList && !(event.target as HTMLElement).closest('.customer-search-container')) {
                setShowCustomerList(false);
            }
            if (showOrderList && !(event.target as HTMLElement).closest('.order-search-container')) {
                setShowOrderList(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [showCustomerList]);

    const handleSelectCustomer = async (customer: any) => {
        setSelectedCustomer(customer);
        setCustomerSearch(`${customer.id} - ${customer.name}`);
        setShowCustomerList(false);
        setIsLoadingAddresses(true);

        try {
            const result = await getCustomerAddresses(customer.id);
            setGpAddresses(result.addresses);
            setSelectedBillTo(result.billToId);
            setSelectedShipTo(result.shipToId);
        } catch (error) {
            console.error("Error fetching addresses:", error);
        } finally {
            setIsLoadingAddresses(false);
        }
    };

    const handleCustomerKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown" && showCustomerList) {
            e.preventDefault();
            setCustomerHighlightedIndex(prev => (prev + 1) % gpCustomers.length);
        } else if (e.key === "ArrowUp" && showCustomerList) {
            e.preventDefault();
            setCustomerHighlightedIndex(prev => (prev - 1 + gpCustomers.length) % gpCustomers.length);
        } else if (e.key === "Enter") {
            if (showCustomerList && gpCustomers[customerHighlightedIndex]) {
                handleSelectCustomer(gpCustomers[customerHighlightedIndex]);
            }
        }
    };

    const handleOrderKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown" && showOrderList) {
            e.preventDefault();
            setOrderHighlightedIndex(prev => (prev + 1) % gpOrders.length);
        } else if (e.key === "ArrowUp" && showOrderList) {
            e.preventDefault();
            setOrderHighlightedIndex(prev => (prev - 1 + gpOrders.length) % gpOrders.length);
        } else if (e.key === "Enter" && showOrderList && gpOrders[orderHighlightedIndex]) {
            handleSelectOrder(gpOrders[orderHighlightedIndex]);
        }
    };

    // Auto-scroll effects
    useEffect(() => {
        if (showSearchList && searchListRef.current) {
            const container = searchListRef.current;
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
    }, [highlightedIndex, showSearchList]);

    useEffect(() => {
        if (showCustomerList && customerSearchListRef.current) {
            const container = customerSearchListRef.current;
            const activeItem = container.children[customerHighlightedIndex] as HTMLElement;
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
    }, [customerHighlightedIndex, showCustomerList]);

    useEffect(() => {
        if (showOrderList && orderSearchListRef.current) {
            const container = orderSearchListRef.current;
            // The first child of orderSearchListRef is the header label, items start from index 1 (or 2 if there's a DB error message)
            // But if we map over gpOrders, we can use childNodes.
            // Let's use a more robust way: querySelector for a specific class or index.
            const items = container.querySelectorAll('.search-item');
            const activeItem = items[orderHighlightedIndex] as HTMLElement;
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
    }, [orderHighlightedIndex, showOrderList]);

    const handleSelectProduct = (product: any) => {
        setSelectedProduct(product);
        setSearchTerm(`${product.itemNumber} - ${product.description}`);
        setPrice(product.unitPrice.toFixed(2));
        setShowSearchList(false);
        quantityInputRef.current?.focus();
    };

    const handleAddItem = () => {
        if (!selectedProduct || !quantity || parseFloat(quantity) <= 0) return;

        const newItem: LineItem = {
            id: Math.random().toString(36).substring(2, 9),
            itemNumber: selectedProduct.itemNumber,
            description: selectedProduct.description,
            quantity: parseFloat(quantity),
            unitPrice: parseFloat(price),
            unitCost: selectedProduct.unitCost || 0,
            total: parseFloat(quantity) * parseFloat(price),
            uom: "EACH",
            siteId: defaultSiteId,
            priceLevel: "STD",
            shipToAddressId: selectedShipTo,
            markdown: 0
        };

        setItems([...items, newItem]);

        // Reset inputs
        setSearchTerm("");
        setQuantity("1");
        setPrice("0.00");
        setSelectedProduct(null);
        productInputRef.current?.focus();
    };

    const removeItem = (id: string) => {
        setItems(items.filter(item => item.id !== id));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown" && showSearchList) {
            e.preventDefault();
            setHighlightedIndex(prev => (prev + 1) % gpProducts.length);
        } else if (e.key === "ArrowUp" && showSearchList) {
            e.preventDefault();
            setHighlightedIndex(prev => (prev - 1 + gpProducts.length) % gpProducts.length);
        } else if (e.key === "Enter") {
            if (showSearchList && gpProducts[highlightedIndex]) {
                handleSelectProduct(gpProducts[highlightedIndex]);
            } else if (document.activeElement === priceInputRef.current) {
                handleAddItem();
            }
        }
    };

    const handleSelectOrder = async (order: any) => {
        setIsLoadingOrderDetails(true);
        setOrderSearch(order.id);
        setShowOrderList(false);
        try {
            const details = await getSalesOrderDetails(order.id, order.type);
            if (details) {
                // Set Customer
                if (details.customer) {
                    setSelectedCustomer(details.customer);
                    setCustomerSearch(`${details.customer.id} - ${details.customer.name}`);
                }

                // Fetch Addresses for this customer
                setIsLoadingAddresses(true);
                const addrResult = await getCustomerAddresses(details.header.customerId);
                setGpAddresses(addrResult.addresses);

                const formatDateForInput = (dateValue: any) => {
                    if (!dateValue) return "";
                    const d = new Date(dateValue);
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                };

                // Set Order Specifics
                setSelectedBillTo(details.header.billToId);
                setSelectedShipTo(details.header.shipToId);
                setDefaultSiteId(details.header.siteId);
                setPoNumber(details.header.poNumber);
                setTradeDiscount(details.header.tradeDiscount || 0);
                setLoadedOrderNumber(details.header.orderNumber);

                // Set modality based on order number prefix
                if (order.id.startsWith("USORD")) setModality("US");
                else if (order.id.startsWith("DRORD")) setModality("DR");
                else if (order.id.startsWith("CTORD")) setModality("mCT");

                // Auto-set Tax Exempt based on Schedule ID or if Tax is zero in GP
                const isExempt = (details.header.taxScheduleId || "").toUpperCase().includes("EXEMPT");
                setIsTaxExempt(isExempt);

                if (details.header.date) {
                    setOrderDate(formatDateForInput(details.header.date));
                }

                // Set items
                setItems(details.lines);
            } else {
                alert(`Order ${order.id} was not found when fetching details. It might have been deleted or moved.`);
            }
        } catch (error: any) {
            console.error("Error loading order:", error);
            alert(`Failed to load order ${order.id}. Check the console for DB details or try a different order.`);
        } finally {
            setIsLoadingOrderDetails(false);
            setIsLoadingAddresses(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="max-w-[1200px] mx-auto space-y-8 pb-20">
                {/* Overlay loading for full order fetching */}
                {isLoadingOrderDetails && (
                    <div className="fixed inset-0 bg-slate-900/10 backdrop-blur-[1px] z-[300] flex items-center justify-center">
                        <div className="bg-white p-6 rounded-2xl shadow-2xl border border-slate-200 flex flex-col items-center gap-3 animate-in fade-in zoom-in duration-300">
                            <Loader2 size={32} className="animate-spin text-primary" />
                            <p className="font-bold text-slate-900">Loading Order Data...</p>
                            <p className="text-xs text-slate-500">Retrieving GP records and lines</p>
                        </div>
                    </div>
                )}

                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold text-slate-900">Sales Order</h1>
                            {loadedOrderNumber && (
                                <span className="bg-primary/10 text-primary px-3 py-1 rounded-lg font-mono font-bold text-lg animate-in fade-in slide-in-from-left-2 duration-300">
                                    {loadedOrderNumber}
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-4 mt-2">
                            <div className="flex items-center gap-2">
                                {((["US", "DR", "mCT"] as const).map((m) => (
                                    <button
                                        key={m}
                                        onClick={() => setModality(m)}
                                        className={cn(
                                            "px-3 py-1 text-xs font-bold rounded-full transition-all border",
                                            modality === m
                                                ? "bg-primary text-white border-primary shadow-sm"
                                                : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                                        )}
                                    >
                                        {m === "US" ? "US - Ultrasound" : m === "DR" ? "DR - Digital Radiography" : "mCT - Mobile CT"}
                                    </button>
                                )))}
                            </div>

                            {/* Order Search Bar - Now aligned with modality buttons */}
                            <div className="relative w-[300px] order-search-container">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        value={orderSearch}
                                        onChange={(e) => {
                                            setOrderSearch(e.target.value);
                                            setOrderHighlightedIndex(0);
                                        }}
                                        onKeyDown={handleOrderKeyDown}
                                        placeholder="Search existing Order #..."
                                        className="w-full pl-9 pr-8 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-sm"
                                    />
                                    {isLoadingOrders && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                            <Loader2 size={14} className="animate-spin text-primary" />
                                        </div>
                                    )}
                                </div>

                                {showOrderList && (
                                    <div
                                        ref={orderSearchListRef}
                                        className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-2xl z-[150] max-h-60 overflow-auto py-1"
                                    >
                                        <p className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100">Found GP Orders</p>

                                        {orderSearchError && (
                                            <div className="px-3 py-2 bg-red-50 border-b border-red-100">
                                                <p className="text-[10px] text-red-600 font-medium">DB Note: {orderSearchError}</p>
                                            </div>
                                        )}

                                        {gpOrders.length > 0 ? (
                                            gpOrders.map((order, index) => (
                                                <div
                                                    key={order.id}
                                                    onClick={() => handleSelectOrder(order)}
                                                    className={cn(
                                                        "px-3 py-2 cursor-pointer hover:bg-slate-50 border-b border-slate-50 last:border-0 transition-colors group search-item",
                                                        orderHighlightedIndex === index && "bg-slate-100"
                                                    )}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <p className="font-bold text-slate-800 text-sm group-hover:text-primary transition-colors">{order.id}</p>
                                                        <History size={12} className="text-slate-300" />
                                                    </div>
                                                    <div className="flex justify-between items-center mt-0.5">
                                                        <p className="text-[11px] text-slate-500 font-medium truncate max-w-[180px]">{order.customerName}</p>
                                                        <div className="text-right">
                                                            {order.poNumber && <p className="text-[9px] text-primary font-bold">PO: {order.poNumber}</p>}
                                                            <p className="text-[10px] text-slate-400 font-mono italic">
                                                                {new Date(order.date).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="px-3 py-4 text-center">
                                                <p className="text-xs text-slate-500 font-medium">No GP orders found for "{orderSearch}"</p>
                                                <p className="text-[10px] text-slate-400 mt-1">Try a different Order # or Customer Name</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium">
                            Save as Draft
                        </button>
                        <button
                            onClick={async () => {
                                // Prepare data for Smart Connect
                                const payload = {
                                    orderNumber: loadedOrderNumber || `${modality === "US" ? "USORD" : modality === "DR" ? "DRORD" : "CTORD"}_XXXXXX`,
                                    isNewOrder: !loadedOrderNumber,
                                    modality,
                                    customer: selectedCustomer,
                                    billTo: selectedBillTo,
                                    shipTo: selectedShipTo,
                                    siteId: defaultSiteId,
                                    poNumber,
                                    orderDate,
                                    tradeDiscount,
                                    isTaxExempt,
                                    items: items.map(item => ({
                                        ...item,
                                        // Ensure site and ship-to are consistent
                                        siteId: item.siteId || defaultSiteId,
                                        shipToAddressId: item.shipToAddressId || selectedShipTo
                                    })),
                                    totals: {
                                        subtotal,
                                        tradeDiscount,
                                        tax,
                                        grandTotal
                                    }
                                };

                                console.log("[Smart Connect] Submitting Payload:", JSON.stringify(payload, null, 2));
                                alert(loadedOrderNumber ? "Changes saved (Payload logged to console)" : "New Order Created (Payload logged to console)");
                            }}
                            disabled={items.length === 0 || !selectedCustomer}
                            className="px-6 py-2 bg-primary text-white rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 disabled:shadow-none transition-all font-semibold flex items-center gap-2"
                        >
                            {loadedOrderNumber ? <Plus size={18} /> : <CheckCircle2 size={18} />}
                            {loadedOrderNumber ? "Save" : "Create Order"}
                        </button>
                    </div>
                </div>

                {/* Line Item Detail Modal */}
                {isModalOpen && editingItem && (
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4 overflow-y-auto">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                    <Settings className="text-primary" size={20} />
                                    Line Item Details: {editingItem.itemNumber}
                                </h3>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
                                    <X size={20} className="text-slate-500" />
                                </button>
                            </div>
                            <div className="p-6 grid grid-cols-2 gap-6">
                                <div className="col-span-2 p-3 bg-primary/5 rounded-lg border border-primary/10">
                                    <p className="text-xs font-bold text-primary uppercase">Description</p>
                                    <p className="text-sm text-slate-700 font-medium">{editingItem.description}</p>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Site ID (LOCNCODE)</label>
                                    <select
                                        value={editingItem.siteId}
                                        onChange={(e) => setEditingItem({ ...editingItem, siteId: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                    >
                                        {sites.map(site => (
                                            <option key={site.id} value={site.id}>{site.id} - {site.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">U of M</label>
                                    <select
                                        value={editingItem.uom}
                                        onChange={(e) => setEditingItem({ ...editingItem, uom: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                    >
                                        <option value="EACH">EACH</option>
                                        <option value="BOX">BOX</option>
                                        <option value="CASE">CASE</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Price Level</label>
                                    <select
                                        value={editingItem.priceLevel}
                                        onChange={(e) => setEditingItem({ ...editingItem, priceLevel: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                    >
                                        <option value="STD">STD - Standard</option>
                                        <option value="DIST">DIST - Distributor</option>
                                        <option value="RETAIL">RETAIL - Retail</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Ship To Address ID</label>
                                    <select
                                        value={editingItem.shipToAddressId}
                                        onChange={(e) => setEditingItem({ ...editingItem, shipToAddressId: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                    >
                                        <option value="">Select Address...</option>
                                        {gpAddresses.map(addr => (
                                            <option key={addr.id} value={addr.id}>{addr.id}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-span-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Unit Price</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                                        <input
                                            type="number"
                                            value={editingItem.unitPrice}
                                            onChange={(e) => setEditingItem({ ...editingItem, unitPrice: parseFloat(e.target.value) || 0, total: (parseFloat(e.target.value) || 0) * editingItem.quantity })}
                                            className={cn(
                                                "w-full pl-7 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none",
                                                editingItem.unitPrice < editingItem.unitCost && "text-red-500 font-bold border-red-200 bg-red-50"
                                            )}
                                        />
                                    </div>
                                    {editingItem.unitPrice < editingItem.unitCost && (
                                        <p className="text-[10px] text-red-500 font-bold mt-1 uppercase">Warning: Negative Margin (Cost: ${editingItem.unitCost.toFixed(2)})</p>
                                    )}
                                </div>

                                <div className="col-span-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Markdown</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                                        <input
                                            type="number"
                                            value={editingItem.markdown}
                                            onChange={(e) => setEditingItem({ ...editingItem, markdown: parseFloat(e.target.value) || 0 })}
                                            className="w-full pl-7 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        setItems(items.map(i => i.id === editingItem.id ? editingItem : i));
                                        setIsModalOpen(false);
                                    }}
                                    className="px-6 py-2 bg-primary text-white rounded-lg font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
                                >
                                    Apply Changes
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card title="Customer Information" icon={<User size={18} className="text-primary" />}>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Search Customer</label>
                                <div className="relative customer-search-container">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        value={customerSearch}
                                        onChange={(e) => {
                                            setCustomerSearch(e.target.value);
                                            setShowCustomerList(true);
                                            setCustomerHighlightedIndex(0);
                                            if (selectedCustomer) setSelectedCustomer(null);
                                        }}
                                        onFocus={() => setShowCustomerList(true)}
                                        onKeyDown={handleCustomerKeyDown}
                                        placeholder="Type to search GP customers..."
                                        className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                    />
                                    {isLoadingCustomers && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                            <Loader2 size={18} className="animate-spin text-primary" />
                                        </div>
                                    )}
                                    {showCustomerList && customerSearch && gpCustomers.length > 0 && (
                                        <div
                                            ref={customerSearchListRef}
                                            className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-2xl z-[100] max-h-60 overflow-auto"
                                        >
                                            {gpCustomers.map((customer, index) => (
                                                <div
                                                    key={customer.id}
                                                    onClick={() => handleSelectCustomer(customer)}
                                                    className={cn(
                                                        "px-4 py-3 cursor-pointer hover:bg-slate-50 flex items-center justify-between transition-colors outline-none",
                                                        customerHighlightedIndex === index && "bg-slate-100"
                                                    )}
                                                >
                                                    <div>
                                                        <p className="font-bold text-slate-900">{customer.id}</p>
                                                        <p className="text-xs text-slate-500 font-medium">{customer.name}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            {selectedCustomer && (
                                <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1">
                                    <div className="col-span-1">
                                        <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Bill To ID</label>
                                        <select
                                            value={selectedBillTo}
                                            onChange={(e) => setSelectedBillTo(e.target.value)}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20"
                                        >
                                            <option value="">Select Address...</option>
                                            {gpAddresses.map(addr => (
                                                <option key={addr.id} value={addr.id}>{addr.id}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-span-1">
                                        <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Ship To ID</label>
                                        <select
                                            value={selectedShipTo}
                                            onChange={(e) => {
                                                const newShipTo = e.target.value;
                                                setSelectedShipTo(newShipTo);

                                                // Update Tax Exempt status based on the selected address's Tax Schedule ID
                                                const addr = gpAddresses.find(a => a.id === newShipTo);
                                                if (addr) {
                                                    const isExempt = (addr.taxScheduleId || "").toUpperCase().includes("EXEMPT");
                                                    setIsTaxExempt(isExempt);
                                                }

                                                // Update all line items to use the new ship-to
                                                setItems(items.map(item => ({
                                                    ...item,
                                                    shipToAddressId: newShipTo
                                                })));
                                            }}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20"
                                        >
                                            <option value="">Select Address...</option>
                                            {gpAddresses.map(addr => (
                                                <option key={addr.id} value={addr.id}>{addr.id}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-span-2 space-y-3">
                                        {isLoadingAddresses ? (
                                            <div className="flex items-center justify-center py-4 text-slate-400 gap-2">
                                                <Loader2 size={16} className="animate-spin" />
                                                <span className="text-xs font-medium">Loading addresses...</span>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                                    <p className="text-xs font-bold text-slate-400 uppercase">Selected Bill-To Address</p>
                                                    <div className="text-sm text-slate-600 mt-1">
                                                        {(() => {
                                                            const addr = gpAddresses.find(a => a.id === selectedBillTo);
                                                            if (!addr) return "No address selected";
                                                            return `${addr.address1} ${addr.address2 ? ` ${addr.address2}` : ''}, ${addr.city}, ${addr.state} ${addr.zip}`;
                                                        })()}
                                                    </div>
                                                </div>
                                                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                                    <p className="text-xs font-bold text-slate-400 uppercase">Selected Ship-To Address</p>
                                                    <div className="text-sm text-slate-600 mt-1">
                                                        {(() => {
                                                            const addr = gpAddresses.find(a => a.id === selectedShipTo);
                                                            if (!addr) return "No address selected";
                                                            return `${addr.address1} ${addr.address2 ? ` ${addr.address2}` : ''}, ${addr.city}, ${addr.state} ${addr.zip}`;
                                                        })()}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>

                    <Card title="Order Details" icon={<ArrowRight size={18} className="text-primary" />}>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-slate-700 mb-1.5 block">PO #</label>
                                <input
                                    type="text"
                                    value={poNumber}
                                    onChange={(e) => setPoNumber(e.target.value)}
                                    placeholder="Customer Purchase Order #"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Order Date</label>
                                <input
                                    type="date"
                                    value={orderDate}
                                    onChange={(e) => setOrderDate(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                />
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Default Site ID</label>
                                <select
                                    value={defaultSiteId}
                                    onChange={(e) => {
                                        const newSiteId = e.target.value;
                                        setDefaultSiteId(newSiteId);
                                        // Update all line items to use the new site ID
                                        setItems(items.map(item => ({
                                            ...item,
                                            siteId: newSiteId
                                        })));
                                    }}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                >
                                    {sites.map(site => (
                                        <option key={site.id} value={site.id}>{site.id} - {site.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Payment Terms</label>
                                <select
                                    defaultValue="Net 30"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                >
                                    <option>Prepaid</option>
                                    <option>Net 15</option>
                                    <option>Net 30</option>
                                    <option>Net 45</option>
                                    <option>Net 60</option>
                                    <option>Net 90</option>
                                    <option>Net 180</option>
                                    <option>Net 90</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Shipping Method</label>
                                <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none">
                                    <option>Standard Ground</option>
                                    <option>Next Day Air</option>
                                    <option>Pick-up</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Shipping Terms</label>
                                <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none">
                                    <option>F.O.B. Origin</option>
                                    <option>F.O.B. Destination</option>
                                </select>
                            </div>
                            <div className="col-span-2">
                                <label className="flex items-center gap-2 cursor-pointer mt-2">
                                    <input
                                        type="checkbox"
                                        checked={isTaxExempt}
                                        onChange={(e) => setIsTaxExempt(e.target.checked)}
                                        className="w-4 h-4 rounded text-primary focus:ring-primary"
                                    />
                                    <span className="text-sm font-medium text-slate-700">Tax Exempt Status</span>
                                </label>
                                {isTaxExempt && shipToState && (
                                    <p className="text-xs font-bold text-red-500 mt-2 animate-pulse">
                                        ⚠️ Tax Exempt Certificate issued by State of {shipToState} is required
                                    </p>
                                )}
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Quick Entry Section */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                    <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                            <ShoppingCart size={18} className="text-primary" />
                            Line Items
                        </h2>
                    </div>

                    {/* Input Row */}
                    <div className="p-4 grid grid-cols-12 gap-4 items-end border-b border-slate-100">
                        <div className="col-span-5 relative">
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Product (Item Number - Description)</label>
                            <div className="relative">
                                <input
                                    ref={productInputRef}
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setShowSearchList(true);
                                        if (selectedProduct) setSelectedProduct(null);
                                    }}
                                    onFocus={() => setShowSearchList(true)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Search GP products..."
                                    className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none shadow-sm"
                                />
                                {isLoadingProducts && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <Loader2 size={18} className="animate-spin text-primary" />
                                    </div>
                                )}
                                {showSearchList && searchTerm && gpProducts.length > 0 && (
                                    <div
                                        ref={searchListRef}
                                        className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-2xl z-[100] max-h-60 overflow-auto"
                                    >
                                        {gpProducts.map((product, index) => (
                                            <div
                                                key={product.itemNumber}
                                                onClick={() => handleSelectProduct(product)}
                                                className={cn(
                                                    "px-4 py-3 cursor-pointer hover:bg-slate-50 flex items-center justify-between transition-colors",
                                                    highlightedIndex === index && "bg-slate-100"
                                                )}
                                            >
                                                <div className="flex-1">
                                                    <p className="font-bold text-slate-900">{product.itemNumber}</p>
                                                    <p className="text-xs text-slate-500 font-medium">{product.description}</p>
                                                </div>
                                                {product.inventory && (
                                                    <div className="text-right ml-4">
                                                        <p className="text-[10px] font-bold text-slate-500 uppercase leading-none mb-1">
                                                            Stock: {product.inventory.onHand}
                                                        </p>
                                                        <p className={cn(
                                                            "text-xs font-bold leading-none",
                                                            product.inventory.available > 0 ? "text-emerald-600" : "text-rose-500"
                                                        )}>
                                                            Avail: {product.inventory.available}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-span-2">
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Quantity</label>
                            <input
                                ref={quantityInputRef}
                                type="number"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && priceInputRef.current?.focus()}
                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none shadow-sm"
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Price</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                                <input
                                    ref={priceInputRef}
                                    type="text"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    className={cn(
                                        "w-full pl-7 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none shadow-sm",
                                        selectedProduct && parseFloat(price) < selectedProduct.unitCost && "text-red-500 font-bold border-red-200 bg-red-50"
                                    )}
                                />
                            </div>
                        </div>

                        <div className="col-span-2">
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Total</label>
                            <div className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 font-mono text-right">
                                ${formatCurrency(parseFloat(quantity || "0") * parseFloat(price || "0"))}
                            </div>
                        </div>

                        <div className="col-span-1">
                            <button
                                onClick={handleAddItem}
                                className="w-full py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center"
                            >
                                <Plus size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Table Area */}
                    <div className="min-h-[300px]">
                        {items.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full py-20 text-slate-400">
                                <Package size={48} strokeWidth={1} />
                                <p className="mt-4 font-medium">No items added yet.</p>
                                <p className="text-sm">Start by searching for a product above.</p>
                            </div>
                        ) : (
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-100">
                                        <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Item Number</th>
                                        <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Description</th>
                                        <th className="text-center py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Qty</th>
                                        <th className="text-right py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Unit Price</th>
                                        <th className="text-right py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Total</th>
                                        <th className="text-center py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {items.map((item) => (
                                        <tr
                                            key={item.id}
                                            onClick={() => {
                                                setEditingItem({ ...item });
                                                setIsModalOpen(true);
                                            }}
                                            className="hover:bg-primary/5 transition-colors cursor-pointer group"
                                        >
                                            <td className="py-4 px-4 font-medium text-slate-900">{item.itemNumber}</td>
                                            <td className="py-4 px-4 text-slate-600">{item.description}</td>
                                            <td className="py-4 px-4 text-center text-slate-900 font-medium">{item.quantity}</td>
                                            <td className={cn(
                                                "py-4 px-4 text-right font-mono text-sm font-medium",
                                                item.unitPrice < item.unitCost ? "text-red-600" : "text-slate-600"
                                            )}>
                                                ${formatCurrency(item.unitPrice)}
                                                {item.unitPrice < item.unitCost && (
                                                    <span className="ml-1 text-[9px] bg-red-100 px-1 py-0.5 rounded text-red-700 font-bold uppercase">Margin</span>
                                                )}
                                            </td>
                                            <td className="py-4 px-4 text-right font-bold text-slate-900 font-mono">${formatCurrency(item.total)}</td>
                                            <td className="py-4 px-4 text-center">
                                                <div className="flex items-center justify-center">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            removeItem(item.id);
                                                        }}
                                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all rounded opacity-0 group-hover:opacity-100"
                                                        title="Remove Item"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Calculations Footer */}
                    <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex justify-end">
                        <div className="w-64 space-y-3">
                            <div className="flex justify-between text-slate-500">
                                <span>Subtotal</span>
                                <span className="font-mono">${formatCurrency(subtotal)}</span>
                            </div>
                            {tradeDiscount >= 0 && (
                                <div className="flex justify-between items-center text-primary font-medium">
                                    <span>Trade Discount</span>
                                    <div className="relative w-32">
                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px]">$</span>
                                        <input
                                            type="number"
                                            value={tradeDiscount}
                                            onChange={(e) => setTradeDiscount(parseFloat(e.target.value) || 0)}
                                            className="w-full pl-5 pr-2 py-1 bg-primary/5 border border-primary/20 rounded text-right font-mono text-sm focus:ring-1 focus:ring-primary outline-none"
                                        />
                                    </div>
                                </div>
                            )}
                            <div className="flex justify-between text-slate-500">
                                <span>Tax {isTaxExempt ? "(Exempt)" : "(8.25%)"}</span>
                                <span className="font-mono">${formatCurrency(tax)}</span>
                            </div>
                            <div className="flex justify-between pt-3 border-t border-slate-200">
                                <span className="font-bold text-slate-900 text-lg">Grand Total</span>
                                <span className="font-bold text-primary text-xl font-mono">${formatCurrency(grandTotal)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

function Card({
    title,
    children,
    icon
}: {
    title: string;
    children: React.ReactNode;
    icon?: React.ReactNode;
}) {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 relative">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/30 flex items-center gap-2">
                {icon}
                <h3 className="font-semibold text-slate-800">{title}</h3>
            </div>
            <div className="p-6">
                {children}
            </div>
        </div>
    );
}
