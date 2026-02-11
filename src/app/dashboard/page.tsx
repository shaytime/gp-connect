import DashboardLayout from "@/components/DashboardLayout";

export default function DashboardPage() {
    return (
        <DashboardLayout breadcrumbs={[{ label: "Overview" }, { label: "Dashboard" }]}>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
                    <p className="text-slate-500 mt-1">Overview of your sales performance and metrics.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <p className="text-sm font-medium text-slate-500">Total Orders</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">1,284</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <p className="text-sm font-medium text-slate-500">Total Revenue</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">$452,190.00</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <p className="text-sm font-medium text-slate-500">Active Customers</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">842</p>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm h-64 flex items-center justify-center text-slate-400">
                    Charts and Graphs placeholder
                </div>
            </div>
        </DashboardLayout>
    );
}
