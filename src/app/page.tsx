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

interface LineItem {
    id: string;
    itemNumber: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
    uom: string;
    siteId: string;
    priceLevel: string;
    shipToAddressId: string;
    markdown: number;
}

const SAMPLE_CUSTOMERS = [
    {
        id: "ADVANCED0001",
        name: "Advanced Office Systems",
        billToAddresses: [
            { id: "PRIMARY", address: "123 Industrial Way, Chicago, IL", state: "IL" },
            { id: "HQ", address: "One Advanced Plaza, Chicago, IL", state: "IL" }
        ],
        shipToAddresses: [
            { id: "WAREHOUSE 1", address: "44 Logistics Dr, Joliet, IL", state: "IL" },
            { id: "NORTH OFFICE", address: "888 Skyline Blvd, Evanston, IL", state: "IL" }
        ]
    },
    {
        id: "DLA",
        name: "DLA TROOP SUPPORT",
        billToAddresses: [
            { id: "DEF FIN AND ACC", address: "PO BOX 182317, Columbus, OH", state: "OH" }
        ],
        shipToAddresses: [
            { id: "FITZSIMMONS", address: "700 Robbins Ave, Philadelphia, PA", state: "PA" },
            { id: "NAVAL BEAUFORT", address: "Dist. Port 44, Beaufort, SC", state: "SC" }
        ]
    },
    {
        id: "CITYPW0001",
        name: "City Power and Light",
        billToAddresses: [{ id: "PRIMARY", address: "789 Energy Ave, New York, NY", state: "NY" }],
        shipToAddresses: [{ id: "PLANT 1", address: "100 Power St, Queens, NY", state: "NY" }]
    },
];

const SAMPLE_PRODUCTS = [
    { itemNumber: "100XLG", description: "Large Monitor Stand", unitPrice: 45.00 },
    { itemNumber: "128 SDRAM", description: "128MB SDRAM Memory Module", unitPrice: 125.00 },
    { itemNumber: "24X IDE", description: "24X IDE CD-ROM Drive", unitPrice: 85.00 },
    { itemNumber: "32MB SDRAM", description: "32MB SDRAM Memory Module", unitPrice: 65.00 },
    { itemNumber: "400MB HD", description: "400MB IDE Hard Drive", unitPrice: 150.00 },
    { itemNumber: "4MB VRAM", description: "4MB VRAM Video Upgrade", unitPrice: 35.00 },
    { itemNumber: "6-FT CABLE", description: "6-FT Parallel Printer Cable", unitPrice: 12.00 },
    { itemNumber: "8MB VRAM", description: "8MB VRAM Video Upgrade", unitPrice: 55.00 },
    { itemNumber: "ACCT-AMR", description: "Amortization Software Package", unitPrice: 299.00 },
    { itemNumber: "ACCT-PAY", description: "Accounts Payable Module", unitPrice: 499.00 },
    { itemNumber: "CABLE-MOD", description: "High Speed Cable Modem", unitPrice: 110.00 },
    { itemNumber: "CPU-P200", description: "Pentium 200MHz Processor", unitPrice: 195.00 },
    { itemNumber: "USS-M7ENN1C/US", description: "HM70EVO, Non, USA*1.02", unitPrice: 1101.09 },
    { itemNumber: "USP-C04AN2A/WR", description: "CA4-10M, MINI2DLP, 128EL, 14R", unitPrice: 668.70 },
    { itemNumber: "USP-V02AN1B/WR", description: "EV2-10A", unitPrice: 2226.23 },
    { itemNumber: "USP-EN2BF1B/WR", description: "EA2-11AV/192EL,DLP408,WR", unitPrice: 984.78 },
    { itemNumber: "USP-PF15N0A/WR", description: "PA1-5AE,80EL,MINI2DLP*EXP", unitPrice: 278.80 },
    { itemNumber: "USP-LF3MN2A/WR", description: "L3-22,192EL,SM, MINIDLP, EXP", unitPrice: 667.45 },
];

