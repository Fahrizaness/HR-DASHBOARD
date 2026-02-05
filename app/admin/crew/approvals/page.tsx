'use client';

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CheckCircle, FileText, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { ContractDocument } from "@/components/pdf/ContractDocument"; // Import PDF tadi

export default function ApprovalPage() {
    const [candidates, setCandidates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchCandidates = async () => {
        setLoading(true);
        // Ambil Crew yang TIDAK AKTIF (Pending) + Data Kontraknya
        const { data, error } = await supabase
            .from('crew')
            .select(`
                id, full_name, outlet_id, date_of_birth, address, skck_url,
                outlets(name),
                crew_contracts(*)
            `)
            .eq('is_active', false) // Filter Pending
            .order('created_at', { ascending: false });

        if (data) setCandidates(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchCandidates();
    }, []);

    const handleApprove = async (id: string, name: string) => {
        if(!confirm(`Yakin ingin mengaktifkan ${name}?`)) return;

        // Update status crew menjadi AKTIF
        const { error } = await supabase
            .from('crew')
            .update({ is_active: true })
            .eq('id', id);

        if(error) toast.error("Gagal update database");
        else {
            toast.success(`${name} resmi menjadi karyawan aktif!`);
            fetchCandidates(); // Refresh tabel
        }
    };

    const handleReject = async (id: string) => {
        if(!confirm("Hapus data pelamar ini permanen?")) return;
        
        // Hapus Kontrak dulu (Foreign Key)
        await supabase.from('crew_contracts').delete().eq('crew_id', id);
        // Hapus Crew
        await supabase.from('crew').delete().eq('id', id);
        
        toast.success("Data pelamar dihapus.");
        fetchCandidates();
    };

    // Helper format data untuk PDF
    const preparePdfData = (crew: any) => {
        const contract = crew.crew_contracts?.[0] || {};
        const today = new Date();
        const romanMonths = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
        
        // Format Tanggal Lahir (YYYY-MM-DD -> DD MMMM YYYY)
        const dob = crew.date_of_birth ? new Date(crew.date_of_birth).toLocaleDateString('id-ID', { dateStyle: 'long' }) : '-';
        // Format Tanggal Mulai / Selesai
        const tglMulai = contract.start_date ? new Date(contract.start_date).toLocaleDateString('id-ID', { dateStyle: 'long' }) : '-';
        const tglSelesai = contract.end_date ? new Date(contract.end_date).toLocaleDateString('id-ID', { dateStyle: 'long' }) : '-';
        // Tanggal tanda tangan (ambil dari kontrak jika ada, fallback ke hari ini)
        const tglTandaTangan = contract.signature_date ? new Date(contract.signature_date).toLocaleDateString('id-ID', { dateStyle: 'long' }) : today.toLocaleDateString('id-ID', { dateStyle: 'long' });

        return {
            noUrut: String(Math.floor(Math.random() * 900) + 100), // Sementara Random, nanti bisa ambil sequence DB
            bulanRomawi: romanMonths[today.getMonth()],
            tahun: String(today.getFullYear()),
            nama: String(crew.full_name || '-'),
            jenisKelamin: String(crew.gender || crew.jenis_kelamin || '-'),
            ttl: `${crew.place_of_birth || ''}, ${dob}`, // Kalau ada place_of_birth
            pendidikan: String(crew.education || crew.pendidikan || '-'),
            alamat: String(crew.address || '-'),
            kontak: String(crew.contact || crew.phone || crew.kontak || '-'),
            jabatan: 'Crew Outlet',
            outlet: String(crew.outlets?.name || 'Unknown'),
            tglMulai,
            tglSelesai,
            tglTandaTangan,
            tipePengalaman: String(contract.experience_level || 'Non-Pengalaman'),
            tipeOutlet: String(contract.outlet_type || 'Express')
        };
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Approval Kandidat Baru</h1>
                    <p className="text-muted-foreground">Review pelamar dari form publik & generate kontrak kerja.</p>
                </div>
                <Button variant="outline" onClick={fetchCandidates}>Refresh Data</Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Antrian Pelamar ({candidates.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nama Kandidat</TableHead>
                                <TableHead>Outlet Tujuan</TableHead>
                                <TableHead>Jenis Kontrak</TableHead>
                                <TableHead>SKCK</TableHead>
                                <TableHead className="text-right">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={5} className="text-center h-24">Memuat...</TableCell></TableRow>
                            ) : candidates.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center h-24 text-muted-foreground">Tidak ada pelamar baru.</TableCell></TableRow>
                            ) : (
                                candidates.map((crew) => (
                                    <TableRow key={crew.id}>
                                        <TableCell>
                                            <div className="font-bold">{crew.full_name}</div>
                                            <div className="text-xs text-muted-foreground">Masuk: {new Date(crew.crew_contracts[0]?.created_at).toLocaleDateString('id-ID')}</div>
                                        </TableCell>
                                        <TableCell><Badge variant="outline">{crew.outlets?.name}</Badge></TableCell>
                                        <TableCell>
                                            <div className="text-sm">{crew.crew_contracts[0]?.contract_type}</div>
                                            <div className="text-xs text-muted-foreground">{crew.crew_contracts[0]?.experience_level}</div>
                                        </TableCell>
                                        <TableCell>
                                            {crew.skck_url ? (
                                                <a href={crew.skck_url} target="_blank" className="text-blue-600 underline text-xs">Lihat File</a>
                                            ) : <span className="text-xs text-red-400">Tidak ada</span>}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                {/* TOMBOL PDF */}
                                                <PDFDownloadLink
                                                    document={<ContractDocument data={preparePdfData(crew)} />}
                                                    fileName={`PKWTTP_${crew.full_name}.pdf`}
                                                >
                                                    {({ loading }) => (
                                                        <Button size="sm" variant="secondary" disabled={loading}>
                                                            {loading ? <Loader2 className="animate-spin w-4 h-4"/> : <FileText className="w-4 h-4 mr-2"/>}
                                                            Kontrak
                                                        </Button>
                                                    )}
                                                </PDFDownloadLink>

                                                {/* TOMBOL APPROVE */}
                                                <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleApprove(crew.id, crew.full_name)}>
                                                    <CheckCircle className="w-4 h-4 mr-2"/> Terima
                                                </Button>

                                                {/* TOMBOL TOLAK */}
                                                <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => handleReject(crew.id)}>
                                                    <XCircle className="w-4 h-4"/>
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}