'use client';

import { useEffect, useState, useMemo, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabaseClient"; 
import { Crew, Outlet } from "@/types"; 
import { 
    FileText, Briefcase, MapPin, 
    BadgeCheck, AlertCircle, ExternalLink, CalendarDays 
} from "lucide-react"; 

// --- UPDATE INTERFACE ---
// Menambahkan latitude & longitude agar terbaca oleh TypeScript
interface OutletExtended extends Outlet {
    address?: string;
    latitude?: number;
    longitude?: number;
}

const formSchema = z.object({
    full_name: z.string().min(3, "Nama minimal 3 karakter"),
    email: z.string().email("Format email tidak valid").optional().or(z.literal("")),
    phone_number: z.string().optional().or(z.literal("")),
    outlet_id: z.string().min(1, "Harap pilih outlet"),
    role: z.enum(["crew", "leader", "supervisor"]),
    gender: z.enum(["male", "female"]),
    bank_name: z.string().optional(),
    bank_account_number: z.string().optional(),
    address: z.string().min(5, "Alamat wajib diisi (Min: Jalan & No Rumah)"), 
    distance_km: z.coerce.number().min(0, "Jarak harus diisi (angka)"), 
    skck_url: z.string().optional(),
    is_active: z.boolean(),
    join_date: z.string().min(1, "Tanggal masuk wajib diisi"),
    resign_date: z.string().optional(),
    resign_reason: z.string().optional(),
});

// Helper Hitung Masa Kerja
const calculateDuration = (start: string | null, end: string | null) => {
    if (!start) return "-";
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : new Date();
    
    let years = endDate.getFullYear() - startDate.getFullYear();
    let months = endDate.getMonth() - startDate.getMonth();
    
    if (months < 0) { years--; months += 12; }
    if (years > 0) return `${years} Thn ${months} Bln`;
    return `${months} Bulan`;
};

export default function ManageCrewPage() {
    const [crewList, setCrewList] = useState<Crew[]>([]);
    const [outlets, setOutlets] = useState<OutletExtended[]>([]); // Pakai interface baru
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingCrew, setEditingCrew] = useState<Crew | null>(null);
    const [uploadingSkck, setUploadingSkck] = useState(false);

    // Filter
    const [showInactive, setShowInactive] = useState(false);
    const [filterOutlet, setFilterOutlet] = useState<string>("all");
    const [filterRole, setFilterRole] = useState<string>("all");
    const [sortBy, setSortBy] = useState<"outlet" | "name" | "role">("outlet");

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            full_name: "", email: "", phone_number: "", outlet_id: "", 
            role: "crew", gender: "male", bank_name: "", bank_account_number: "", 
            address: "", distance_km: 0, skck_url: "", is_active: true, join_date: "", resign_date: "", resign_reason: ""
        },
    });

    const isActive = form.watch("is_active");
    
    // --- FITUR BARU: Open Google Maps (LOGIC KOORDINAT) ---
    // --- UPDATE FINAL LOGIC MAPS ---
    const handleCheckMap = () => {
        const fullAddress = form.getValues("address");
        const selectedOutletId = form.getValues("outlet_id");
        
        if (!fullAddress) {
            toast.error("Isi alamat karyawan terlebih dahulu.");
            return;
        }
        if (!selectedOutletId) {
            toast.error("Pilih outlet penempatan terlebih dahulu.");
            return;
        }

        // 1. Bersihkan alamat crew (ambil nama jalan saja)
        const cleanOrigin = fullAddress.split(',')[0].trim(); 

        // 2. Ambil data outlet
        const selectedOutlet = outlets.find(o => o.id === selectedOutletId);
        
        // DEBUGGING: Cek di Console Browser (F12) apakah data koordinat masuk?
        console.log("Data Outlet Terpilih:", selectedOutlet);

        // 3. Tentukan Destination 
        let destination = "";
        let mode = "Nama Outlet";

        // Pastikan latitude/longitude ada dan TIDAK null/undefined/0
        if (selectedOutlet?.latitude && selectedOutlet?.longitude) {
            destination = `${selectedOutlet.latitude},${selectedOutlet.longitude}`;
            mode = "Koordinat Akurat";
        } else if (selectedOutlet?.address) {
            destination = selectedOutlet.address;
            mode = "Alamat Database";
        } else {
            // Fallback terakhir: Nama Outlet + Bandung (biar gak nyasar ke kota lain)
            destination = `${selectedOutlet?.name}, Bandung`; 
            mode = "Nama Outlet (Fallback)";
        }
        
        // 4. Buka Google Maps
        const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(cleanOrigin)}&destination=${encodeURIComponent(destination)}&travelmode=driving`;
        
        window.open(url, '_blank');
        
        if (mode === "Koordinat Akurat") {
            toast.success(`Menggunakan Koordinat Presisi Outlet (${destination})`);
        } else {
            toast.warning(`Menggunakan ${mode}. Koordinat outlet mungkin belum diisi di database.`);
        }
    };

    const processedCrew = useMemo(() => {
        let result = [...crewList];
        if (!showInactive) result = result.filter(c => c.is_active);
        if (filterOutlet !== "all") result = result.filter(c => c.outlet_id === filterOutlet);
        if (filterRole !== "all") result = result.filter(c => c.role === filterRole);

        result.sort((a, b) => {
            if (a.is_active !== b.is_active) return a.is_active ? -1 : 1; 
            if (sortBy === "outlet") return (a.outlets?.name || "Z").localeCompare(b.outlets?.name || "Z");
            if (sortBy === "role") {
                const roleOrder = { supervisor: 1, leader: 2, crew: 3 };
                return (roleOrder[a.role] || 9) - (roleOrder[b.role] || 9);
            }
            return a.full_name.localeCompare(b.full_name);
        });
        return result;
    }, [crewList, showInactive, filterOutlet, filterRole, sortBy]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [crewRes, outletsRes] = await Promise.all([
                fetch('/api/admin/crew', { cache: 'no-store' }), 
                fetch('/api/outlets', { cache: 'no-store' }) // Pastikan API outlets kamu mengembalikan SELECT *
            ]);
            if (!crewRes.ok) throw new Error("Gagal load data.");
            setCrewList(await crewRes.json());
            setOutlets(await outletsRes.json());
        } catch (error: any) {
            toast.error("Error", { description: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleUploadSKCK = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { toast.error("Max 2MB"); return; }
        setUploadingSkck(true);
        try {
            const fileName = `skck-${Date.now()}.${file.name.split('.').pop()}`;
            const { error } = await supabase.storage.from('documents').upload(fileName, file);
            if (error) throw error;
            const { data } = supabase.storage.from('documents').getPublicUrl(fileName);
            form.setValue('skck_url', data.publicUrl);
            toast.success("SKCK Terupload");
        } catch (error: any) { toast.error("Gagal Upload", { description: error.message }); } finally { setUploadingSkck(false); }
    };

    const handleOpenDialog = (crew: Crew | null = null) => {
        setEditingCrew(crew);
        const defaults = {
            full_name: "", email: "", phone_number: "", outlet_id: "", 
            role: "crew" as const, gender: "male" as const, bank_name: "", bank_account_number: "", 
            address: "", distance_km: 0, skck_url: "", is_active: true, join_date: "", resign_date: "", resign_reason: ""
        };
        
        if (crew) {
            form.reset({
                ...defaults,
                full_name: crew.full_name,
                outlet_id: crew.outlet_id,
                role: crew.role as "crew" | "leader" | "supervisor",
                gender: crew.gender as "male" | "female",
                email: crew.email ?? "",
                phone_number: crew.phone_number ?? "",
                bank_name: crew.bank_name ?? "",
                bank_account_number: crew.bank_account_number ?? "",
                address: crew.address ?? "",
                distance_km: crew.distance_km ?? 0, 
                skck_url: crew.skck_url ?? "",
                is_active: crew.is_active ?? true,
                join_date: crew.join_date ?? "",
                resign_date: crew.resign_date ?? "",
                resign_reason: crew.resign_reason ?? ""
            });
        } else {
            form.reset(defaults);
        }
        setIsDialogOpen(true);
    };

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            const payload = {
                ...values,
                join_date: values.join_date === "" ? null : values.join_date,
                resign_date: values.resign_date === "" ? null : values.resign_date,
                resign_reason: values.is_active ? null : values.resign_reason
            };

            if (editingCrew) {
                Object.assign(payload, { id: editingCrew.id });
            }

            const method = editingCrew ? 'PATCH' : 'POST';
            const response = await fetch('/api/admin/crew', { 
                method, 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(payload) 
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Gagal menyimpan data.");
            }
            
            toast.success(`Data berhasil disimpan.`);
            setIsDialogOpen(false);
            fetchData(); 
        } catch (error: any) { 
            toast.error("Gagal", { description: error.message }); 
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const response = await fetch('/api/admin/crew', { method: 'DELETE', body: JSON.stringify({ id }) });
            if (!response.ok) throw new Error("Gagal menghapus.");
            toast.success("Dihapus permanen");
            fetchData();
        } catch (error: any) { toast.error("Error", { description: error.message }); }
    };

    return (
        <div className="space-y-6 font-poppins text-[#111818]">
            <div className="flex flex-col gap-4 bg-white p-6 rounded-xl border border-[#e6dcc6] shadow-sm">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-[#033f3f]">Data Karyawan & Karir</h1>
                        <p className="text-sm text-gray-500">Kelola database kru dan variabel prediksi turnover.</p>
                    </div>
                    <Button onClick={() => handleOpenDialog()} className="bg-[#033f3f] hover:bg-[#022e2e] shadow-lg shadow-[#033f3f]/20">
                        + Tambah Data
                    </Button>
                </div>
                {/* Filter Controls */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-[#f5f8f8] p-4 rounded-lg">
                    <div className="space-y-1">
                        <Label className="text-xs font-semibold text-[#033f3f]">Filter Outlet</Label>
                        <Select value={filterOutlet} onValueChange={setFilterOutlet}>
                            <SelectTrigger className="bg-white border-gray-200"><SelectValue placeholder="Semua Outlet" /></SelectTrigger>
                            <SelectContent><SelectItem value="all">Semua Outlet</SelectItem>{outlets.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs font-semibold text-[#033f3f]">Filter Jabatan</Label>
                        <Select value={filterRole} onValueChange={setFilterRole}>
                            <SelectTrigger className="bg-white border-gray-200"><SelectValue placeholder="Semua Jabatan" /></SelectTrigger>
                            <SelectContent><SelectItem value="all">Semua Jabatan</SelectItem><SelectItem value="supervisor">Supervisor</SelectItem><SelectItem value="leader">Leader</SelectItem><SelectItem value="crew">Crew</SelectItem></SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs font-semibold text-[#033f3f]">Urutkan</Label>
                        <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                            <SelectTrigger className="bg-white border-gray-200"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="outlet">Outlet</SelectItem><SelectItem value="name">Nama</SelectItem><SelectItem value="role">Jabatan</SelectItem></SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center space-x-2 h-10">
                        <Checkbox id="show-inactive" checked={showInactive} onCheckedChange={(c) => setShowInactive(c as boolean)} className="data-[state=checked]:bg-[#033f3f]" />
                        <Label htmlFor="show-inactive" className="cursor-pointer text-sm font-medium">Tampilkan Non-aktif</Label>
                    </div>
                </div>
            </div>

            {/* TABEL DATA */}
            <div className="rounded-xl border border-[#e6dcc6] bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-[#f5f8f8]">
                        <TableRow>
                            <TableHead className="font-bold text-[#033f3f]">Identitas</TableHead>
                            <TableHead className="font-bold text-[#033f3f]">Outlet</TableHead>
                            <TableHead className="font-bold text-[#033f3f]">Jarak (KM)</TableHead>
                            <TableHead className="font-bold text-[#033f3f]">Kontak</TableHead>
                            <TableHead className="font-bold text-[#033f3f]">Masa Kerja</TableHead> 
                            <TableHead className="font-bold text-[#033f3f]">Status</TableHead>
                            <TableHead className="text-right font-bold text-[#033f3f]">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {!isLoading && processedCrew.length === 0 && <TableRow><TableCell colSpan={7} className="text-center h-24 text-gray-500">Data tidak ditemukan.</TableCell></TableRow>}
                        
                        {processedCrew.map(crew => (
                            <TableRow key={crew.id} className={`hover:bg-[#fcf8f2] transition-colors ${!crew.is_active ? 'bg-gray-50 opacity-60' : ''}`}>
                                <TableCell>
                                    <div className="font-semibold text-[#111818]">{crew.full_name}</div>
                                    <div className="text-xs text-gray-500 capitalize">{crew.role} • {crew.gender === 'male' ? 'L' : 'P'}</div>
                                    {crew.skck_url && (
                                        <a href={crew.skck_url} target="_blank" className="text-[10px] text-[#033f3f] underline flex items-center gap-1 mt-1 font-medium">
                                            <FileText className="w-3 h-3"/> SKCK
                                        </a>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <span className="px-2 py-1 rounded text-xs font-bold bg-[#033f3f]/10 text-[#033f3f] border border-[#033f3f]/20">
                                        {crew.outlets?.name || 'N/A'}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-1 text-sm">
                                        <MapPin className="w-3 h-3 text-orange-600"/>
                                        {crew.distance_km ? `${crew.distance_km} km` : '-'}
                                    </div>
                                </TableCell>
                                <TableCell className="text-xs text-gray-600">
                                    <div>{crew.phone_number || '-'}</div>
                                    {(crew.bank_name) && <div className="text-gray-400">{crew.bank_name}</div>}
                                </TableCell>
                                <TableCell className="text-xs">
                                    <div className="flex items-center gap-1 font-medium text-[#111818]">
                                        <Briefcase className="w-3 h-3"/>
                                        {calculateDuration(crew.join_date, crew.resign_date)}
                                    </div>
                                    <div className="text-gray-400 mt-0.5 text-[10px]">
                                        {crew.join_date ? new Date(crew.join_date).toLocaleDateString('id-ID', {month:'short', year:'numeric'}) : '?'}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {crew.is_active 
                                        ? <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">Aktif</span> 
                                        : <span className="px-2 py-1 bg-gray-200 text-gray-600 rounded-full text-xs font-bold">Resign</span>}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(crew)} className="text-[#033f3f] hover:bg-[#033f3f]/10">Edit</Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* MODAL INPUT */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-[800px] max-h-[90vh] overflow-y-auto p-0 rounded-xl bg-white border border-[#e6dcc6]">
                    
                    {/* Header Modal */}
                    <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 bg-[#f5f8f8]">
                        <div>
                            <DialogTitle className="text-xl md:text-2xl font-bold leading-tight tracking-tight text-[#111818]">
                                {editingCrew ? 'Edit Data Karyawan' : 'Tambah Data Karyawan'}
                            </DialogTitle>
                            <p className="text-gray-500 text-sm mt-1">Masukkan data karyawan untuk analisis retensi Balista HRIS.</p>
                        </div>
                    </div>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
                            <div className="px-8 py-6 space-y-8">
                                
                                {/* Section 1: Informasi Dasar */}
                                <section className="flex flex-col gap-5">
                                    <div className="flex items-center gap-2 mb-1">
                                        <BadgeCheck className="w-5 h-5 text-[#033f3f]" />
                                        <h3 className="text-[#111818] text-lg font-bold">Informasi Dasar</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FormField control={form.control} name="full_name" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[#111818] font-medium">Nama Lengkap</FormLabel>
                                                <FormControl><Input placeholder="Contoh: Budi Santoso" {...field} className="h-12 bg-white border-gray-200 focus:border-[#033f3f] focus:ring-[#033f3f]/20" /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        
                                        <FormField control={form.control} name="outlet_id" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[#111818] font-medium">Penempatan Outlet</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl><SelectTrigger className="h-12 bg-white border-gray-200"><SelectValue placeholder="Pilih Outlet" /></SelectTrigger></FormControl>
                                                    <SelectContent>{outlets.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )} />

                                        <FormField control={form.control} name="role" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[#111818] font-medium">Jabatan</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl><SelectTrigger className="h-12 bg-white border-gray-200"><SelectValue /></SelectTrigger></FormControl>
                                                    <SelectContent><SelectItem value="crew">Crew</SelectItem><SelectItem value="leader">Leader</SelectItem><SelectItem value="supervisor">Supervisor</SelectItem></SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )} />

                                        <FormField control={form.control} name="gender" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[#111818] font-medium">Gender</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl><SelectTrigger className="h-12 bg-white border-gray-200"><SelectValue /></SelectTrigger></FormControl>
                                                    <SelectContent><SelectItem value="male">Laki-laki</SelectItem><SelectItem value="female">Perempuan</SelectItem></SelectContent>
                                                </Select>
                                            </FormItem>
                                        )} />
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-6">
                                        <FormField control={form.control} name="phone_number" render={({ field }) => (
                                            <FormItem><FormLabel>WhatsApp</FormLabel><FormControl><Input placeholder="08..." {...field} className="h-12" /></FormControl></FormItem>
                                        )} />
                                        <FormField control={form.control} name="address" render={({ field }) => (
                                            <FormItem><FormLabel>Alamat Lengkap</FormLabel><FormControl><Input placeholder="Jl. Raya Bandung No. 12..." {...field} className="h-12" /></FormControl><FormMessage /></FormItem>
                                        )} />
                                    </div>
                                </section>

                                {/* Section 2: Variabel Prediksi (Highlighted Style) */}
                                <section className="rounded-xl overflow-hidden border border-[#f1d9a5]">
                                    <div className="bg-[#f1d9a5]/30 px-6 py-5">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="p-1.5 bg-[#f1d9a5] rounded text-[#5c4000]"><AlertCircle className="w-5 h-5" /></div>
                                            <h3 className="text-[#111818] text-lg font-bold">Variabel Prediksi</h3>
                                            <span className="ml-auto bg-[#f1d9a5] text-[#5c4000] text-xs font-bold px-2.5 py-0.5 rounded border border-[#f1d9a5]">Wajib Diisi</span>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <FormField control={form.control} name="distance_km" render={({ field }) => ( 
                                                <FormItem>
                                                    <FormLabel className="flex justify-between items-baseline font-medium text-[#111818]">Jarak ke Outlet (KM)</FormLabel>
                                                    <div className="flex gap-2">
                                                        <div className="relative flex-1">
                                                            <FormControl><Input type="number" step="0.1" min="0" placeholder="0" {...field} className="h-12 pr-10 border-[#f1d9a5] focus:border-orange-400 focus:ring-orange-200" /></FormControl>
                                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">KM</span>
                                                        </div>
                                                        <Button type="button" onClick={handleCheckMap} variant="outline" className="h-12 border-[#f1d9a5] text-orange-700 bg-white hover:bg-orange-50" title="Cek di Google Maps">
                                                            <ExternalLink className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                    <FormMessage />
                                                </FormItem> 
                                            )} />

                                            <FormField control={form.control} name="join_date" render={({ field }) => ( 
                                                <FormItem>
                                                    <FormLabel className="font-medium text-[#111818]">Tanggal Masuk</FormLabel>
                                                    <div className="relative">
                                                        <FormControl><Input type="date" {...field} className="h-12 border-[#f1d9a5] focus:border-orange-400 focus:ring-orange-200" /></FormControl>
                                                        <CalendarDays className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                                                    </div>
                                                    <FormMessage />
                                                </FormItem> 
                                            )} />
                                        </div>
                                    </div>
                                </section>

                                {/* Section 3: Status & SKCK */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField control={form.control} name="is_active" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Status Kepegawaian</FormLabel>
                                            <Select onValueChange={(val) => field.onChange(val === 'true')} value={field.value ? 'true' : 'false'}>
                                                <FormControl><SelectTrigger className="h-12"><SelectValue /></SelectTrigger></FormControl>
                                                <SelectContent><SelectItem value="true">✅ Aktif Bekerja</SelectItem><SelectItem value="false">❌ Resign / Non-aktif</SelectItem></SelectContent>
                                            </Select>
                                        </FormItem>
                                    )} />
                                    
                                    <FormField control={form.control} name="skck_url" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Upload SKCK</FormLabel>
                                            <FormControl>
                                                <Input type="file" accept="image/*,.pdf" onChange={handleUploadSKCK} disabled={uploadingSkck} className="h-12 pt-2 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#033f3f]/10 file:text-[#033f3f] hover:file:bg-[#033f3f]/20" />
                                            </FormControl>
                                            {field.value && <div className="text-xs text-green-600 mt-1 font-medium flex items-center gap-1"><BadgeCheck className="w-3 h-3"/> File Terlampir</div>}
                                        </FormItem>
                                    )} />
                                </div>

                                {/* Conditional Resign Fields */}
                                {!isActive && (
                                    <div className="space-y-4 bg-red-50 p-4 rounded-xl border border-red-100 animate-in fade-in slide-in-from-top-2">
                                        <h4 className="text-red-700 font-bold text-sm">Data Kepulangan / Resign</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField control={form.control} name="resign_date" render={({ field }) => ( 
                                                <FormItem><FormLabel className="text-red-600">Tanggal Keluar</FormLabel><FormControl><Input type="date" {...field} className="bg-white border-red-200" /></FormControl></FormItem> 
                                            )} />
                                            <FormField control={form.control} name="resign_reason" render={({ field }) => ( 
                                                <FormItem><FormLabel className="text-red-600">Alasan</FormLabel><FormControl><Input placeholder="Contoh: Pindah Domisili" {...field} className="bg-white border-red-200" /></FormControl></FormItem> 
                                            )} />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer Actions */}
                            <div className="px-8 py-5 border-t border-gray-100 bg-[#f9fafb] flex flex-col-reverse sm:flex-row justify-between items-center gap-4 mt-auto">
                                {editingCrew ? (
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild><Button variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50">Hapus Data</Button></AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader><AlertDialogTitle>Hapus permanen?</AlertDialogTitle><AlertDialogDescription>Data yang dihapus tidak bisa dikembalikan. Gunakan status Non-aktif jika karyawan hanya resign.</AlertDialogDescription></AlertDialogHeader>
                                            <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(editingCrew.id)} className="bg-red-600">Hapus</AlertDialogAction></AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                ) : <div />}
                                
                                <div className="flex gap-3 w-full sm:w-auto">
                                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="w-full sm:w-auto border-gray-300 text-gray-700">Batal</Button>
                                    <Button type="submit" disabled={uploadingSkck} className="w-full sm:w-auto bg-[#033f3f] hover:bg-[#022e2e] text-white shadow-lg shadow-[#033f3f]/20">
                                        {uploadingSkck ? 'Uploading...' : (editingCrew ? 'Simpan Perubahan' : 'Simpan Data')}
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
    );
}