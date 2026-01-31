"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Clock, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function CrewKasbonPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  
  // Form Data
  const [formData, setFormData] = useState({
      amount: "",
      reason: "",
      deduction_plan: ""
  });

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if(user) {
        // Cari Crew ID
        const { data: crew } = await supabase.from('crew').select('id').eq('auth_user_id', user.id).single();
        if(crew) {
            const { data } = await supabase.from('cash_advances').select('*').eq('crew_id', crew.id).order('request_date', {ascending: false});
            setHistory(data || []);
        }
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if(!formData.amount || !formData.reason) return toast.error("Mohon isi jumlah dan alasan!");
    
    setSubmitting(true);
    try {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: crew } = await supabase.from('crew').select('id').eq('auth_user_id', user?.id).single();
        
        if(!crew) throw new Error("User tidak valid");

        const { error } = await supabase.from('cash_advances').insert({
            crew_id: crew.id,
            amount: Number(formData.amount),
            reason: formData.reason,
            deduction_plan_amount: Number(formData.deduction_plan), // Usulan potongan
            request_date: new Date(),
            status: 'pending',
            remaining_amount: 0, // Awal 0, akan diupdate admin saat approve
            agreement_statement: true
        });

        if(error) throw error;
        toast.success("Pengajuan berhasil dikirim!");
        setIsOpen(false);
        setFormData({ amount: "", reason: "", deduction_plan: "" });
        fetchHistory();

    } catch (e: any) {
        toast.error(e.message);
    } finally {
        setSubmitting(false);
    }
  };

  const formatRp = (n: number) => new Intl.NumberFormat('id-ID').format(n);

  return (
    <div className="space-y-4 pb-20">
        <div className="flex justify-between items-center bg-blue-50 p-4 rounded-lg border border-blue-100">
             <div>
                <h2 className="font-bold text-lg text-blue-900">Kasbon Saya</h2>
                <p className="text-xs text-blue-600">Kelola pengajuan pinjaman</p>
             </div>
             <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700 shadow-sm"><Plus className="mr-1 h-4 w-4"/> Ajukan Baru</Button>
                </DialogTrigger>
                <DialogContent className="max-w-xs sm:max-w-md rounded-xl">
                    <DialogHeader><DialogTitle>Form Pengajuan Kasbon</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>Jumlah Kasbon (Rp)</Label>
                            <Input type="number" placeholder="Contoh: 500000" value={formData.amount} onChange={e=>setFormData({...formData, amount: e.target.value})}/>
                        </div>
                        <div className="space-y-2">
                            <Label>Sanggup Potong Gaji (Per Bulan)</Label>
                            <Input type="number" placeholder="Contoh: 250000" value={formData.deduction_plan} onChange={e=>setFormData({...formData, deduction_plan: e.target.value})}/>
                            <p className="text-[10px] text-muted-foreground">Opsional: Masukkan usulan cicilan.</p>
                        </div>
                        <div className="space-y-2">
                            <Label>Alasan / Keperluan</Label>
                            <Textarea placeholder="Contoh: Biaya berobat keluarga" value={formData.reason} onChange={e=>setFormData({...formData, reason: e.target.value})}/>
                        </div>
                        <div className="text-xs text-yellow-800 bg-yellow-50 p-3 rounded border border-yellow-100">
                            *Dengan mengajukan ini, saya setuju gaji saya dipotong sesuai kesepakatan manajemen.
                        </div>
                        <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
                            {submitting ? <Loader2 className="animate-spin mr-2"/> : null} Kirim Pengajuan
                        </Button>
                    </div>
                </DialogContent>
             </Dialog>
        </div>

        <h3 className="font-semibold text-sm text-slate-600 mt-6">Riwayat Pengajuan</h3>

        {loading ? <div className="text-center py-4"><Loader2 className="animate-spin mx-auto text-blue-500"/></div> : 
         history.length === 0 ? <p className="text-center text-muted-foreground py-10 text-sm">Belum ada riwayat kasbon.</p> :
         history.map(item => (
            <Card key={item.id} className="mb-3 shadow-sm border border-slate-100 hover:border-blue-200 transition-all">
                <CardContent className="p-4">
                    <div className="flex justify-between mb-3 border-b border-slate-50 pb-2">
                        <span className="text-xs text-slate-400 font-medium">{new Date(item.request_date).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</span>
                        {item.status === 'pending' && <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-[10px]"><Clock className="w-3 h-3 mr-1"/> Diproses</Badge>}
                        {item.status === 'approved' && item.remaining_amount > 0 && <Badge className="bg-blue-600 text-[10px]"><CheckCircle2 className="w-3 h-3 mr-1"/> Aktif</Badge>}
                        {item.status === 'rejected' && <Badge variant="destructive" className="text-[10px]"><XCircle className="w-3 h-3 mr-1"/> Ditolak</Badge>}
                        {(item.status === 'paid_off' || (item.status === 'approved' && item.remaining_amount <= 0)) && <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200 text-[10px]"><CheckCircle2 className="w-3 h-3 mr-1"/> Lunas</Badge>}
                    </div>
                    
                    <div className="flex justify-between items-end">
                        <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Jumlah</p>
                            <p className="font-bold text-lg text-slate-800">{formatRp(item.amount)}</p>
                            <p className="text-xs text-slate-500 mt-1 truncate max-w-[180px]">{item.reason}</p>
                        </div>
                        
                        {item.status === 'approved' && (
                            <div className="text-right">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Sisa Hutang</p>
                                <p className={`font-bold text-lg ${item.remaining_amount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    {formatRp(item.remaining_amount)}
                                </p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
         ))
        }
    </div>
  );
}