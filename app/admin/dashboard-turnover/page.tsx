'use client';

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Users, TrendingUp, TrendingDown, AlertTriangle, ArrowRight,
  Download, Activity, Calendar, Bell, ShieldCheck, ArrowLeft, Loader2,
  LogOut, User, MapPin, ChevronRight, X
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Poppins } from "next/font/google";

const poppins = Poppins({ 
    subsets: ["latin"], 
    weight: ["400", "500", "600", "700", "800", "900"],
    display: 'swap',
});

export default function DashboardPage() {
  const router = useRouter();
  
  // --- STATE DATA ---
  const [stats, setStats] = useState({ totalCrew: 0, highRisk: 0, avgTurnover: 0 });
  const [outletRisks, setOutletRisks] = useState<any[]>([]);
  const [highRiskList, setHighRiskList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [currentDateStr, setCurrentDateStr] = useState("");

  // --- STATE UI INTERACTIVE ---
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  // DATA DUMMY CHART (Placeholder)
  const chartMockData = [
    { month: 'Jul', attendance: 75, resign: 12 },
    { month: 'Agu', attendance: 80, resign: 8 },
    { month: 'Sep', attendance: 72, resign: 15 },
    { month: 'Okt', attendance: 85, resign: 5 },
    { month: 'Nov', attendance: 68, resign: 18 },
    { month: 'Des', attendance: 70, resign: 10 },
  ];

  // 1. LOAD DATA REAL
  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch Data
      const { data: crewData } = await supabase.from('crew').select('id, outlet_id, is_active').eq('is_active', true);
      const { data: predData } = await supabase
        .from('churn_predictions')
        .select('*, crew:crew_id(full_name, role, outlet_id, outlets(name))')
        .order('risk_score', { ascending: false });

      if (crewData) {
        const total = crewData.length;
        const high = predData ? predData.filter((p: any) => p.risk_score > 70).length : 0;
        
        // Hitung Avg Score
        const totalScore = predData?.reduce((acc: number, curr: any) => acc + (curr.risk_score || 0), 0) || 0;
        const avgRisk = predData?.length ? (totalScore / predData.length).toFixed(1) : 0;

        setStats({ totalCrew: total, highRisk: high, avgTurnover: Number(avgRisk) }); 

        if (predData && predData.length > 0) {
            // Group by Outlet
            const riskByOutlet: any = {};
            predData.forEach((p: any) => {
              const outletName = p.crew?.outlets?.name || 'Unknown Outlet';
              if (!riskByOutlet[outletName]) riskByOutlet[outletName] = { totalScore: 0, count: 0 };
              riskByOutlet[outletName].totalScore += p.risk_score;
              riskByOutlet[outletName].count += 1;
            });

            const heatmapArray = Object.keys(riskByOutlet).map(key => ({
              name: key,
              avgRisk: Math.round(riskByOutlet[key].totalScore / riskByOutlet[key].count),
              count: riskByOutlet[key].count
            }));
            
            heatmapArray.sort((a, b) => b.avgRisk - a.avgRisk);
            setOutletRisks(heatmapArray.slice(0, 3)); 
            setHighRiskList(predData.slice(0, 5)); 
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // 2. FUNGSI PREDIKSI AI
  const runPrediction = async () => {
    setPredicting(true);
    toast.info("Sedang menjalankan algoritma prediksi...");
    try {
        const res = await fetch('/api/analytics/predict', { method: 'POST' });
        const result = await res.json();
        if(res.ok) {
            toast.success(`Analisis Selesai! ${result.count} data diproses.`);
            await loadData(); 
        } else {
            throw new Error(result.message);
        }
    } catch (error: any) {
        toast.error("Gagal menjalankan prediksi.", { description: error.message });
    } finally {
        setPredicting(false);
    }
  };

  // 3. FUNGSI LOGOUT
  const handleLogout = async () => {
      await supabase.auth.signOut();
      toast.success("Berhasil Logout");
      router.replace("/login");
  };

  // 4. FUNGSI INVESTIGASI (Navigasi)
  const handleInvestigate = (outletName: string) => {
      toast.loading(`Membuka data detail outlet: ${outletName}...`);
      setTimeout(() => {
          toast.dismiss();
          // Idealnya navigasi ke halaman detail outlet, misal: /admin/outlets/detail/[id]
          // Untuk sekarang kita arahkan ke list outlet
          router.push("/admin/outlets"); 
          toast.success(`Investigasi dimulai untuk ${outletName}`);
      }, 1000);
  };

  // 5. FUNGSI EXPORT
  const handleExport = () => {
      if(highRiskList.length === 0) return toast.warning("Belum ada data risiko untuk diexport.");
      const csvContent = "data:text/csv;charset=utf-8,Nama,Outlet,Role,Risk Score\n" 
          + highRiskList.map(i => `"${i.crew?.full_name}","${i.crew?.outlets?.name}","${i.crew?.role}",${i.risk_score}`).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Analisis_Turnover_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Laporan berhasil diunduh");
  };

  useEffect(() => { 
      loadData(); 
      const now = new Date();
      setCurrentDateStr(now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }));
  }, []);

  const getOutletStyle = (score: number) => {
    if (score > 70) return { label: "CRITICAL", color: "text-[#d6302a]", bg: "bg-[#d6302a]", border: "border-[#d6302a]", badge: "bg-[#d6302a]" };
    if (score > 40) return { label: "WARNING", color: "text-[#cd5b19]", bg: "bg-[#cd5b19]", border: "border-[#cd5b19]", badge: "bg-[#cd5b19]" };
    return { label: "SAFE", color: "text-[#033f3f]", bg: "bg-[#033f3f]", border: "border-[#033f3f]", badge: "bg-[#033f3f]" };
  };

  return (
    <div className={`min-h-screen bg-[#f4e3be] text-[#022020] pb-10 ${poppins.className}`} onClick={() => { setShowNotif(false); setShowProfile(false); }}>
        
        {/* --- HEADER --- */}
        <header className="sticky top-0 z-40 px-6 md:px-8 py-4 mb-6 transition-all duration-300">
            <div className="max-w-[1440px] mx-auto flex items-center justify-between bg-white/60 backdrop-blur-lg border border-white/60 rounded-2xl px-6 py-3 shadow-sm" onClick={(e) => e.stopPropagation()}>
                
                <div className="flex items-center gap-3 text-[#033f3f]">
                    <div className="size-10 bg-[#033f3f] text-white rounded-xl flex items-center justify-center shadow-lg shadow-[#033f3f]/20">
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                    <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#022020]">Balista HRIS</h1>
                </div>
                
                <div className="flex items-center gap-4">
                    {/* BUTTON MENU UTAMA */}
                    <Link href="/admin">
                        <button className="flex items-center gap-2 bg-[#033f3f]/10 border border-[#033f3f]/20 px-4 py-2 rounded-xl text-sm font-bold text-[#033f3f] hover:bg-[#033f3f] hover:text-white transition-all">
                            <ArrowLeft className="w-4 h-4" />
                            <span className="hidden md:inline">Menu Utama</span>
                        </button>
                    </Link>

                    {/* PERIODE AKTIF */}
                    <div className="hidden md:flex items-center gap-2 bg-white/50 border border-white/30 px-4 py-2 rounded-xl text-sm font-medium text-[#022020]">
                        <Calendar className="w-4 h-4 text-[#033f3f]" />
                        <span>Periode: {currentDateStr || "Memuat..."}</span>
                    </div>

                    {/* NOTIFIKASI DROPDOWN */}
                    <div className="relative">
                        <button 
                            onClick={() => { setShowNotif(!showNotif); setShowProfile(false); }}
                            className={`flex items-center justify-center rounded-xl size-10 transition-colors relative ${showNotif ? 'bg-white shadow-md' : 'bg-white/50 hover:bg-white'}`}
                        >
                            <Bell className="w-5 h-5 text-[#022020]" />
                            {stats.highRisk > 0 && <span className="absolute top-2 right-2 size-2 bg-[#d6302a] rounded-full border border-white animate-pulse"></span>}
                        </button>

                        {/* CONTENT NOTIF */}
                        {showNotif && (
                            <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-50">
                                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                    <h4 className="font-bold text-sm text-[#022020]">Peringatan Risiko ({stats.highRisk})</h4>
                                    <button onClick={() => setShowNotif(false)}><X className="w-4 h-4 text-gray-400 hover:text-gray-600"/></button>
                                </div>
                                <div className="max-h-64 overflow-y-auto p-2">
                                    {highRiskList.length === 0 ? (
                                        <p className="text-center text-xs text-gray-400 py-4">Tidak ada notifikasi baru.</p>
                                    ) : (
                                        highRiskList.slice(0, 3).map((item, i) => (
                                            <div key={i} className="flex items-start gap-3 p-3 hover:bg-red-50 rounded-xl transition-colors cursor-pointer border-b border-gray-50 last:border-0">
                                                <div className="size-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 flex-shrink-0 mt-1">
                                                    <AlertTriangle className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-[#022020]">{item.crew?.full_name}</p>
                                                    <p className="text-[10px] text-gray-500">Terdeteksi risiko turnover tinggi ({item.risk_score}%) di {item.crew?.outlets?.name}.</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                                {highRiskList.length > 0 && (
                                    <div className="p-2 border-t border-gray-100 bg-gray-50 text-center">
                                        <button className="text-xs font-bold text-[#033f3f] hover:underline" onClick={() => setShowNotif(false)}>Tutup</button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* PROFIL DROPDOWN */}
                    <div className="relative">
                        <button 
                            onClick={() => { setShowProfile(!showProfile); setShowNotif(false); }}
                            className="size-10 rounded-full bg-white/50 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm hover:scale-105 transition-transform"
                        >
                            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin" alt="Admin" className="w-full h-full object-cover" />
                        </button>

                        {showProfile && (
                            <div className="absolute right-0 top-12 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-50">
                                <div className="p-4 border-b border-gray-100 bg-gray-50">
                                    <p className="text-sm font-bold text-[#022020]">Administrator</p>
                                    <p className="text-xs text-gray-500">Super User</p>
                                </div>
                                <div className="p-2">
                                    <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-left">
                                        <User className="w-4 h-4" /> Edit Profil
                                    </button>
                                    <button 
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors text-left font-medium"
                                    >
                                        <LogOut className="w-4 h-4" /> Keluar
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </header>

        {/* --- MAIN CONTENT --- */}
        <main className="w-full max-w-[1440px] mx-auto px-6 md:px-8 flex flex-col gap-8">
            
            {/* Title & Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                    <h2 className="text-3xl md:text-4xl font-black text-[#033f3f] tracking-tight mb-2">Dashboard Analisa Turnover</h2>
                    <p className="text-[#022020]/70 font-medium text-lg">Pantau retensi kru, prediksi risiko, dan stabilitas outlet secara real-time.</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={handleExport}
                        className="flex items-center gap-2 bg-white text-[#033f3f] px-5 py-3 rounded-xl text-sm font-bold shadow-sm border border-white/50 hover:bg-[#fdfbf7] transition-colors"
                    >
                        <Download className="w-5 h-5" />
                        Export Report
                    </button>
                    <button 
                        onClick={runPrediction}
                        disabled={predicting}
                        className="flex items-center gap-2 bg-[#033f3f] text-white px-6 py-3 rounded-xl text-sm font-bold shadow-lg shadow-[#033f3f]/20 hover:bg-[#022f2f] hover:scale-105 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {predicting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Activity className="w-5 h-5" />}
                        {predicting ? "Memproses..." : "Run AI Prediction"}
                    </button>
                </div>
            </div>

            {/* METRICS CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Kru */}
                <div className="bg-white p-6 rounded-[1.5rem] shadow-sm border border-white/50 flex flex-col justify-between h-44 group hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
                    <div className="flex justify-between items-start">
                        <div className="flex flex-col gap-1">
                            <p className="text-[#022020]/50 text-sm font-bold uppercase tracking-wider">Total Kru Aktif</p>
                            <h3 className="text-5xl font-black text-[#022020] tracking-tight mt-2">{stats.totalCrew}</h3>
                        </div>
                        <div className="p-3 bg-[#033f3f]/10 rounded-2xl text-[#033f3f]">
                            <Users className="w-8 h-8" />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-auto">
                        <span className="bg-[#078832]/10 text-[#078832] text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" /> Data Realtime
                        </span>
                    </div>
                </div>

                {/* Turnover Risk */}
                <div className="bg-white p-6 rounded-[1.5rem] shadow-sm border border-white/50 flex flex-col justify-between h-44 group hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
                    <div className="flex justify-between items-start">
                        <div className="flex flex-col gap-1">
                            <p className="text-[#022020]/50 text-sm font-bold uppercase tracking-wider">Avg Risk Score</p>
                            <h3 className="text-5xl font-black text-[#022020] tracking-tight mt-2">{stats.avgTurnover}%</h3>
                        </div>
                        <div className="p-3 bg-[#cd5b19]/10 rounded-2xl text-[#cd5b19]">
                            <TrendingDown className="w-8 h-8" />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-auto">
                        <span className="text-[#022020]/50 text-sm font-medium">Rata-rata probabilitas resign</span>
                    </div>
                </div>

                {/* High Risk */}
                <div className="bg-white p-6 rounded-[1.5rem] shadow-sm border border-[#d6302a]/30 flex flex-col justify-between h-44 group hover:-translate-y-1 hover:shadow-xl transition-all duration-300 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#d6302a]/5 rounded-bl-full -mr-6 -mt-6 transition-transform group-hover:scale-110"></div>
                    <div className="flex justify-between items-start relative z-10">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <p className="text-[#d6302a] text-sm font-bold uppercase tracking-wider">High Risk Crew</p>
                                {stats.highRisk > 0 && <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#d6302a] opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-[#d6302a]"></span></span>}
                            </div>
                            <h3 className="text-5xl font-black text-[#022020] tracking-tight mt-2">{stats.highRisk}</h3>
                        </div>
                        <div className="p-3 bg-[#d6302a]/10 rounded-2xl text-[#d6302a]">
                            <AlertTriangle className="w-8 h-8" />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-auto relative z-10">
                        <span className={`bg-[#d6302a]/10 text-[#d6302a] text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1 ${stats.highRisk === 0 ? 'bg-green-100 text-green-700' : ''}`}>
                            {stats.highRisk > 0 ? `+${stats.highRisk} orang` : 'Aman'}
                        </span>
                        <span className="text-[#022020]/50 text-sm font-medium">Perlu atensi segera</span>
                    </div>
                </div>
            </div>

            {/* HEATMAP OUTLET */}
            <section className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-[#022020] flex items-center gap-3">
                        <div className="bg-[#033f3f] p-2 rounded-xl text-white shadow-md shadow-[#033f3f]/20"><MapPin className="w-6 h-6" /></div>
                        Retention Heatmap: Status Outlet
                    </h2>
                    <Link href="/admin/outlets" className="text-sm font-bold text-[#033f3f] hover:underline flex items-center gap-1 cursor-pointer bg-white/50 px-4 py-2 rounded-lg border border-white/50 hover:bg-white transition-colors">
                        Lihat Data Outlet <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {loading ? (
                        [1,2,3].map(i => <div key={i} className="h-[320px] bg-white/50 animate-pulse rounded-[1.5rem]"></div>)
                    ) : outletRisks.length === 0 ? (
                        <div className="col-span-3 text-center py-12 text-gray-400 italic bg-white/50 rounded-xl border border-dashed border-gray-300">
                            Belum ada data prediksi. Silakan klik tombol "Run AI Prediction" di pojok kanan atas.
                        </div>
                    ) : (
                        outletRisks.map((outlet, idx) => {
                            const style = getOutletStyle(outlet.avgRisk);
                            // Gambar random cafe/resto agar lebih hidup
                            const bgImage = [
                               "https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=600&auto=format&fit=crop", 
                               "https://images.unsplash.com/photo-1559925393-8be0ec4767c8?q=80&w=600&auto=format&fit=crop", 
                               "https://images.unsplash.com/photo-1521017432531-fbd92d768814?q=80&w=600&auto=format&fit=crop"  
                            ][idx % 3];

                            return (
                                <div key={idx} className={`group bg-white rounded-[1.5rem] overflow-hidden border-2 ${style.border} shadow-md hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 flex flex-col h-[320px]`}>
                                    <div className="h-40 bg-gray-200 relative overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10"></div>
                                        <div className="absolute bottom-4 left-5 z-20">
                                            <span className={`inline-block px-3 py-1 ${style.badge} text-white text-[10px] font-bold tracking-wider rounded-md uppercase mb-2 shadow-lg`}>
                                                {style.label}
                                            </span>
                                            <h3 className="text-white text-xl font-bold leading-tight drop-shadow-md">{outlet.name}</h3>
                                        </div>
                                        <div className="w-full h-full bg-cover bg-center group-hover:scale-110 transition-transform duration-700" style={{backgroundImage: `url('${bgImage}')`}}></div>
                                    </div>
                                    <div className="p-6 flex flex-col gap-4 flex-1">
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <p className="text-xs text-[#022020]/50 font-bold uppercase tracking-wider">Avg Risk Score</p>
                                                <p className={`text-4xl font-black ${style.color}`}>{outlet.avgRisk}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-[#022020]/50 font-bold uppercase tracking-wider">Jumlah Kru</p>
                                                <p className="text-xl font-bold text-[#022020]">{outlet.count} Orang</p>
                                            </div>
                                        </div>
                                        <hr className="border-[#022020]/10"/>
                                        
                                        {/* TOMBOL INVESTIGASI AKTIF */}
                                        <button 
                                            onClick={() => handleInvestigate(outlet.name)}
                                            className={`mt-auto w-full py-3 flex items-center justify-center gap-2 bg-opacity-10 ${style.bg.replace('bg-', 'bg-opacity-10 ')} ${style.color} hover:${style.bg} hover:text-white font-bold text-sm rounded-xl transition-all active:scale-95`}
                                        >
                                            Investigasi <ChevronRight className="w-4 h-4"/>
                                        </button>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </section>

            {/* TABEL EARLY WARNING SYSTEM */}
            <section className="bg-white rounded-[1.5rem] shadow-sm border border-white/50 flex flex-col overflow-hidden mb-12">
                <div className="p-8 border-b border-[#022020]/5 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h3 className="text-xl font-bold text-[#022020] flex items-center gap-3">
                            Early Warning System
                            <span className="bg-[#d6302a]/10 text-[#d6302a] text-[10px] px-2 py-1 rounded-md uppercase font-bold tracking-wider">Action Needed</span>
                        </h3>
                        <p className="text-sm text-[#022020]/50 font-medium">Top 5 Karyawan Risiko Tinggi</p>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#fafafa] border-b border-[#022020]/5">
                                <th className="py-4 px-8 text-xs font-bold text-[#022020]/40 uppercase tracking-wider">Nama Kru</th>
                                <th className="py-4 px-8 text-xs font-bold text-[#022020]/40 uppercase tracking-wider">Outlet</th>
                                <th className="py-4 px-8 text-xs font-bold text-[#022020]/40 uppercase tracking-wider">Faktor Risiko</th>
                                <th className="py-4 px-8 text-xs font-bold text-[#022020]/40 uppercase tracking-wider text-right">Prob. Score</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#022020]/5">
                            {loading ? (
                                <tr><td colSpan={4} className="text-center py-10 text-gray-400 italic">Memuat data...</td></tr>
                            ) : highRiskList.length === 0 ? (
                                <tr><td colSpan={4} className="text-center py-10 text-gray-400 italic">Data aman. Tidak ada karyawan berisiko tinggi.</td></tr>
                            ) : (
                                highRiskList.map((item, i) => (
                                    <tr key={i} className="hover:bg-[#fdfbf7] transition-colors group">
                                        <td className="py-4 px-8">
                                            <div className="flex items-center gap-4">
                                                <div className="size-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-sm text-gray-600 border-2 border-white shadow-sm">
                                                    {item.crew?.full_name?.substring(0,2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-[#022020] leading-tight group-hover:text-[#033f3f] transition-colors">{item.crew?.full_name}</p>
                                                    <p className="text-xs text-[#022020]/50 font-medium mt-0.5">{item.crew?.role}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-8">
                                            <span className="text-sm font-medium text-gray-700">{item.crew?.outlets?.name}</span>
                                        </td>
                                        <td className="py-4 px-8">
                                            {item.factors && item.factors[0] ? (
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#d6302a]/10 text-[#d6302a] border border-[#d6302a]/20">
                                                    {item.factors[0]}
                                                </span>
                                            ) : <span className="text-gray-400 text-xs">-</span>}
                                        </td>
                                        <td className="py-4 px-8">
                                            <div className="flex flex-col items-end gap-1">
                                                <span className={`text-sm font-black ${item.risk_score > 70 ? 'text-[#d6302a]' : 'text-[#cd5b19]'}`}>
                                                    {item.risk_score}%
                                                </span>
                                                <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full rounded-full ${item.risk_score > 70 ? 'bg-[#d6302a]' : 'bg-[#cd5b19]'}`} 
                                                        style={{width: `${item.risk_score}%`}}
                                                    ></div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </main>
    </div>
  );
}