// File: app/api/outlets/route.ts

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET() {
  try {
    // --- PERBAIKAN DISINI ---
    // Ganti .select('id, name') menjadi .select('*')
    // Agar kolom latitude, longitude, dan address ikut terambil
    const { data, error } = await supabase
      .from("outlets")
      .select("*") 
      .order("name", { ascending: true });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}