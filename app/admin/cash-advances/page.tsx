"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, XCircle, Banknote, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function AdminCashAdvances() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [approveForm, setApproveForm] = useState({
    approved_amount: 0,
    deduction_plan_amount: 0,
    status: 'approved'
  });

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("cash_advances")
      .select(`
        *,
        crew:crew_id (full_name, outlets(name))
      `)
      .order("created_at", { ascending: false });
    if (data) setRequests(data);
    setLoading(false);
  };

  const openApproval = (req: any) => {
    setSelectedReq(req);
    setApproveForm({
      approved_amount: req.amount, 
      deduction_plan_amount: req.deduction_plan_amount || req.amount, 
      status: 'approved'
    });
    setIsDialogOpen(true);
  };

  const handleProcess = async () => {
    if (!selectedReq) return;
    try {
      const payload: any = {
          status: approveForm.status,
      };

      // Jika Disetujui, set Approved Amount & Reset Remaining Amount
      if (approveForm.status === 'approved') {
          payload.approved_amount = approveForm.approved_amount;
          payload.deduction_plan_amount = approveForm.deduction_plan_amount;
          // Hanya set remaining_amount jika ini persetujuan awal (bukan edit)
          if (selectedReq.status === 'pending') {
             payload.remaining_amount = approveForm.approved_amount; 
          }
      } else {
          payload.remaining_amount = 0;
          payload.approved_amount = 0;
      }

      const { error } = await supabase
        .from("cash_advances")
        .update(payload)
        .eq("id", selectedReq.id);

      if (error) throw error;
      
      toast.success(`Pengajuan berhasil diproses: ${approveForm.status}`);
      setIsDialogOpen(false);
      fetchRequests();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const formatRp = (n: number) => new Intl.NumberFormat('id-ID').format(n);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-2xl font-bold">Manajemen Kasbon</h1>
            <p className="text-muted-foreground">Monitor dan setujui pengajuan pinjaman karyawan.</p>
        </div>
      </div>

      <div className="rounded border bg-white shadow overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>Tgl</TableHead>
              <TableHead>Nama Karyawan</TableHead>
              <TableHead>Alasan</TableHead>
              <TableHead>Diajukan</TableHead>
              <TableHead>Disetujui</TableHead>
              <TableHead>Cicilan/Bln</TableHead>
              <TableHead>Sisa Hutang</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={9} className="text-center h-24"><Loader2 className="animate-spin h-6 w-6 mx-auto"/></TableCell></TableRow> :
            requests.length === 0 ? <TableRow><TableCell colSpan={9} className="text-center h-24 text-muted-foreground">Tidak ada data.</TableCell></TableRow> :
            requests.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-xs">{new Date(r.request_date).toLocaleDateString('id-ID')}</TableCell>
                <TableCell>
                    <div className="font-bold">{r.crew?.full_name}</div>
                    <div className="text-[10px] text-muted-foreground">{r.crew?.outlets?.name}</div>
                </TableCell>
                <TableCell className="max-w-[150px] truncate text-xs" title={r.reason}>{r.reason}</TableCell>
                <TableCell>{formatRp(r.amount)}</TableCell>
                <TableCell className="font-bold text-blue-600">{r.approved_amount > 0 ? formatRp(r.approved_amount) : '-'}</TableCell>
                <TableCell className="text-xs text-slate-500">{r.deduction_plan_amount > 0 ? formatRp(r.deduction_plan_amount) : '-'}</TableCell>
                <TableCell>
                    {r.status === 'approved' && r.remaining_amount > 0 ? (
                        <span className="text-red-600 font-bold">{formatRp(r.remaining_amount)}</span>
                    ) : r.status === 'paid_off' || r.remaining_amount === 0 && r.status === 'approved' ? (
                        <span className="text-green-600 font-bold flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Lunas</span>
                    ) : '-'}
                </TableCell>
                <TableCell>
                    {r.status === 'pending' && <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Menunggu</Badge>}
                    {r.status === 'approved' && r.remaining_amount > 0 && <Badge className="bg-blue-600">Aktif</Badge>}
                    {r.status === 'rejected' && <Badge variant="destructive">Ditolak</Badge>}
                    {(r.status === 'paid_off' || (r.status === 'approved' && r.remaining_amount <= 0)) && <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">Lunas</Badge>}
                </TableCell>
                <TableCell className="text-right">
                    {r.status === 'pending' ? (
                        <Button size="sm" onClick={() => openApproval(r)}>
                            Proses
                        </Button>
                    ) : (
                        <Button size="sm" variant="ghost" disabled>
                            Selesai
                        </Button>
                    )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* MODAL APPROVAL */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
            <DialogHeader><DialogTitle>Proses Pengajuan Kasbon</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="p-3 bg-blue-50 border border-blue-100 rounded text-sm space-y-1">
                    <p className="flex justify-between"><span>Nama:</span> <strong>{selectedReq?.crew?.full_name}</strong></p>
                    <p className="flex justify-between"><span>Pengajuan:</span> <strong>Rp {selectedReq && formatRp(selectedReq.amount)}</strong></p>
                    <div className="border-t border-blue-200 my-2 pt-1">
                        <span className="text-xs text-slate-500">Alasan:</span>
                        <p className="italic text-slate-700">{selectedReq?.reason}</p>
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <Label>Disetujui (Rp)</Label>
                        <Input 
                            type="number" 
                            className="font-bold text-blue-700"
                            value={approveForm.approved_amount} 
                            onChange={(e) => setApproveForm({...approveForm, approved_amount: Number(e.target.value)})}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Potongan / Bulan (Rp)</Label>
                        <Input 
                            type="number" 
                            value={approveForm.deduction_plan_amount} 
                            onChange={(e) => setApproveForm({...approveForm, deduction_plan_amount: Number(e.target.value)})}
                        />
                    </div>
                </div>
                
                <div className="space-y-2">
                    <Label>Keputusan</Label>
                    <div className="flex gap-2">
                        <Button 
                            className={`flex-1 ${approveForm.status === 'approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-100 text-slate-900 hover:bg-slate-200'}`}
                            onClick={() => setApproveForm({...approveForm, status: 'approved'})}
                        >
                            <CheckCircle className="mr-2 h-4 w-4"/> Setujui
                        </Button>
                        <Button 
                             className={`flex-1 ${approveForm.status === 'rejected' ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-slate-100 text-slate-900 hover:bg-slate-200'}`}
                             onClick={() => setApproveForm({...approveForm, status: 'rejected'})}
                        >
                            <XCircle className="mr-2 h-4 w-4"/> Tolak
                        </Button>
                    </div>
                </div>
            </div>
            <div className="flex justify-end pt-2 border-t">
                <Button onClick={handleProcess} disabled={approveForm.approved_amount <= 0 && approveForm.status === 'approved'}>
                    Simpan Keputusan
                </Button>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}