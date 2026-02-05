import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "@/app/globals.css"; 
import { Toaster } from "sonner";

// Panggil font Poppins
const poppins = Poppins({ 
    subsets: ["latin"], 
    weight: ["300", "400", "500", "600", "700"],
    variable: '--font-poppins'
});

export const metadata: Metadata = {
  title: "Form Data Karyawan - PT Altri Sejahtera Indonesia",
  description: "Formulir digital onboarding karyawan baru.",
};

export default function ApplyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // JANGAN PAKAI <html> ATAU <body> LAGI DI SINI
  // Cukup bungkus dengan div yang membawa class font poppins
  return (
    <div className={poppins.className}>
        {children}
        <Toaster position="top-center" richColors />
    </div>
  );
}