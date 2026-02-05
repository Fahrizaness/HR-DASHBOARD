'use client';

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Upload, CheckCircle, MapPin, Briefcase, DollarSign, CreditCard, CalendarClock } from "lucide-react";
import { toast } from "sonner";

// --- DATA WILAYAH TYPES ---
type Region = { id: string; name: string; };

// --- KONFIGURASI GAJI ---
const salaryData: any = {
    "Berpengalaman": {
        "DineIn": ["2.000.000", "2.000.000", "1.750.000 + 1x Persenan"],
        "Express": ["2.000.000", "1.750.000 + 1x Persenan", "1.500.000 + 2x Persenan"]
    },
    "Non-Pengalaman": {
        "DineIn": ["1.750.000", "1.750.000", "1.500.000 + 1x Persenan"],
        "Express": ["1.750.000", "1.500.000 + 1x Persenan", "1.250.000 + 2x Persenan"]
    }
};

const outletTypeMap: any = {
    "Buah Batu": "DineIn", 
    "Kota Baru Parahyangan": "DineIn", 
    "Ambon": "DineIn", 
    "Pajajaran": "DineIn", 
    "Cimahi Amir Machmud": "DineIn",
    "Soreang": "Express", 
    "Cimahi Cihanjuang": "Express", 
    "Kiaracondong": "Express",
    "Ujung Berung": "Express", 
    "Tubagus Ismail": "Express", 
    "Setrasari": "Express", 
    "Kopo": "Express"
};

