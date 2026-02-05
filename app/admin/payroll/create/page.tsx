'use client';

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Calculator, Link as LinkIcon, RefreshCw } from "lucide-react";
import { toast } from "sonner";

// --- KONFIGURASI MATRIKS GAJI ---
const SALARY_MATRIX: any = {
    "Berpengalaman": {
        "DineIn": [2000000, 2000000, 1750000], 
        "Express": [2000000, 1750000, 1500000]
    },
    "Non-Pengalaman": {
        "DineIn": [1750000, 1750000, 1500000],
        "Express": [1750000, 1500000, 1250000]
    }
};

export default function CreatePayrollPage() {
    const [loading, setLoading] = useState(false);
    const [crewList, setCrewList] = useState<any[]>([]);
    
    // State Filter Periode Gaji
    const today = new Date();
    const [selectedMonth, setSelectedMonth] = useState<string>(String(today.getMonth() + 1));
    const [selectedYear, setSelectedYear] = useState<string>(String(today.getFullYear()));

    // State Input Payroll
    const [payrollEntries, setPayrollEntries] = useState<Record<string, any>>({});

    // 1. FETCH DATA CREW (Saat halaman dimuat)
    const initData = async () => {
        setLoading(true);
        try {
            // Ambil Crew Aktif
            const { data: crews, error: errCrew } = await supabase
                .from('crew')
                .select(`
                    id, full_name, join_date, bank_account_number, bank_name,
                    outlets ( name ),
                    crew_contracts ( 
                        contract_type, experience_level, outlet_type, base_salary 
                    )
                `)
                .eq('is_active', true)
                .order('full_name');

            if (errCrew) throw errCrew;

            // Setup Default Payroll Entries
            const initialEntries: any = {};
            crews?.forEach((crew: any) => {
                const contract = crew.crew_contracts?.[0] || {};
                const calculation = calculateBaseSalary(
                    crew.join_date, 
                    contract.experience_level, 
                    contract.outlet_type, 
                    contract.base_salary
                );

                initialEntries[crew.id] = {
                    ...calculation,
                    work_days: 26, // Default sebelum tarik absen
                    bonus: 0,
                    allowance: 0,
                    deduction: 0,
                    overtime: 0,
                    attendance_synced: false 
                };
            });

            setCrewList(crews || []);
            setPayrollEntries(initialEntries);

        } catch (err: any) {
            toast.error("Gagal memuat data crew: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { initData(); }, [selectedMonth, selectedYear]); // Reload base calculation if month changes

    // 2. LOGIKA BARU: SINKRON ABSENSI BY BULAN & TAHUN
    const syncAttendanceData = async () => {
        setLoading(true);
        try {
            // Query Database berdasarkan Bulan & Tahun yang dipilih di Payroll
            const { data: attendanceData, error } = await supabase
                .from('attendance_summaries')
                .select('crew_id, count_h, count_ht, count_a, count_i')
                .eq('month', Number(selectedMonth))
                .eq('year', Number(selectedYear));

            if (error) throw error;
            
            if (!attendanceData || attendanceData.length === 0) {
                toast.warning(`Data absensi untuk bulan ${selectedMonth}/${selectedYear} belum di-upload.`);
                setLoading(false);
                return;
            }

            // Update Payroll Entries
            setPayrollEntries(prev => {
                const updated = { ...prev };
                let syncCount = 0;

                attendanceData.forEach((record: any) => {
                    if (updated[record.crew_id]) {
                        // Rumus Hari Kerja: Hadir (H) + Hadir Telat (HT)
                        const totalHadir = (record.count_h || 0) + (record.count_ht || 0);
                        
                        // Anda bisa menambahkan rumus denda alpha disini jika mau
                        // const dendaAlpha = (record.count_a || 0) * 50000; 

                        updated[record.crew_id] = {
                            ...updated[record.crew_id],
                            work_days: totalHadir,
                            // deduction: dendaAlpha, // Uncomment jika ingin otomatis potong
                            notes: `Hadir: ${totalHadir} | Alpha: ${record.count_a} | Izin: ${record.count_i}`,
                            attendance_synced: true
                        };
                        syncCount++;
                    }
                });
                
                toast.success(`Sukses menarik data absen untuk ${syncCount} karyawan!`);
                return updated;
            });

        } catch (err: any) {
            toast.error("Gagal sinkron absensi: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    // 3. FUNGSI HITUNG GAJI (Matriks & Prorata)
    const calculateBaseSalary = (joinDateStr: string, expLevel: string, outletType: string, dbBaseSalary: number) => {
        if (!joinDateStr) return { basic_salary: 0, month_nth: 0, notes: "No Join Date" };

        const joinDate = new Date(joinDateStr);
        const payrollDate = new Date(Number(selectedYear), Number(selectedMonth) - 1, 25);

        let monthDiff = (payrollDate.getFullYear() - joinDate.getFullYear()) * 12 + (payrollDate.getMonth() - joinDate.getMonth()) + 1;
        if (monthDiff < 1) monthDiff = 1; 

        let salary = dbBaseSalary || 0;
        let note = "Gaji Normal (Kontrak)";

        if (monthDiff <= 3) {
            const expKey = expLevel || "Non-Pengalaman";
            const outletKey = outletType || "Express";
            const matrix = SALARY_MATRIX[expKey]?.[outletKey];
            if (matrix && matrix[monthDiff - 1]) {
                salary = matrix[monthDiff - 1];
                note = `Rate Bulan ke-${monthDiff} (${expKey})`;
            }
        }

        return {
            basic_salary: salary,
            month_nth: monthDiff,
            original_rate: salary,
            notes: note
        };
    };

    // 4. HANDLE INPUT CHANGE
    const handleInputChange = (crewId: string, field: string, value: number) => {
        setPayrollEntries(prev => {
            const currentEntry = prev[crewId];
            let updatedEntry = { ...currentEntry, [field]: value };

            // Auto-Prorata Bulan 1
            if (currentEntry.month_nth === 1 && field === 'work_days') {
                const prorataSalary = Math.floor((currentEntry.original_rate / 26) * value);
                updatedEntry.basic_salary = prorataSalary;
                updatedEntry.notes = `Prorata Bulan-1 (${value} Hari)`;
            }

            return { ...prev, [crewId]: updatedEntry };
        });
    };

    // 5. SUBMIT
    const handleSubmit = async () => {
        if (!confirm("Simpan data gaji ini?")) return;
        setLoading(true);

        try {
            const payrollInserts = crewList.map(crew => {
                const entry = payrollEntries[crew.id];
                const total_salary = (entry.basic_salary || 0) + (entry.bonus || 0) + (entry.allowance || 0) + (entry.overtime || 0);
                const net_salary = total_salary - (entry.deduction || 0);

                return {
                    crew_id: crew.id,
                    period_month: Number(selectedMonth),
                    period_year: Number(selectedYear),
                    basic_salary: entry.basic_salary,
                    allowances: entry.allowance,
                    deductions: entry.deduction,
                    bonuses: entry.bonus,
                    overtime_pay: entry.overtime,
                    total_salary: total_salary,
                    net_salary: net_salary,
                    work_days: entry.work_days,
                    notes: entry.notes,
                    status: 'Pending'
                };
            });

            const { error } = await supabase.from('payroll').insert(payrollInserts);
            if (error) throw error;

            toast.success("Payroll berhasil dibuat!");
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* HEADER CONTROLS */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-4 rounded-lg border shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Buat Gaji Baru</h1>
                    <p className="text-muted-foreground text-sm">Hitung gaji bulanan & sinkronisasi absensi.</p>
                </div>
                
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 border rounded px-2 bg-gray-50 h-10">
                        <span className="text-xs font-semibold text-gray-500 mr-1">PERIODE:</span>
                        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                            <SelectTrigger className="w-[110px] h-8 border-0 bg-transparent"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"].map((m, i) => (
                                    <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={selectedYear} onValueChange={setSelectedYear}>
                            <SelectTrigger className="w-[80px] h-8 border-0 bg-transparent"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="2025">2025</SelectItem>
                                <SelectItem value="2026">2026</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* TOMBOL TARIK DATA (LANGSUNG DARI BULAN/TAHUN YG DIPILIH) */}
                    <Button 
                        variant="default"
                        className="bg-blue-600 hover:bg-blue-700 h-10"
                        onClick={syncAttendanceData}
                        disabled={loading}
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Tarik Absensi {selectedMonth}/{selectedYear}
                    </Button>
                </div>
            </div>

            {/* TABLE PAYROLL */}
            <Card className="shadow-lg border-t-4 border-blue-600">
                <CardHeader className="bg-blue-50/30 py-4">
                    <CardTitle className="text-base flex justify-between items-center text-blue-900">
                        <span>Draft Gaji Karyawan</span>
                        <Badge variant="outline" className="bg-white">Total: {crewList.length}</Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-100/80">
                                <TableHead className="w-[200px]">Karyawan</TableHead>
                                <TableHead className="text-center w-[80px]">Masa</TableHead>
                                <TableHead className="text-center w-[80px]">HK</TableHead>
                                <TableHead className="w-[140px]">Gaji Pokok</TableHead>
                                <TableHead className="w-[120px]">Tunjangan</TableHead>
                                <TableHead className="w-[120px]">Bonus</TableHead>
                                <TableHead className="w-[120px]">Potongan</TableHead>
                                <TableHead className="w-[140px] text-right font-bold text-green-700">THP (Net)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={8} className="text-center h-24"><Loader2 className="animate-spin mx-auto text-blue-600"/></TableCell></TableRow>
                            ) : crewList.length === 0 ? (
                                <TableRow><TableCell colSpan={8} className="text-center h-24 text-muted-foreground">Belum ada data crew.</TableCell></TableRow>
                            ) : (
                                crewList.map((crew) => {
                                    const entry = payrollEntries[crew.id] || {};
                                    const thp = (entry.basic_salary || 0) + (entry.allowance || 0) + (entry.bonus || 0) - (entry.deduction || 0);

                                    return (
                                        <TableRow key={crew.id} className="hover:bg-blue-50/10">
                                            <TableCell>
                                                <div className="font-bold text-gray-800">{crew.full_name}</div>
                                                <div className="text-xs text-muted-foreground mb-1">{crew.outlets?.name}</div>
                                                {entry.attendance_synced ? (
                                                    <Badge variant="secondary" className="text-[9px] bg-green-100 text-green-800 h-4 px-1">Synced</Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-[9px] text-gray-400 h-4 px-1 border-dashed">Manual</Badge>
                                                )}
                                                <div className="text-[10px] text-blue-600 mt-1 italic truncate max-w-[180px]">{entry.notes}</div>
                                            </TableCell>
                                            
                                            <TableCell className="text-center">
                                                <Badge className="bg-gray-200 text-gray-700">Bl-{entry.month_nth}</Badge>
                                            </TableCell>
                                            
                                            <TableCell className="text-center">
                                                <Input 
                                                    type="number" 
                                                    className={`h-8 w-14 text-center ${entry.attendance_synced ? 'bg-green-50 border-green-200' : ''}`}
                                                    value={entry.work_days}
                                                    onChange={(e) => handleInputChange(crew.id, 'work_days', Number(e.target.value))}
                                                />
                                            </TableCell>
                                            
                                            <TableCell>
                                                <div className="font-medium text-gray-700">Rp {entry.basic_salary?.toLocaleString('id-ID')}</div>
                                            </TableCell>
                                            
                                            <TableCell>
                                                <Input 
                                                    type="number" className="h-8 text-right text-xs" placeholder="0"
                                                    onChange={(e) => handleInputChange(crew.id, 'allowance', Number(e.target.value))}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input 
                                                    type="number" className="h-8 text-right text-xs" placeholder="0"
                                                    onChange={(e) => handleInputChange(crew.id, 'bonus', Number(e.target.value))}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input 
                                                    type="number" className="h-8 text-right text-xs text-red-600 border-red-100 bg-red-50/20" 
                                                    value={entry.deduction > 0 ? entry.deduction : ''}
                                                    placeholder="0"
                                                    onChange={(e) => handleInputChange(crew.id, 'deduction', Number(e.target.value))}
                                                />
                                            </TableCell>
                                            
                                            <TableCell className="text-right font-bold text-green-700 bg-green-50/30">
                                                Rp {thp.toLocaleString('id-ID')}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <div className="flex justify-end gap-3 mt-8 pb-10">
                <Button variant="outline" onClick={() => window.history.back()}>Batal</Button>
                <Button onClick={handleSubmit} disabled={loading} className="bg-blue-700 hover:bg-blue-800 px-6 shadow-lg">
                    {loading ? <Loader2 className="animate-spin mr-2"/> : <Save className="w-4 h-4 mr-2"/>}
                    Simpan Payroll
                </Button>
            </div>
        </div>
    );
}