export default function SalesOrderPage() {
    const [items, setItems] = useState<LineItem[]>([]);
    const [customerSearch, setCustomerSearch] = useState("");
    const [selectedCustomer, setSelectedCustomer] = useState<typeof SAMPLE_CUSTOMERS[0] | null>(null);
    const [showCustomerList, setShowCustomerList] = useState(false);
    const [customerHighlightedIndex, setCustomerHighlightedIndex] = useState(0);

    const [searchTerm, setSearchTerm] = useState("");
    const [quantity, setQuantity] = useState<string>("1");
    const [price, setPrice] = useState<string>("0.00");
    const [selectedProduct, setSelectedProduct] = useState<typeof SAMPLE_PRODUCTS[0] | null>(null);
    const [showSearchList, setShowSearchList] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(0);

    const [selectedBillTo, setSelectedBillTo] = useState<string>("");
    const [selectedShipTo, setSelectedShipTo] = useState<string>("");

    const [editingItem, setEditingItem] = useState<LineItem | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isTaxExempt, setIsTaxExempt] = useState(false);

    const productInputRef = useRef<HTMLInputElement>(null);
    const quantityInputRef = useRef<HTMLInputElement>(null);
    const priceInputRef = useRef<HTMLInputElement>(null);
    const searchListRef = useRef<HTMLDivElement>(null);

    const filteredCustomers = SAMPLE_CUSTOMERS.filter(c =>
        c.id.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.name.toLowerCase().includes(customerSearch.toLowerCase())
    );

    const filteredProducts = SAMPLE_PRODUCTS.filter(p =>
        p.itemNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const subtotal = items.reduce((acc, item) => acc + item.total, 0);
    const tax = isTaxExempt ? 0 : subtotal * 0.0825; // Example 8.25%, 0 if exempt
    const grandTotal = subtotal + tax;

    const currentShipToAddress = selectedCustomer?.shipToAddresses.find(a => a.id === selectedShipTo);
    const shipToState = currentShipToAddress?.state || "";

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!productInputRef.current?.contains(event.target as Node) && !searchListRef.current?.contains(event.target as Node)) {
                setShowSearchList(false);
            }
            if (showCustomerList && !(event.target as HTMLElement).closest('.customer-search-container')) {
                setShowCustomerList(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [showCustomerList]);

    const handleSelectCustomer = (customer: typeof SAMPLE_CUSTOMERS[0]) => {
        setSelectedCustomer(customer);
        setCustomerSearch(`${customer.id} - ${customer.name}`);
        setSelectedBillTo(customer.billToAddresses[0]?.id || "");
        setSelectedShipTo(customer.shipToAddresses[0]?.id || "");
        setShowCustomerList(false);
    };

    const handleCustomerKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown" && showCustomerList) {
            e.preventDefault();
            setCustomerHighlightedIndex(prev => (prev + 1) % filteredCustomers.length);
        } else if (e.key === "ArrowUp" && showCustomerList) {
            e.preventDefault();
            setCustomerHighlightedIndex(prev => (prev - 1 + filteredCustomers.length) % filteredCustomers.length);
        } else if (e.key === "Enter") {
            if (showCustomerList && filteredCustomers[customerHighlightedIndex]) {
                handleSelectCustomer(filteredCustomers[customerHighlightedIndex]);
            }
        }
    };

    const handleSelectProduct = (product: typeof SAMPLE_PRODUCTS[0]) => {
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
            total: parseFloat(quantity) * parseFloat(price),
            uom: "EACH",
            siteId: "MAIN",
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
            setHighlightedIndex(prev => (prev + 1) % filteredProducts.length);
        } else if (e.key === "ArrowUp" && showSearchList) {
            e.preventDefault();
            setHighlightedIndex(prev => (prev - 1 + filteredProducts.length) % filteredProducts.length);
        } else if (e.key === "Enter") {
            if (showSearchList && filteredProducts[highlightedIndex]) {
                handleSelectProduct(filteredProducts[highlightedIndex]);
            } else if (document.activeElement === priceInputRef.current) {
                handleAddItem();
            }
        }
    };

    return (
        <div className="flex min-h-screen bg-[#F8FAFC]">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
                <div className="p-6">
                    <div className="flex items-center gap-2 text-primary font-bold text-xl">
                        <Package className="w-6 h-6" />
                        <span>GP Connect</span>
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-1">
                    <SidebarItem icon={<LayoutDashboard size={20} />} label="Dashboard" />
                    <SidebarItem icon={<ShoppingCart size={20} />} label="Sales Orders" active />
                    <SidebarItem icon={<User size={20} />} label="Customers" />
                    <SidebarItem icon={<Package size={20} />} label="Inventory" />
                </nav>

                <div className="p-4 border-t border-slate-100">
                    <button className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors w-full px-4 py-2">
                        <LogOut size={20} />
                        <span className="font-medium">Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10">
                    <div className="flex items-center gap-2 text-slate-500 uppercase tracking-wider text-xs font-semibold">
                        <span>Sales</span>
                        <ChevronRight size={14} />
                        <span className="text-slate-900">Create New Order</span>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-right mr-4">
                            <p className="text-sm font-medium text-slate-900">John Doe</p>
                            <p className="text-xs text-slate-500">Sales Representative</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                            JD
                        </div>
                    </div>
                </header>

                <div className="p-8 max-w-6xl mx-auto space-y-8">
                    <div className="flex justify-between items-end">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">Sales Order</h1>
                            <p className="text-slate-500 mt-1">Fill in the details below to create a new SO.</p>
                        </div>
                        <div className="flex gap-3">
                            <button className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium">
                                Save as Draft
                            </button>
                            <button
                                onClick={() => alert("Order Created Successfully!")}
                                disabled={items.length === 0}
                                className="px-6 py-2 bg-primary text-white rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 disabled:shadow-none transition-all font-semibold flex items-center gap-2"
                            >
                                <CheckCircle2 size={18} />
                                Create Order
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
                                            <option value="MAIN">MAIN - Main Warehouse</option>
                                            <option value="F.G. ULTRA">F.G. ULTRA - Production</option>
                                            <option value="NORTH">NORTH - North Branch</option>
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
                                            {selectedCustomer?.shipToAddresses.map(addr => (
                                                <option key={addr.id} value={addr.id}>{addr.id}</option>
                                            ))}
                                        </select>
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

                    {/* Form Sections */}
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
                                            }}
                                            onFocus={() => setShowCustomerList(true)}
                                            onKeyDown={handleCustomerKeyDown}
                                            placeholder="ID or Name..."
                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                        />
                                        {showCustomerList && customerSearch && filteredCustomers.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-2xl z-[100] max-h-60 overflow-auto">
                                                {filteredCustomers.map((customer, index) => (
                                                    <div
                                                        key={customer.id}
                                                        onClick={() => handleSelectCustomer(customer)}
                                                        className={cn(
                                                            "px-4 py-3 cursor-pointer hover:bg-slate-50 flex items-center justify-between transition-colors",
                                                            customerHighlightedIndex === index && "bg-slate-100"
                                                        )}
                                                    >
                                                        <div>
                                                            <p className="font-semibold text-slate-900">{customer.id}</p>
                                                            <p className="text-xs text-slate-500">{customer.name}</p>
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
                                                {selectedCustomer.billToAddresses.map(addr => (
                                                    <option key={addr.id} value={addr.id}>{addr.id}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="col-span-1">
                                            <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Ship To ID</label>
                                            <select
                                                value={selectedShipTo}
                                                onChange={(e) => setSelectedShipTo(e.target.value)}
                                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20"
                                            >
                                                {selectedCustomer.shipToAddresses.map(addr => (
                                                    <option key={addr.id} value={addr.id}>{addr.id}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="col-span-2 space-y-3">
                                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                                <p className="text-xs font-bold text-slate-400 uppercase">Selected Bill-To Address</p>
                                                <p className="text-sm text-slate-600 mt-1">
                                                    {selectedCustomer.billToAddresses.find(a => a.id === selectedBillTo)?.address}
                                                </p>
                                            </div>
                                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                                <p className="text-xs font-bold text-slate-400 uppercase">Selected Ship-To Address</p>
                                                <p className="text-sm text-slate-600 mt-1">
                                                    {selectedCustomer.shipToAddresses.find(a => a.id === selectedShipTo)?.address}
                                                </p>
                                            </div>
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
                                        placeholder="Customer Purchase Order #"
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-700 mb-1.5 block">Order Date</label>
                                    <input
                                        type="date"
                                        defaultValue={new Date().toISOString().split('T')[0]}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                    />
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
                                        }}
                                        onFocus={() => setShowSearchList(true)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Search product..."
                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none shadow-sm"
                                    />
                                    {showSearchList && searchTerm && filteredProducts.length > 0 && (
                                        <div
                                            ref={searchListRef}
                                            className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-2xl z-[100] max-h-60 overflow-auto"
                                        >
                                            {filteredProducts.map((product, index) => (
                                                <div
                                                    key={product.itemNumber}
                                                    onClick={() => handleSelectProduct(product)}
                                                    className={cn(
                                                        "px-4 py-3 cursor-pointer hover:bg-slate-50 flex items-center justify-between transition-colors",
                                                        highlightedIndex === index && "bg-slate-100"
                                                    )}
                                                >
                                                    <div>
                                                        <p className="font-semibold text-slate-900">{product.itemNumber}</p>
                                                        <p className="text-xs text-slate-500">{product.description}</p>
                                                    </div>
                                                    <p className="text-sm font-mono text-primary">${product.unitPrice.toFixed(2)}</p>
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
                                        className="w-full pl-7 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none shadow-sm"
                                    />
                                </div>
                            </div>

                            <div className="col-span-2">
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Total</label>
                                <div className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 font-mono">
                                    ${(parseFloat(quantity || "0") * parseFloat(price || "0")).toFixed(2)}
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
                                            <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="py-4 px-4 font-medium text-slate-900">{item.itemNumber}</td>
                                                <td className="py-4 px-4 text-slate-600">{item.description}</td>
                                                <td className="py-4 px-4 text-center text-slate-900 font-medium">{item.quantity}</td>
                                                <td className="py-4 px-4 text-right text-slate-600 font-mono">${item.unitPrice.toFixed(2)}</td>
                                                <td className="py-4 px-4 text-right font-bold text-slate-900 font-mono">${item.total.toFixed(2)}</td>
                                                <td className="py-4 px-4 text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button
                                                            onClick={() => {
                                                                setEditingItem({ ...item });
                                                                setIsModalOpen(true);
                                                            }}
                                                            className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 transition-all rounded"
                                                            title="Line Details"
                                                        >
                                                            <Settings size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => removeItem(item.id)}
                                                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all rounded"
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
                                    <span className="font-mono">${subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-slate-500">
                                    <span>Tax (8.25%)</span>
                                    <span className="font-mono">${tax.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between pt-3 border-t border-slate-200">
                                    <span className="font-bold text-slate-900 text-lg">Grand Total</span>
                                    <span className="font-bold text-primary text-xl font-mono">${grandTotal.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

function SidebarItem({
    icon,
    label,
    active = false
}: {
    icon: React.ReactNode;
    label: string;
    active?: boolean;
}) {
    return (
        <button
            className={cn(
                "flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all font-medium",
                active
                    ? "bg-primary text-white shadow-lg shadow-primary/20"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            )}
        >
            {icon}
            <span>{label}</span>
        </button>
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
