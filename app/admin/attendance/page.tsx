"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Search, Users, MapPin } from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";

type AttendanceData = {
  crew_id: string;
  crew_name: string;
  role: string; // Tambahan untuk sorting leader
  outlet_name: string;
  // Counters
  h: number;
  ht: number;
  s: number;
  i: number;
  a: number;
  c: number;
  off: number;
  off_saturday: number;
  has_sick_letter: boolean;
};

export default function AttendancePage() {
  // --- STATE ---
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState<string>(String(today.getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState<string>(String(today.getFullYear()));
  const [searchQuery, setSearchQuery] = useState(""); // State Pencarian
  
  const [data, setData] = useState<AttendanceData[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeAssessmentPeriod, setActiveAssessmentPeriod] = useState<any>(null); 
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- 1. EFFECT: CEK PERIODE (INFO) ---
  useEffect(() => {
    const checkRelevantPeriod = async () => {
      setActiveAssessmentPeriod(null); 
      const mm = selectedMonth.padStart(2, '0');
      const { data } = await supabase
        .from("assessment_periods")
        .select("id, name, start_date, end_date")
        .lte('start_date', `${selectedYear}-${mm}-31`)
        .gte('end_date', `${selectedYear}-${mm}-01`)
        .limit(1);

      if (data && data.length > 0) setActiveAssessmentPeriod(data[0]);
    };
    checkRelevantPeriod();
  }, [selectedMonth, selectedYear]);

  // --- 2. EFFECT: LOAD DATA ---
  useEffect(() => {
    const fetchAttendance = async () => {
      setLoading(true);
      try {
          // Ambil Crew + ROLE untuk sorting
          const { data: crews } = await supabase
            .from("crew")
            .select("id, full_name, role, outlets(name)") // Fetch Role juga
            .eq("is_active", true);

          const { data: existing } = await supabase
            .from("attendance_summaries")
            .select("*")
            .eq("month", Number(selectedMonth))
            .eq("year", Number(selectedYear));

          if (crews) {
            const formatted = crews.map(c => {
              const saved = existing?.find(e => e.crew_id === c.id);
              // Normalisasi nama outlet
              const outletName = Array.isArray(c.outlets) 
                ? (c.outlets[0] as any)?.name 
                : (c.outlets as any)?.name;

              return {
                crew_id: c.id,
                crew_name: c.full_name,
                role: c.role || 'Crew', // Default role
                outlet_name: outletName || "Belum Ada Outlet",
                h: saved?.count_h || 0,
                ht: saved?.count_ht || 0,
                s: saved?.count_s || 0,
                i: saved?.count_i || 0,
                a: saved?.count_a || 0,
                c: saved?.count_c || 0,
                off: saved?.count_off || 0,
                off_saturday: saved?.count_off_saturday || 0,
                has_sick_letter: saved?.has_sick_letter || false,
              };
            });
            setData(formatted);
          }
      } catch (err) {
          console.error(err);
      } finally {
          setLoading(false);
      }
    };

    fetchAttendance();
  }, [selectedMonth, selectedYear]);

  // --- 3. CSV PARSER ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      delimiter: ";",
      complete: (results: any) => {
        const rows = results.data;
        const updatedData = [...data];
        let matchCount = 0;

        updatedData.forEach((crew, index) => {
           const crewNameParts = crew.crew_name.toLowerCase().split(" ").slice(0, 2).join(" ");
           const csvRow = rows.find((r: any) => r[0] && String(r[0]).toLowerCase().includes(crewNameParts));

           if (csvRow) {
             matchCount++;
             updatedData[index] = { 
                ...crew, 
                h: Number(csvRow[1]) || 0,
                ht: Number(csvRow[2]) || 0,
                s: Number(csvRow[3]) || 0,
                i: Number(csvRow[4]) || 0,
                off: Number(csvRow[5]) || 0, // Kolom 5 biasanya OFF
                a: Number(csvRow[6]) || 0,
                c: Number(csvRow[7]) || 0,
                off_saturday: Number(csvRow[8]) || 0
             };
           }
        });

        setData(updatedData);
        toast.success(`Matched ${matchCount} employees.`);
        if(fileInputRef.current) fileInputRef.current.value = "";
      }
    });
  };

  // --- 4. SAVE ---
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = data.map(d => ({
        crew_id: d.crew_id,
        month: Number(selectedMonth),
        year: Number(selectedYear),
        period_id: activeAssessmentPeriod?.id || null,
        count_h: d.h, count_ht: d.ht, count_s: d.s, count_i: d.i,
        count_a: d.a, count_c: d.c, count_off: d.off,
        count_off_saturday: d.off_saturday, has_sick_letter: d.has_sick_letter,
        total_days_present: d.h + d.ht // Legacy
      }));

      const { error } = await supabase
        .from("attendance_summaries")
        .upsert(payload, { onConflict: "crew_id, month, year" });

      if (error) throw error;
      toast.success("Data tersimpan permanen!");
    } catch (e: any) {
      toast.error("Gagal simpan: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  // --- 5. LOGIC GROUPING & SORTING ---
  const groupedData = useMemo(() => {
    // 1. Filter Search
    let filtered = data;
    if (searchQuery) {
        filtered = data.filter(d => 
            d.crew_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.outlet_name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }

    // 2. Grouping By Outlet
    const groups: Record<string, AttendanceData[]> = {};
    filtered.forEach(item => {
        if (!groups[item.outlet_name]) groups[item.outlet_name] = [];
        groups[item.outlet_name].push(item);
    });

    // 3. Sorting inside groups (Leader First, then A-Z)
    Object.keys(groups).forEach(outlet => {
        groups[outlet].sort((a, b) => {
            // Cek apakah role mengandung kata 'Leader' / 'Captain' / 'SPV'
            const isLeaderA = /leader|captain|spv|manager/i.test(a.role);
            const isLeaderB = /leader|captain|spv|manager/i.test(b.role);

            if (isLeaderA && !isLeaderB) return -1; // A naik
            if (!isLeaderA && isLeaderB) return 1;  // B naik
            
            // Jika role level sama, urutkan nama A-Z
            return a.crew_name.localeCompare(b.crew_name);
        });
    });

    // Sort Outlet Names A-Z
    return Object.keys(groups).sort().reduce((acc: any, key) => {
        acc[key] = groups[key];
        return acc;
    }, {});

  }, [data, searchQuery]);

  return (
    <div className="space-y-6">
      {/* HEADER CONTROL */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-lg border shadow-sm">
        <div>
          <h1 className="text-2xl font-bold">Input Absensi Bulanan</h1>
          <p className="text-muted-foreground text-sm flex items-center gap-1">
            Status Periode: 
            {activeAssessmentPeriod ? (
                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                    {activeAssessmentPeriod.name}
                </Badge>
            ) : (
                <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                    Non-Aktif
                </Badge>
            )}
          </p>
        </div>
        
        <div className="flex gap-2 items-center">
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Cari nama / outlet..."
                    className="pl-8 w-[200px] h-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            <div className="flex gap-1 border rounded px-2 bg-gray-50 h-10 items-center">
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
                    <SelectContent><SelectItem value="2025">2025</SelectItem><SelectItem value="2026">2026</SelectItem></SelectContent>
                </Select>
            </div>
        </div>
      </div>

      {/* TOOLBAR UPLOAD */}
      <div className="bg-blue-50/50 p-4 border border-blue-100 rounded-lg flex flex-col md:flex-row items-center gap-4">
        <div className="flex-1 w-full">
           <label className="text-xs font-bold text-blue-800 uppercase mb-1 block">Upload CSV Rekapan</label>
           <Input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileUpload} className="bg-white" />
        </div>
        <div>
           <Button onClick={handleSave} disabled={saving} className="h-10 w-full md:w-auto bg-blue-600 hover:bg-blue-700 shadow-sm">
              {saving ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2 h-4 w-4"/>} 
              Simpan Permanen
           </Button>
        </div>
      </div>

      {/* RENDER GROUPED TABLES */}
      {loading ? (
        <div className="flex justify-center h-40 items-center"><Loader2 className="animate-spin h-8 w-8 text-blue-500"/></div>
      ) : Object.keys(groupedData).length === 0 ? (
        <div className="text-center py-10 border rounded bg-white text-muted-foreground">Belum ada data atau tidak ditemukan.</div>
      ) : (
        Object.entries(groupedData).map(([outletName, crews]: any) => (
            <div key={outletName} className="border rounded-lg bg-white shadow-sm overflow-hidden mb-6">
                {/* HEADER OUTLET */}
                <div className="bg-slate-100 px-4 py-3 border-b flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-500" />
                        <h3 className="font-bold text-slate-800">{outletName}</h3>
                        <Badge variant="secondary" className="ml-2">{crews.length} Orang</Badge>
                    </div>
                </div>

                <Table className="text-xs">
                    <TableHeader>
                        <TableRow>
                        <TableHead className="w-[250px]">Nama Karyawan</TableHead>
                        <TableHead className="text-center w-10 bg-green-50 text-green-700">H</TableHead>
                        <TableHead className="text-center w-10 bg-yellow-50 text-yellow-700">HT</TableHead>
                        <TableHead className="text-center w-10 bg-blue-50 text-blue-700">S</TableHead>
                        <TableHead className="text-center w-10 bg-orange-50 text-orange-700">I</TableHead>
                        <TableHead className="text-center w-10 bg-gray-50 text-gray-700">OFF</TableHead>
                        <TableHead className="text-center w-10 bg-red-50 text-red-700 font-bold">A</TableHead>
                        <TableHead className="text-center w-10">C</TableHead>
                        <TableHead className="text-center w-10 bg-gray-100">(-)</TableHead>
                        <TableHead className="w-[120px] text-center">Surat Dokter</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {crews.map((row: AttendanceData, idx: number) => (
                        <TableRow key={row.crew_id} className="hover:bg-slate-50">
                            <TableCell>
                                <div className="font-semibold text-slate-700 flex items-center gap-2">
                                    {row.crew_name}
                                    {/* Badge Leader */}
                                    {/leader|captain|spv|manager/i.test(row.role) && (
                                        <Badge className="text-[9px] h-4 px-1 bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-indigo-200">
                                            {row.role}
                                        </Badge>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell className="text-center font-medium">{row.h}</TableCell>
                            <TableCell className="text-center">{row.ht}</TableCell>
                            <TableCell className="text-center">{row.s}</TableCell>
                            <TableCell className="text-center">{row.i}</TableCell>
                            <TableCell className="text-center font-bold text-gray-400">{row.off}</TableCell>
                            <TableCell className="text-center font-bold text-red-600 bg-red-50/50">{row.a}</TableCell>
                            <TableCell className="text-center">{row.c}</TableCell>
                            <TableCell className="text-center">{row.off_saturday}</TableCell>
                            
                            <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-2">
                                    <Checkbox 
                                        id={`sick-${row.crew_id}`}
                                        checked={row.has_sick_letter}
                                        onCheckedChange={(checked) => {
                                            // Kita harus update state global 'data', bukan hanya 'groupedData'
                                            // Cari index di state 'data' asli
                                            const originalIndex = data.findIndex(d => d.crew_id === row.crew_id);
                                            if (originalIndex !== -1) {
                                                const newData = [...data];
                                                newData[originalIndex].has_sick_letter = checked === true;
                                                setData(newData);
                                            }
                                        }}
                                    />
                                    <label htmlFor={`sick-${row.crew_id}`} className="cursor-pointer select-none">
                                        {row.has_sick_letter ? <span className="text-[10px] text-green-600 font-bold">Ada</span> : <span className="text-[10px] text-gray-300">-</span>}
                                    </label>
                                </div>
                            </TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        ))
      )}
    </div>
  );
}