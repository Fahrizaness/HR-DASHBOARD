// app/api/analytics/predict/route.ts

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

// --- LOGIC RIDWAN (Logistic Regression Simulation) ---
// Rumus: z = w0 + (w1 * distance) + (w2 * tenure_months)
// P(Churn) = 1 / (1 + exp(-z))
function calculateChurnRisk(crew: any) {
  const distance = crew.distance_km || 0; // Jarak dalam KM
  
  // Hitung masa kerja (bulan)
  const joinDate = crew.join_date ? new Date(crew.join_date) : new Date();
  const now = new Date();
  const tenureMonths = (now.getFullYear() - joinDate.getFullYear()) * 12 + (now.getMonth() - joinDate.getMonth());
  
  // KOEFISIEN (Hasil Training Model - Anggaplah statis untuk demo)
  // Jarak positif churn (semakin jauh semakin ingin keluar)
  // Tenure negatif churn (semakin lama kerja semakin loyal)
  const w_distance = 0.15; 
  const w_tenure = -0.05; 
  const bias = -2.0; 

  const z = bias + (w_distance * distance) + (w_tenure * tenureMonths);
  const probability = 1 / (1 + Math.exp(-z)); // Sigmoid Function
  
  const score = Math.round(probability * 100);
  
  let riskLevel = "LOW";
  if (score > 75) riskLevel = "HIGH";
  else if (score > 40) riskLevel = "MEDIUM";

  const factors = [];
  if (distance > 15) factors.push("Jarak Jauh (>15km)");
  if (tenureMonths < 3) factors.push("Masa Probation");
  if (distance > 10 && tenureMonths < 6) factors.push("Rawan (Jauh & Baru)");

  return { score, riskLevel, factors };
}

export async function POST(req: NextRequest) {
  try {
    // 1. Ambil semua karyawan aktif
    const { data: crews, error } = await supabase
      .from("crew")
      .select("id, full_name, distance_km, join_date")
      .eq("is_active", true);

    if (error) throw error;
    if (!crews) return NextResponse.json({ message: "No crew data" });

    const predictions = [];

    // 2. Loop perhitungan risiko
    for (const crew of crews) {
      const { score, riskLevel, factors } = calculateChurnRisk(crew);

      predictions.push({
        crew_id: crew.id,
        risk_score: score,
        risk_level: riskLevel,
        factors: factors,
        created_at: new Date().toISOString() // Timestamp hari ini
      });
    }

    // 3. Simpan hasil ke tabel churn_predictions (Upsert)
    // Kita hapus dulu prediksi lama untuk crew yg sama hari ini agar tidak duplikat
    // Atau gunakan upsert jika constraint unique sudah jalan.
    const { error: insertError } = await supabase
      .from("churn_predictions")
      .upsert(predictions, { onConflict: "crew_id, created_at" }); // Sesuaikan constraint db

    if (insertError) throw insertError;

    return NextResponse.json({ 
      success: true, 
      processed: predictions.length,
      sample: predictions[0] 
    });

  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}