export default function ApplyPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    
    // --- STATE FORM DATA ---
    const [formData, setFormData] = useState({
        full_name: "", email: "", phone_number: "", gender: "",
        pob: "", dob: "", 
        address_street: "", address_house_no: "", address_rt_rw: "", address_kodepos: "", 
        address_kel: "", address_kec: "", address_city: "", address_prov: "",
        bank_account: "", bank_account_name: "", 
        outlet_name: "", experience_level: "",
        join_date: new Date().toISOString().split('T')[0], // Default Hari Ini
        end_date: "" // Akan dihitung otomatis
    });

    const [skckFile, setSkckFile] = useState<File | null>(null);
    const [salaryPreview, setSalaryPreview] = useState<string[]>(["-", "-", "-"]);

    // --- STATE WILAYAH (API) ---
    const [provinces, setProvinces] = useState<Region[]>([]);
    const [regencies, setRegencies] = useState<Region[]>([]);
    const [districts, setDistricts] = useState<Region[]>([]); 
    const [villages, setVillages] = useState<Region[]>([]); 

    const [selectedProvId, setSelectedProvId] = useState("");
    const [selectedCityId, setSelectedCityId] = useState("");
    const [selectedDistId, setSelectedDistId] = useState("");

    // --- 1. INITIALIZE & DATE CALCULATION ---
    useEffect(() => {
        // Load Provinsi
        fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json`)
            .then(res => res.json())
            .then(data => setProvinces(data))
            .catch(err => console.error(err));
        
        // Hitung End Date Awal (Hari ini + 3 Bulan)
        calculateEndDate(new Date().toISOString().split('T')[0]);
    }, []);

    // --- 2. FUNGSI HITUNG TANGGAL SELESAI (3 BULAN) ---
    const calculateEndDate = (startDateStr: string) => {
        if (!startDateStr) return;
        const startDate = new Date(startDateStr);
        const endDate = new Date(startDate);
        endDate.setMonth(startDate.getMonth() + 3); // Tambah 3 Bulan
        
        // Format ke YYYY-MM-DD
        const yyyy = endDate.getFullYear();
        const mm = String(endDate.getMonth() + 1).padStart(2, '0');
        const dd = String(endDate.getDate()).padStart(2, '0');
        const endDateStr = `${yyyy}-${mm}-${dd}`;

        setFormData(prev => ({ ...prev, join_date: startDateStr, end_date: endDateStr }));
    };

    // --- 3. FUNGSI FETCH WILAYAH ---
    const handleProvChange = (id: string) => {
        setSelectedProvId(id);
        const name = provinces.find(p => p.id === id)?.name || "";
        setFormData(prev => ({ ...prev, address_prov: name, address_city: "", address_kec: "", address_kel: "" }));
        setRegencies([]); setDistricts([]); setVillages([]);
        fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${id}.json`)
            .then(res => res.json()).then(data => setRegencies(data));
    };

    const handleCityChange = (id: string) => {
        setSelectedCityId(id);
        const name = regencies.find(p => p.id === id)?.name || "";
        setFormData(prev => ({ ...prev, address_city: name, address_kec: "", address_kel: "" }));
        setDistricts([]); setVillages([]);
        fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/districts/${id}.json`)
            .then(res => res.json()).then(data => setDistricts(data));
    };

    const handleDistrictChange = (id: string) => {
        setSelectedDistId(id);
        const name = districts.find(p => p.id === id)?.name || "";
        setFormData(prev => ({ ...prev, address_kec: name, address_kel: "" }));
        setVillages([]);
        fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/villages/${id}.json`)
            .then(res => res.json()).then(data => setVillages(data));
    };

    const handleVillageChange = (id: string) => {
        const name = villages.find(p => p.id === id)?.name || "";
        setFormData(prev => ({ ...prev, address_kel: name }));
    };


    // --- 4. HITUNG GAJI OTOMATIS ---
    useEffect(() => {
        const { outlet_name, experience_level } = formData;
        if (outlet_name && experience_level) {
            const type = outletTypeMap[outlet_name] || "Express"; 
            const salaries = salaryData[experience_level]?.[type];
            if (salaries) setSalaryPreview(salaries);
        } else {
            setSalaryPreview(["-", "-", "-"]);
        }
    }, [formData.outlet_name, formData.experience_level]);

    // --- 5. HANDLE SUBMIT ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!skckFile) return toast.error("Wajib upload SKCK!");
        if (!formData.outlet_name || !formData.experience_level) return toast.error("Lengkapi data pekerjaan!");

        setIsLoading(true);

        try {
            // A. UPLOAD SKCK
            const fileExt = skckFile.name.split('.').pop();
            const fileName = `skck-${Date.now()}.${fileExt}`;
            
            const { error: uploadError } = await supabase.storage.from('documents').upload(fileName, skckFile);
            if (uploadError) throw new Error("Gagal upload SKCK: " + uploadError.message);
            
            const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(fileName);

            // B. CARI OUTLET ID
            const { data: outletData } = await supabase.from('outlets').select('id').eq('name', formData.outlet_name).single();
            const outletId = outletData?.id || null;

            // C. INSERT CREW
            const fullAddress = `Jl. ${formData.address_street}, No. ${formData.address_house_no}, RT/RW ${formData.address_rt_rw}, Kel. ${formData.address_kel}, Kec. ${formData.address_kec}, ${formData.address_city}, ${formData.address_prov}, ${formData.address_kodepos}`;
            const bankNameFull = `BCA (a.n ${formData.bank_account_name})`;

            const { data: newCrew, error: crewError } = await supabase
                .from('crew')
                .insert({
                    full_name: formData.full_name,
                    email: formData.email,
                    phone_number: formData.phone_number,
                    gender: formData.gender === 'Laki-laki' ? 'male' : 'female',
                    date_of_birth: formData.dob,
                    address: fullAddress, 
                    outlet_id: outletId,
                    skck_url: publicUrl,
                    join_date: formData.join_date,
                    is_active: false,
                    role: 'crew',
                    bank_name: bankNameFull,
                    bank_account_number: formData.bank_account
                })
                .select()
                .single();

            if (crewError) throw crewError;

            // D. INSERT KONTRAK (DENGAN END_DATE)
            const baseSalaryRaw = salaryPreview[0].replace(/\./g, "").split(" ")[0]; 

            const { error: contractError } = await supabase
                .from('crew_contracts')
                .insert({
                    crew_id: newCrew.id,
                    start_date: formData.join_date,
                    end_date: formData.end_date, // SUDAH DITAMBAHKAN
                    contract_type: 'PKWTTP',
                    experience_level: formData.experience_level,
                    base_salary: Number(baseSalaryRaw),
                    daily_meal_allowance: 10000,
                    is_active: true,
                    outlet_type: outletTypeMap[formData.outlet_name] || 'Express'
                });

            if (contractError) throw contractError;

            setIsSuccess(true);
            toast.success("Data berhasil dikirim!");

        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="min-h-screen bg-[#f1d9a5] flex items-center justify-center p-4">
                <Card className="max-w-md w-full text-center p-8 shadow-2xl border-t-8 border-[#6b1815]">
                    <div className="flex justify-center mb-6">
                        <CheckCircle className="w-24 h-24 text-green-600" />
                    </div>
                    <h2 className="text-3xl font-bold text-[#022c2c] mb-2">Terima Kasih!</h2>
                    <p className="text-gray-600 mb-8">
                        Data Anda telah tersimpan. Silakan tunggu konfirmasi selanjutnya dari tim HR melalui WhatsApp.
                    </p>
                    <Button onClick={() => window.location.reload()} className="bg-[#022c2c] text-[#f1d9a5] hover:bg-[#034444]">
                        Isi Form Lagi
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f1d9a5] pb-20 font-sans">
            <div className="bg-[#022c2c] text-[#f1d9a5] p-6 text-center shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-2xl font-bold tracking-widest">PT ALTRI SEJAHTERA INDONESIA</h1>
                    <p className="text-sm opacity-80">HRIS Digital Onboarding</p>
                </div>
            </div>

            <main className="max-w-3xl mx-auto -mt-6 px-4 relative z-20">
                <Card className="shadow-2xl border-0 overflow-hidden mt-5">
                    <div className="h-2 bg-[#6b1815]"></div>
                    <CardHeader className="text-center pb-2">
                        <CardTitle className="text-2xl font-bold text-gray-800">Form Data Karyawan</CardTitle>
                        <CardDescription>Silakan isi data diri dengan lengkap dan benar.</CardDescription>
                    </CardHeader>
                    
                    <CardContent className="p-6 md:p-8">
                        <form onSubmit={handleSubmit} className="space-y-8">
                            
                            {/* 1. IDENTITAS */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-[#022c2c] font-bold border-b border-[#f1d9a5] pb-2">
                                    <div className="bg-[#f1d9a5] p-1.5 rounded text-[#6b1815]"><Briefcase className="w-5 h-5"/></div>
                                    <h3>IDENTITAS DIRI</h3>
                                </div>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Nama Lengkap (Sesuai KTP)</Label>
                                        <Input required value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Jenis Kelamin</Label>
                                        <Select onValueChange={v => setFormData({...formData, gender: v})} required>
                                            <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                                                <SelectItem value="Perempuan">Perempuan</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Tempat Lahir</Label>
                                        <Input required value={formData.pob} onChange={e => setFormData({...formData, pob: e.target.value})} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Tanggal Lahir</Label>
                                        <Input type="date" required value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} />
                                    </div>
                                </div>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>No. WhatsApp</Label>
                                        <Input type="tel" required value={formData.phone_number} onChange={e => setFormData({...formData, phone_number: e.target.value})} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Email</Label>
                                        <Input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                                    </div>
                                </div>
                            </div>

                            {/* 2. ALAMAT */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-[#022c2c] font-bold border-b border-[#f1d9a5] pb-2">
                                    <div className="bg-[#f1d9a5] p-1.5 rounded text-[#6b1815]"><MapPin className="w-5 h-5"/></div>
                                    <h3>ALAMAT DOMISILI</h3>
                                </div>
                                
                                <div className="grid grid-cols-[1fr_100px] gap-4">
                                    <div className="space-y-2">
                                        <Label>Jalan</Label>
                                        <Input required placeholder="Contoh: Jl. Soekarno Hatta" value={formData.address_street} onChange={e => setFormData({...formData, address_street: e.target.value})} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>No. Rumah</Label>
                                        <Input required placeholder="12A" value={formData.address_house_no} onChange={e => setFormData({...formData, address_house_no: e.target.value})} />
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>RT/RW</Label>
                                        <Input required placeholder="001/005" value={formData.address_rt_rw} onChange={e => setFormData({...formData, address_rt_rw: e.target.value})} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Kode Pos</Label>
                                        <Input required type="number" placeholder="40123" value={formData.address_kodepos} onChange={e => setFormData({...formData, address_kodepos: e.target.value})} />
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Provinsi</Label>
                                        <Select onValueChange={handleProvChange} required>
                                            <SelectTrigger><SelectValue placeholder="Pilih Provinsi..." /></SelectTrigger>
                                            <SelectContent className="max-h-[300px]">
                                                {provinces.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Kota/Kabupaten</Label>
                                        <Select onValueChange={handleCityChange} disabled={!selectedProvId} required>
                                            <SelectTrigger><SelectValue placeholder="Pilih Kota..." /></SelectTrigger>
                                            <SelectContent className="max-h-[300px]">
                                                {regencies.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Kecamatan</Label>
                                        <Select onValueChange={handleDistrictChange} disabled={!selectedCityId} required>
                                            <SelectTrigger><SelectValue placeholder="Pilih Kecamatan..." /></SelectTrigger>
                                            <SelectContent className="max-h-[300px]">
                                                {districts.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Kelurahan</Label>
                                        <Select onValueChange={handleVillageChange} disabled={!selectedDistId} required>
                                            <SelectTrigger><SelectValue placeholder="Pilih Kelurahan..." /></SelectTrigger>
                                            <SelectContent className="max-h-[300px]">
                                                {villages.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>

                            {/* 3. REKENING BANK */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-[#022c2c] font-bold border-b border-[#f1d9a5] pb-2">
                                    <div className="bg-[#f1d9a5] p-1.5 rounded text-[#6b1815]"><CreditCard className="w-5 h-5"/></div>
                                    <h3>INFORMASI REKENING</h3>
                                </div>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>No. Rekening BCA</Label>
                                        <Input required type="number" placeholder="Contoh: 1234567890" value={formData.bank_account} onChange={e => setFormData({...formData, bank_account: e.target.value})} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Atas Nama Rekening</Label>
                                        <Input required placeholder="Contoh: Budi Santoso" value={formData.bank_account_name} onChange={e => setFormData({...formData, bank_account_name: e.target.value})} />
                                    </div>
                                </div>
                            </div>

                            {/* 4. PEKERJAAN & GAJI */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-[#022c2c] font-bold border-b border-[#f1d9a5] pb-2">
                                    <div className="bg-[#f1d9a5] p-1.5 rounded text-[#6b1815]"><DollarSign className="w-5 h-5"/></div>
                                    <h3>DETAIL PEKERJAAN & KONTRAK</h3>
                                </div>

                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Penempatan Outlet</Label>
                                        <Select onValueChange={v => setFormData({...formData, outlet_name: v})} required>
                                            <SelectTrigger><SelectValue placeholder="Pilih Outlet..." /></SelectTrigger>
                                            <SelectContent className="max-h-[300px]">
                                                {Object.keys(outletTypeMap).sort().map(outlet => (
                                                    <SelectItem key={outlet} value={outlet}>{outlet}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Pengalaman</Label>
                                        <Select onValueChange={v => setFormData({...formData, experience_level: v})} required>
                                            <SelectTrigger><SelectValue placeholder="Pilih Kategori..." /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Non-Pengalaman">Non-Pengalaman</SelectItem>
                                                <SelectItem value="Berpengalaman">Berpengalaman</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Tanggal Mulai Bekerja</Label>
                                        <Input type="date" required value={formData.join_date} onChange={e => calculateEndDate(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Tanggal Selesai Kontrak</Label>
                                        {/* FIELD TANGGAL SELESAI OTOMATIS */}
                                        <div className="relative">
                                            <Input type="date" className="bg-gray-100 font-bold text-gray-600" value={formData.end_date} readOnly />
                                            <CalendarClock className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
                                        </div>
                                        <p className="text-[10px] text-gray-500">Otomatis 3 bulan masa percobaan.</p>
                                    </div>
                                </div>

                                {/* PREVIEW GAJI */}
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-2">
                                    <Label className="text-gray-500 text-xs uppercase tracking-wide font-bold">Estimasi Gaji Bertahap</Label>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                                        {['Bulan 1', 'Bulan 2', 'Bulan 3'].map((label, idx) => (
                                            <div key={idx} className={`p-3 rounded border text-center ${idx === 2 ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-200'}`}>
                                                <div className="text-xs text-gray-500 mb-1">{label}</div>
                                                <div className="font-bold text-[#022c2c] text-sm">{salaryPreview[idx]}</div>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-2 italic">*Gaji di atas belum termasuk uang makan & bonus penilaian.</p>
                                </div>
                            </div>

                            {/* 5. DOKUMEN */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-[#022c2c] font-bold border-b border-[#f1d9a5] pb-2">
                                    <div className="bg-[#f1d9a5] p-1.5 rounded text-[#6b1815]"><Upload className="w-5 h-5"/></div>
                                    <h3>DOKUMEN PENDUKUNG</h3>
                                </div>
                                <div className="space-y-2">
                                    <Label>Upload SKCK (Foto/PDF)</Label>
                                    <Input type="file" accept="image/*,.pdf" required onChange={e => setSkckFile(e.target.files?.[0] || null)} />
                                    <p className="text-[10px] text-gray-500">Maksimal 2MB.</p>
                                </div>
                            </div>

                            <Button type="submit" className="w-full bg-[#022c2c] hover:bg-[#034444] text-[#f1d9a5] font-bold h-12 text-lg shadow-lg" disabled={isLoading}>
                                {isLoading ? <Loader2 className="animate-spin mr-2"/> : null}
                                {isLoading ? "Mengirim Data..." : "KIRIM DATA KARYAWAN"}
                            </Button>

                        </form>
                    </CardContent>
                </Card>
                <div className="text-center mt-6 text-[#022c2c] text-sm opacity-60">
                    &copy; {new Date().getFullYear()} PT Altri Sejahtera Indonesia. All rights reserved.
                </div>
            </main>
        </div>
    );
}