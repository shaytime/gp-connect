"use client";

import { signIn } from "next-auth/react";
import { Package, ShieldCheck, ArrowRight, Microsoft } from "lucide-react";

export default function LoginPage() {
    return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.05),transparent),radial-gradient(circle_at_bottom_left,rgba(37,99,235,0.05),transparent)]">
            <div className="w-full max-w-md">
                <div className="flex flex-col items-center mb-10 text-center">
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-xl shadow-primary/10 flex items-center justify-center mb-6 border border-slate-100">
                        <Package className="w-10 h-10 text-primary" />
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">GP Connect</h1>
                    <p className="text-slate-500 mt-2 font-medium">Enterprise Sales Management Portal</p>
                </div>

                <div className="bg-white rounded-3xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100">
                    <div className="mb-8">
                        <h2 className="text-xl font-bold text-slate-900">Sign In</h2>
                        <p className="text-sm text-slate-500 mt-1">Access restricted to authorized personnel.</p>
                    </div>

                    <div className="space-y-4">
                        <button
                            onClick={() => signIn("microsoft-entra-id")}
                            className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-3 shadow-xl shadow-slate-900/10 group"
                        >
                            <div className="w-6 h-6 flex items-center justify-center">
                                <svg width="21" height="21" viewBox="0 0 21 21"><rect x="1" y="1" width="9" height="9" fill="#f25022" /><rect x="11" y="1" width="9" height="9" fill="#7fbb00" /><rect x="1" y="11" width="9" height="9" fill="#00a1f1" /><rect x="11" y="11" width="9" height="9" fill="#ffbb00" /></svg>
                            </div>
                            Sign in with Microsoft
                            <ArrowRight size={18} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                        </button>

                        <div className="relative py-4">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-100"></div>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase tracking-widest font-bold text-slate-300 bg-white px-4">
                                Internal Use Only
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-4">
                            <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center shrink-0">
                                <ShieldCheck className="text-green-500" size={20} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-800">Secure Access</p>
                                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                                    Automatic Windows SSO & Corporate MFA required.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <p className="mt-8 text-center text-xs text-slate-400 font-medium">
                    © 2026 Next Logistics Corp. All rights reserved.
                </p>
            </div>
        </div>
    );
}
