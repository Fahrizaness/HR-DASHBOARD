"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Poppins, Inter } from "next/font/google";
import {
    LayoutDashboard, Users, Building, FileSignature, CalendarClock, Calculator, 
    ClipboardList, UserCog, Wallet, Banknote, Trophy, PanelLeftClose, PanelLeftOpen, 
    MessageSquareQuote, Settings, LogOut, BarChart, ArrowLeft, 
    Activity, Map, ShieldCheck, Bell, Star, ArrowRight, User, CheckCircle, Clock, MapPin
} from "lucide-react";

// Konfigurasi Font
const poppins = Poppins({ 
    subsets: ["latin"], 
    weight: ["400", "500", "600", "700", "800", "900"],
    variable: '--font-poppins',
    display: 'swap',
});

const inter = Inter({
    subsets: ["latin"],
    variable: '--font-inter',
    display: 'swap',
});

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        toast.success("Berhasil Keluar");
        router.replace('/login'); 
        router.refresh();
    };

    // === DEFINISI DATA MENU ===
    const allMenuGroups = [
        {
            id: "penilaian",
            title: "PENILAIAN",
            matchPaths: ["/admin/dashboard-penilaian", "/admin/periods", "/admin/weights", "/admin/incentives", "/admin/feedback", "/admin/settings"],
            items: [
                { label: "Dashboard Kinerja", href: "/admin/dashboard-penilaian", icon: LayoutDashboard },
                { label: "Periode", href: "/admin/periods", icon: CalendarClock },
                { label: "Bobot Nilai", href: "/admin/weights", icon: Calculator },
                { label: "Aturan Insentif", href: "/admin/incentives", icon: Trophy },
                { label: "Rekap Feedback", href: "/admin/feedback", icon: MessageSquareQuote },
                { label: "Pengaturan", href: "/admin/settings", icon: Settings },
            ]
        },
        {
            id: "penggajian",
            title: "PENGGAJIAN",
            matchPaths: ["/admin/attendance", "/admin/cash-advances", "/admin/payroll"],
            items: [
                { label: "Data Absensi", href: "/admin/attendance", icon: ClipboardList },
                { label: "Kasbon", href: "/admin/cash-advances", icon: Wallet },
                { label: "Penggajian", href: "/admin/payroll", icon: Banknote },
                { label: "Analitik Gaji", href: "/admin/payroll/analytics", icon: BarChart }, 
            ]
        },
        {
            id: "administrasi",
            title: "DATA ADMINISTRASI",
            matchPaths: ["/admin/dashboard", "/admin/crew", "/admin/outlets", "/admin/contracts"],
            items: [
                { label: "Analisis Turnover", href: "/admin/dashboard", icon: Activity },
                { label: "Approval Kandidat", href: "/admin/crew/approvals", icon: FileSignature },
                { label: "Data Kru", href: "/admin/crew", icon: Users },
                { label: "Outlet", href: "/admin/outlets", icon: Building },
                { label: "Kontrak Kerja", href: "/admin/contracts", icon: FileSignature },
                { label: "Akun Login", href: "/admin/crew/accounts", icon: UserCog },
            ]
        }
    ];

    const activeGroup = allMenuGroups.find(group => 
        group.matchPaths.some(path => pathname.startsWith(path))
    );
    const displayedMenus = activeGroup ? [activeGroup] : [];

    // === HALAMAN LANDING PAGE (/admin) - BENTO GRID STYLE ===
    if (pathname === '/admin') {
        return (
            <div className={cn("min-h-screen bg-[#f4e3be] text-[#022020] selection:bg-[#033f3f] selection:text-white", poppins.variable, inter.variable)}>
                
                {/* HEADER GLASSMORPHISM */}
                <header className="fixed top-0 left-0 right-0 z-50 px-6 md:px-12 py-4">
                    <div className="max-w-7xl mx-auto flex items-center justify-between bg-white/25 backdrop-blur-md border border-white/30 rounded-2xl px-6 py-3 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="size-10 flex items-center justify-center bg-[#033f3f] rounded-xl text-white shadow-lg shadow-[#033f3f]/20">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-[#022020] font-poppins">Balista HR</h2>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            <div className="flex gap-2">
                                <button className="flex items-center justify-center rounded-xl size-10 bg-white/50 text-[#022020] hover:bg-white transition-colors">
                                    <Bell className="w-5 h-5" />
                                </button>
                                <button className="flex items-center justify-center rounded-xl size-10 bg-white/50 text-red-600 hover:bg-red-50 transition-colors" onClick={handleLogout} title="Keluar">
                                    <LogOut className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="size-10 rounded-full bg-white/50 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                                <img alt="User Profile" className="w-full h-full object-cover" src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin" />
                            </div>
                        </div>
                    </div>
                </header>

                {/* MAIN CONTENT */}
                <main className="pt-32 pb-20 px-6 md:px-12 max-w-7xl mx-auto font-inter">
                    <div className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <h1 className="font-poppins text-4xl md:text-6xl font-black tracking-tight mb-4 text-[#022020]">
                            HR Dashboard
                        </h1>
                        <p className="text-[#022020]/70 text-lg md:text-xl font-medium max-w-2xl leading-relaxed">
                            Selamat datang, Admin. Pilih modul untuk memulai pengelolaan sistem yang efisien dan terintegrasi.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 auto-rows-min">
                        
                        {/* FEATURED CARD: ANALISIS TURNOVER */}
                        <div className="md:col-span-2 lg:col-span-2 md:row-span-2 bg-[#033f3f] rounded-[2rem] p-8 md:p-10 relative overflow-hidden group shadow-xl shadow-[#033f3f]/20 flex flex-col justify-between hover:-translate-y-1 transition-all duration-300">
                            {/* Decorative Blurs */}
                            <div className="absolute -right-12 -top-12 size-64 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors"></div>
                            
                            <div className="relative z-10">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold mb-6 backdrop-blur-sm border border-white/10">
                                    <Star className="w-3 h-3 fill-white" />
                                    FEATURED MODULE
                                </div>
                                <h2 className="font-poppins text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
                                    Analisis Turnover
                                </h2>
                                <p className="text-white/80 text-base md:text-lg leading-relaxed max-w-md mb-8">
                                    Dapatkan wawasan mendalam tentang retensi karyawan dengan visualisasi data Heatmap dan prediksi AI.
                                </p>
                            </div>
                            
                            {/* Giant Icon Background */}
                            <Activity className="absolute right-[-20px] bottom-[-20px] w-64 h-64 text-white/5 pointer-events-none" />

                            <div className="relative z-10 mt-auto">
                                <Link href="/admin/dashboard">
                                    <button className="group/btn inline-flex items-center gap-3 bg-white text-[#033f3f] px-6 py-3.5 rounded-xl font-bold hover:bg-white/90 transition-all shadow-lg shadow-black/10">
                                        Buka Analitik
                                        <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                                    </button>
                                </Link>
                            </div>
                        </div>

                        {/* CARD: ADMINISTRASI SDM */}
                        <div className="bg-white rounded-[1.5rem] p-6 flex flex-col justify-between border-l-8 border-[#d6302a] shadow-sm h-full min-h-[220px] hover:-translate-y-1 transition-all duration-300 group">
                            <div>
                                <div className="size-12 rounded-xl bg-[#d6302a]/10 flex items-center justify-center text-[#d6302a] mb-4 group-hover:scale-110 transition-transform">
                                    <Users className="w-7 h-7" />
                                </div>
                                <h3 className="font-poppins text-xl font-bold text-[#022020] mb-2">Administrasi SDM</h3>
                                <p className="text-sm text-[#022020]/60 leading-relaxed">
                                    Data karyawan, kontrak, approval kandidat & database outlet.
                                </p>
                            </div>
                            <Link href="/admin/crew">
                                <button className="mt-4 w-full py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-[#022020] hover:bg-[#d6302a] hover:text-white hover:border-transparent transition-all">
                                    Masuk
                                </button>
                            </Link>
                        </div>

                        {/* CARD: PENGGAJIAN */}
                        <div className="bg-white rounded-[1.5rem] p-6 flex flex-col justify-between border-l-8 border-[#cd5b19] shadow-sm h-full min-h-[220px] hover:-translate-y-1 transition-all duration-300 group">
                            <div>
                                <div className="size-12 rounded-xl bg-[#cd5b19]/10 flex items-center justify-center text-[#cd5b19] mb-4 group-hover:scale-110 transition-transform">
                                    <Banknote className="w-7 h-7" />
                                </div>
                                <h3 className="font-poppins text-xl font-bold text-[#022020] mb-2">Penggajian</h3>
                                <p className="text-sm text-[#022020]/60 leading-relaxed">
                                    Absensi otomatis, kasbon, & slip gaji digital.
                                </p>
                            </div>
                            <Link href="/admin/payroll">
                                <button className="mt-4 w-full py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-[#022020] hover:bg-[#cd5b19] hover:text-white hover:border-transparent transition-all">
                                    Masuk
                                </button>
                            </Link>
                        </div>

                        {/* CARD: PENILAIAN */}
                        <div className="md:col-span-2 lg:col-span-1 bg-white rounded-[1.5rem] p-6 flex flex-col justify-between border-l-8 border-[#f2d086] shadow-sm h-full min-h-[220px] hover:-translate-y-1 transition-all duration-300 group">
                            <div>
                                <div className="size-12 rounded-xl bg-[#f2d086]/20 flex items-center justify-center text-orange-400 mb-4 group-hover:scale-110 transition-transform">
                                    <Trophy className="w-7 h-7" />
                                </div>
                                <h3 className="font-poppins text-xl font-bold text-[#022020] mb-2">Penilaian Kinerja</h3>
                                <p className="text-sm text-[#022020]/60 leading-relaxed">
                                    KPI, evaluasi bulanan & perhitungan insentif.
                                </p>
                            </div>
                            <Link href="/admin/dashboard-penilaian">
                                <button className="mt-4 w-full py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-[#022020] hover:bg-[#f2d086] hover:text-[#022020] hover:border-transparent transition-all">
                                    Masuk
                                </button>
                            </Link>
                        </div>

                        {/* MINI STATS CARDS */}
                        <div className="bg-white rounded-[1.25rem] p-5 flex items-center gap-4 shadow-sm border border-white/50">
                            <div className="size-10 rounded-full bg-[#4f7979]/10 flex items-center justify-center text-[#4f7979] flex-shrink-0">
                                <User className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-[#4f7979]">Total Karyawan</p>
                                <p className="text-xl font-poppins font-bold text-[#022020]">1,248</p>
                            </div>
                        </div>

                        <div className="bg-white rounded-[1.25rem] p-5 flex items-center gap-4 shadow-sm border border-white/50">
                            <div className="size-10 rounded-full bg-[#4f7979]/10 flex items-center justify-center text-[#4f7979] flex-shrink-0">
                                <CheckCircle className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-[#4f7979]">Hadir Hari Ini</p>
                                <p className="text-xl font-poppins font-bold text-[#022020]">98.2%</p>
                            </div>
                        </div>

                        <div className="bg-white rounded-[1.25rem] p-5 flex items-center gap-4 shadow-sm border border-white/50">
                            <div className="size-10 rounded-full bg-[#4f7979]/10 flex items-center justify-center text-[#4f7979] flex-shrink-0">
                                <Clock className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-[#4f7979]">Review Tertunda</p>
                                <p className="text-xl font-poppins font-bold text-[#022020]">12</p>
                            </div>
                        </div>

                        <div className="bg-white rounded-[1.25rem] p-5 flex items-center gap-4 shadow-sm border border-white/50">
                            <div className="size-10 rounded-full bg-[#4f7979]/10 flex items-center justify-center text-[#4f7979] flex-shrink-0">
                                <MapPin className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-[#4f7979]">Total Outlet</p>
                                <p className="text-xl font-poppins font-bold text-[#022020]">45</p>
                            </div>
                        </div>

                    </div>
                </main>

                {/* FOOTER GLASS PANEL */}
                <footer className="mt-auto border-t border-white/30 bg-white/20 backdrop-blur-md">
                    <div className="max-w-7xl mx-auto px-6 md:px-12 py-8 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="text-sm text-[#022020]/60 font-medium">
                            © 2026 Balista HRIS. Platform Terpadu Manajemen SDM.
                        </div>
                        <div className="flex items-center gap-6">
                            <a className="text-sm text-[#022020]/60 hover:text-[#033f3f] font-medium transition-colors" href="#">Privasi</a>
                            <a className="text-sm text-[#022020]/60 hover:text-[#033f3f] font-medium transition-colors" href="#">Syarat</a>
                            <a className="text-sm text-[#022020]/60 hover:text-[#033f3f] font-medium transition-colors" href="#">Bantuan</a>
                        </div>
                    </div>
                </footer>
            </div>
        );
    }

    // === LAYOUT STANDAR DENGAN SIDEBAR (Untuk halaman admin lainnya) ===
    return (
        <div className={cn("flex min-h-screen w-full bg-muted/40", poppins.className)}>
            {/* SIDEBAR */}
            <aside className={cn(
                "flex h-screen flex-col border-r bg-background transition-all duration-300 ease-in-out fixed left-0 top-0 z-20 shadow-sm",
                isCollapsed ? "w-16" : "w-64"
            )}>
                {/* LOGO AREA */}
                <div className="flex h-16 items-center justify-center border-b px-4 bg-white">
                    <Link href="/admin">
                        <Image src="/logo.png" alt="Logo" width={isCollapsed ? 32 : 100} height={32} className="transition-all" />
                    </Link>
                </div>

                {/* TOMBOL KEMBALI KE MENU UTAMA */}
                <div className="p-3 border-b border-dashed">
                    <Link href="/admin">
                        <Button variant="secondary" size="sm" className={cn("w-full bg-blue-50 text-blue-700 hover:bg-blue-100", isCollapsed ? "px-0" : "justify-start")}>
                            <ArrowLeft className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
                            {!isCollapsed && "Menu Utama"}
                        </Button>
                    </Link>
                </div>

                {/* MENU NAVIGATION (HANYA SECTION AKTIF) */}
                <nav className="flex-1 overflow-y-auto py-4 space-y-4 px-2 custom-scrollbar">
                    {displayedMenus.map((group, idx) => (
                        <div key={idx}>
                            {!isCollapsed && (
                                <h3 className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground opacity-70">
                                    Modul {group.title}
                                </h3>
                            )}
                            
                            <div className="space-y-1">
                                {group.items.map((link) => {
                                    const isActive = pathname === link.href;
                                    return (
                                        <Link
                                            key={link.label} 
                                            href={link.href}
                                            title={isCollapsed ? link.label : undefined}
                                            className={cn(
                                                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                                                isActive ? "bg-accent text-accent-foreground font-semibold" : "text-muted-foreground",
                                                isCollapsed && "justify-center px-2"
                                            )}
                                        >
                                            <link.icon className="h-5 w-5 flex-shrink-0" />
                                            {!isCollapsed && <span>{link.label}</span>}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* FOOTER */}
                <div className="border-t p-2">
                    <Button variant="ghost" className={cn("w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700", isCollapsed ? "justify-center px-0" : "")} onClick={handleLogout}>
                        <LogOut className="h-5 w-5" />{!isCollapsed && <span className="ml-2">Keluar</span>}
                    </Button>
                </div>
            </aside>

            {/* KONTEN UTAMA */}
            <div className={cn("flex flex-col flex-grow min-h-screen transition-all duration-300", isCollapsed ? "ml-16" : "ml-64")}>
                <header className="flex h-16 items-center justify-between border-b bg-background px-4 sticky top-0 z-10 shadow-sm bg-white/80 backdrop-blur-sm">
                    <Button variant="ghost" size="icon" onClick={() => setIsCollapsed(!isCollapsed)} className="-ml-2">
                        {isCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
                    </Button>
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-semibold">Administrator</p>
                            <p className="text-xs text-muted-foreground">Super User</p>
                        </div>
                    </div>
                </header>
                <main className="flex-1 p-6 overflow-auto">{children}</main>
            </div>
        </div>
    );
}