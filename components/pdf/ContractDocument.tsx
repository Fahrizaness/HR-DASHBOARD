import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';

// --- STYLE SHEET ---
const styles = StyleSheet.create({
  page: { 
    paddingTop: 110, // Memberi ruang untuk Header Logo
    paddingBottom: 70, // Memberi ruang untuk Footer
    paddingLeft: 50, 
    paddingRight: 50, 
    fontSize: 11, 
    fontFamily: 'Times-Roman', 
    lineHeight: 1.3 
  },
  
  // --- HEADER & FOOTER (FIXED) ---
  headerSection: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center'
  },
  logoImage: {
    width: 250, // Sesuaikan ukuran logo Anda
    height: 'auto',
    objectFit: 'contain'
  },
  
  footerSection: {
    position: 'absolute',
    bottom: 20,
    left: 50,
    right: 50,
    borderTop: '1px solid #000',
    paddingTop: 8,
    alignItems: 'center'
  },
  footerText: {
    fontSize: 9,
    fontFamily: 'Times-Roman',
    textAlign: 'center',
    color: '#333'
  },

  // --- CONTENT STYLES ---
  titleContainer: { 
    textAlign: 'center', 
    marginBottom: 20 
  },
  title: { 
    fontSize: 12, 
    fontFamily: 'Times-Bold', 
    textDecoration: 'underline', 
    marginBottom: 2 
  },
  subtitle: { 
    fontSize: 11, 
    fontFamily: 'Times-Bold',
    marginBottom: 15
  },

  text: { 
    marginBottom: 6, 
    textAlign: 'justify', 
    fontSize: 11,
    fontFamily: 'Times-Roman' 
  },

  // --- UTILS (NO fontWeight/fontStyle) ---
  bold: { fontFamily: 'Times-Bold', fontWeight: 'normal' },
  italic: { fontFamily: 'Times-Italic', fontStyle: 'normal' },
  boldItalic: { fontFamily: 'Times-BoldItalic', fontWeight: 'normal', fontStyle: 'normal' },

  // --- LAYOUT ---
  partyContainer: { marginBottom: 10, marginTop: 5 },
  row: { flexDirection: 'row', marginBottom: 2 },
  label: { width: 140, fontFamily: 'Times-Roman' },
  colon: { width: 10, textAlign: 'center' },
  value: { flex: 1, fontFamily: 'Times-Bold' },

  pasalTitle: { 
    fontSize: 11, 
    fontFamily: 'Times-Bold', 
    textAlign: 'center', 
    marginTop: 10, 
    marginBottom: 2 
  },
  pasalSubTitle: { 
    fontSize: 11, 
    fontFamily: 'Times-Bold', 
    textAlign: 'center', 
    marginBottom: 5 
  },
  
  listItem: { flexDirection: 'row', marginBottom: 3, marginLeft: 20, textAlign: 'justify' },
  listBullet: { width: 25, textAlign: 'left', fontFamily: 'Times-Roman' },
  listContent: { flex: 1, fontFamily: 'Times-Roman' },

  signatureSection: { 
    marginTop: 30, 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    paddingLeft: 20, 
    paddingRight: 20 
  },
  signatureBox: { width: 200, textAlign: 'center' },
  signerName: { 
    marginTop: 70, 
    textDecoration: 'underline', 
    fontFamily: 'Times-Bold' 
  }
});

// LOGIKA MATRIKS GAJI
const salaryMatrix: any = {
    "Berpengalaman": {
        "DineIn": ["2.000.000", "2.000.000", "1.750.000"], 
        "Express": ["2.000.000", "1.750.000", "1.500.000"]
    },
    "Non-Pengalaman": {
        "DineIn": ["1.750.000", "1.750.000", "1.500.000"],
        "Express": ["1.750.000", "1.500.000", "1.250.000"]
    }
};

type ContractProps = {
    data: {
        noUrut: string;
        bulanRomawi: string;
        tahun: string;
        nama: string;
        jenisKelamin: string;
        ttl: string;
        pendidikan: string;
        alamat: string;
        kontak: string;
        tglMulai: string;
        tglSelesai: string;
        tglTandaTangan: string;
        tipePengalaman: string;
        tipeOutlet: string;
    }
};

export const ContractDocument = ({ data }: ContractProps) => {
    const rawSalaries = salaryMatrix[data.tipePengalaman]?.[data.tipeOutlet] || ["-", "-", "-"];
    const g1 = rawSalaries[0];
    const g2 = rawSalaries[1];
    const g3 = rawSalaries[2];

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                
                {/* --- HEADER (LOGO) --- */}
                {/* Pastikan file 'logo.png' atau 'kop-surat.png' ada di folder public/ */}
                <View fixed style={styles.headerSection}>
                    <Image 
                        style={styles.logoImage} 
                        src="logo.png" 
                    />
                </View>

                {/* --- FOOTER (ALAMAT) --- */}
                <View fixed style={styles.footerSection}>
                    <Text style={styles.footerText}>
                        [cite_start]PT. ALTRI SEJAHTERA INDONESIA (BALISTA SUSHI & TEA) [cite: 6]
                    </Text>
                    <Text style={styles.footerText}>
                        Jl. Abdul Rahman Saleh No.69, Husen Sastranegara, Kec. [cite_start]Cicendo, Kota Bandung [cite: 7]
                    </Text>
                </View>

                {/* --- ISI KONTRAK --- */}
                
                {/* JUDUL */}
                <View style={styles.titleContainer}>
                    <Text style={styles.title}>PERJANJIAN KERJA WAKTU TIDAK TERTENTU PERCOBAAN (PKWTTP)</Text>
                    <Text style={styles.subtitle}>14/{data.noUrut}/HRD-KKPTTP/{data.bulanRomawi}/{data.tahun}</Text>
                </View>

                <Text style={styles.text}>Yang bertanda tangan di bawah ini:</Text>

                {/* PIHAK PERTAMA */}
                <View style={styles.partyContainer}>
                    <View style={styles.row}><Text style={styles.label}>Nama</Text><Text style={styles.colon}>:</Text><Text style={styles.value}>Tasya Urfah</Text></View>
                    <View style={styles.row}><Text style={styles.label}>Jabatan</Text><Text style={styles.colon}>:</Text><Text style={styles.value}>Human Resource Officer</Text></View>
                    <Text style={[styles.text, { marginTop: 4 }]}>
                        Dalam hal ini bertindak selaku atas nama <Text style={styles.bold}>PT. Altri Sejahtera Indonesia</Text> yang menaungi restoran <Text style={styles.bold}>Balista Sushi & Tea</Text>, yang beralamat di Jl. Abdul Rahman Saleh No.69, Husen Sastranegara, Kec. Cicendo, Kota Bandung, dan selanjutnya disebut sebagai <Text style={styles.bold}>Pihak Pertama</Text>.
                    </Text>
                </View>

                {/* PIHAK KEDUA */}
                <View style={styles.partyContainer}>
                    <View style={styles.row}><Text style={styles.label}>Nama</Text><Text style={styles.colon}>:</Text><Text style={styles.value}>{data.nama}</Text></View>
                    <View style={styles.row}><Text style={styles.label}>Jenis Kelamin</Text><Text style={styles.colon}>:</Text><Text style={styles.value}>{data.jenisKelamin}</Text></View>
                    <View style={styles.row}><Text style={styles.label}>Tempat & Tanggal Lahir</Text><Text style={styles.colon}>:</Text><Text style={styles.value}>{data.ttl}</Text></View>
                    <View style={styles.row}><Text style={styles.label}>Pendidikan Terakhir</Text><Text style={styles.colon}>:</Text><Text style={styles.value}>{data.pendidikan}</Text></View>
                    <View style={styles.row}><Text style={styles.label}>Alamat</Text><Text style={styles.colon}>:</Text><Text style={styles.value}>{data.alamat}</Text></View>
                    <View style={styles.row}><Text style={styles.label}>No. HP & E-mail</Text><Text style={styles.colon}>:</Text><Text style={styles.value}>{data.kontak}</Text></View>
                    <Text style={[styles.text, { marginTop: 4 }]}>
                        Dalam hal ini bertindak atas nama diri sendiri, dan selanjutnya disebut sebagai <Text style={styles.bold}>Pihak Kedua</Text>.
                    </Text>
                </View>

                <Text style={styles.text}>Pihak Pertama dan Pihak Kedua selanjutnya secara bersama-sama disebut sebagai Para Pihak.</Text>
                <Text style={styles.text}>Para Pihak sepakat untuk mengadakan perjanjian kerja dengan syarat dan ketentuan sebagai berikut:</Text>

                {/* PASAL 1 */}
                <Text style={styles.pasalTitle}>PASAL 1</Text>
                <Text style={styles.pasalSubTitle}>RUANG LINGKUP</Text>
                <View style={styles.listItem}><Text style={styles.listBullet}>1.</Text><Text style={styles.listContent}>Pihak Pertama dengan ini menyatakan menerima Pihak Kedua sebagai karyawan di Balista Sushi & Tea yang beralamat di Jl. Abdul Rahman Saleh No.69, Husen Sastranegara, Kec. Cicendo, Kota Bandung, sesuai dengan spesialisasi yang dimiliki.</Text></View>
                <View style={styles.listItem}><Text style={styles.listBullet}>2.</Text><Text style={styles.listContent}>Pihak Kedua sebagai Karyawan Outlet di Balista Sushi & Tea Pihak Pertama.</Text></View>

                {/* PASAL 2 */}
                <Text style={styles.pasalTitle}>PASAL 2</Text>
                <Text style={styles.pasalSubTitle}>HAK DAN KEWAJIBAN</Text>
                
                <Text style={[styles.text, { marginLeft: 15 }, styles.bold]}>1. Pihak Pertama</Text>
                <Text style={[styles.text, { marginLeft: 30 }, styles.boldItalic]}>a. Hak Pihak Pertama</Text>
                
                <View style={[styles.listItem, { marginLeft: 45 }]}><Text style={styles.listBullet}>1)</Text><Text style={styles.listContent}>Mengawasi Pihak Kedua dalam melakukan tugasnya sebagai Karyawan Outlet di restoran Pihak Pertama.</Text></View>
                <View style={[styles.listItem, { marginLeft: 45 }]}><Text style={styles.listBullet}>2)</Text><Text style={styles.listContent}>Memberikan teguran dan sanksi bila Pihak Kedua tidak menjalankan aturan dan ketentuan yang berlaku di restoran yang telah ditetapkan oleh Wakil Direktur Divisi Sumber Daya Manusia / Vice President Human Resource.</Text></View>
                <View style={[styles.listItem, { marginLeft: 45 }]}><Text style={styles.listBullet}>3)</Text><Text style={styles.listContent}>Meminta Pihak Kedua agar mematuhi dan taat pada etika Balista Sushi & Tea dan etika lainnya yang bersifat umum.</Text></View>
                <View style={[styles.listItem, { marginLeft: 45 }]}><Text style={styles.listBullet}>4)</Text><Text style={styles.listContent}>Mengawasi pelaksanaan tugas serta mewajibkan Pihak Kedua melakukan absensi pada hari kerja yang ditentukan.</Text></View>
                <View style={[styles.listItem, { marginLeft: 45 }]}><Text style={styles.listBullet}>5)</Text><Text style={styles.listContent}>Mewajibkan Pihak Kedua untuk hadir pada evaluasi mingguan di outlet untuk memberikan masukan yang positif dalam rangka kemajuan Balista Sushi & Tea.</Text></View>
                <View style={[styles.listItem, { marginLeft: 45 }]}><Text style={styles.listBullet}>6)</Text><Text style={styles.listContent}>Menahan ijazah Pihak Kedua selama masa kontrak dalam Perjanjian Kerja Waktu Tidak Tertentu Percobaan (PKWTTP) dalam jangka waktu yang telah ditentukan pada pasal 3 yang mana akan dikembalikan setelah kontrak ini berakhir.</Text></View>

                <Text style={[styles.text, { marginLeft: 30 }, styles.boldItalic]}>b. Kewajiban Pihak Pertama</Text>
                
                <View style={[styles.listItem, { marginLeft: 45 }]}><Text style={styles.listBullet}>1)</Text><Text style={styles.listContent}>Memberikan imbalan atau jasa kepada Pihak Kedua sebagai tenaga Karyawan Outlet pada bulan ke-1 sebesar Rp{g1} (sesuai hari kerja dari tanggal masuk), pada bulan ke-2 sebesar Rp{g2}, dan pada bulan ke-3 sebesar Rp{g3}.</Text></View>
                <View style={[styles.listItem, { marginLeft: 45 }]}><Text style={styles.listBullet}>2)</Text><Text style={styles.listContent}>Setelah masa kontrak, Karyawan Outlet akan mendapatkan gaji sebesar Rp 1.500.000 dan tambahan komisi berdasarkan penjualan outlet.</Text></View>
                <View style={[styles.listItem, { marginLeft: 45 }]}><Text style={styles.listBullet}>3)</Text><Text style={styles.listContent}>Memberikan perlindungan hukum sepanjang Pihak Kedua melaksanakan tugas dengan baik.</Text></View>

                <Text style={[styles.text, { marginLeft: 15, marginTop: 5 }, styles.bold]}>2. Pihak Kedua</Text>
                <Text style={[styles.text, { marginLeft: 30 }, styles.boldItalic]}>a. Hak Pihak Kedua</Text>
                
                <View style={[styles.listItem, { marginLeft: 45 }]}><Text style={styles.listBullet}>1)</Text><Text style={styles.listContent}>Mendapatkan imbalan atau jasa kepada Pihak Kedua sebagai tenaga Karyawan Outlet sebagaimana telah dijelaskan pada pasal 2 poin 1b setiap bulannya.</Text></View>
                <View style={[styles.listItem, { marginLeft: 45 }]}><Text style={styles.listBullet}>2)</Text><Text style={styles.listContent}>Mendapatkan perlindungan hukum sepanjang melaksanakan tugas dengan baik.</Text></View>
                <View style={[styles.listItem, { marginLeft: 45 }]}><Text style={styles.listBullet}>3)</Text><Text style={styles.listContent}>Memberikan ijazah terakhir kepada Pihak Pertama hingga kontrak berakhir.</Text></View>

                <Text style={[styles.text, { marginLeft: 30 }, styles.boldItalic]}>b. Kewajiban Pihak Kedua</Text>
                
                <View style={[styles.listItem, { marginLeft: 45 }]}><Text style={styles.listBullet}>1)</Text><Text style={styles.listContent}>Melaksanakan aktifitas dengan baik dan benar.</Text></View>
                <View style={[styles.listItem, { marginLeft: 45 }]}><Text style={styles.listBullet}>2)</Text><Text style={styles.listContent}>Menjalankan aturan dan ketentuan yang berlaku di Balista Sushi & Tea yang telah ditetapkan oleh Vice President Human Resource.</Text></View>
                <View style={[styles.listItem, { marginLeft: 45 }]}><Text style={styles.listBullet}>3)</Text><Text style={styles.listContent}>Mematuhi dan taat pada etika Balista Sushi & Tea serta etika lainnya yang bersifat umum.</Text></View>
                <View style={[styles.listItem, { marginLeft: 45 }]}><Text style={styles.listBullet}>4)</Text><Text style={styles.listContent}>Melaksanakan tugas dengan baik serta melakukan absensi pada hari kerja yang ditentukan.</Text></View>
                <View style={[styles.listItem, { marginLeft: 45 }]}><Text style={styles.listBullet}>5)</Text><Text style={styles.listContent}>Menghadiri evaluasi mingguan di outlet untuk memberikan masukan yang positif dalam rangka kemajuan restoran.</Text></View>
            </Page>

            <Page size="A4" style={styles.page}>
                {/* PASAL 3 */}
                <Text style={styles.pasalTitle}>PASAL 3</Text>
                <Text style={styles.pasalSubTitle}>JANGKA WAKTU</Text>
                <View style={styles.listItem}><Text style={styles.listBullet}>1.</Text><Text style={styles.listContent}>Kontrak ini berlaku untuk jangka waktu 3 (tiga) bulan, terhitung sejak tanggal <Text style={styles.bold}>{data.tglMulai}</Text> dan berakhir pada tanggal <Text style={styles.bold}>{data.tglSelesai}</Text>.</Text></View>
                <View style={styles.listItem}><Text style={styles.listBullet}>2.</Text><Text style={styles.listContent}>Selama masa percobaan tersebut, Pihak Pertama akan melakukan penilaian secara berkala terhadap kinerja karyawan terkait.</Text></View>
                <View style={styles.listItem}><Text style={styles.listBullet}>3.</Text><Text style={styles.listContent}>Pihak Pertama akan memberitahukan kepada Pihak Kedua terkait hasil penilaian akhir selama masa kontrak dengan keputusan mengakhiri atau memperpanjang kontrak selambat-lambatnya 2 (dua) minggu sebelum masa kontrak berakhir.</Text></View>
                <View style={styles.listItem}><Text style={styles.listBullet}>4.</Text><Text style={styles.listContent}>Selama masa kontrak, Pihak Pertama dapat mengakhiri secara sepihak hubungan kerja dengan ketentuan yang akan dijelaskan pada pasal pemutusan perjanjian kerja.</Text></View>

                {/* PASAL 4 */}
                <Text style={styles.pasalTitle}>PASAL 4</Text>
                <Text style={styles.pasalSubTitle}>PEMUTUSAN PERJANJIAN KERJA</Text>
                <Text style={styles.text}>Pemutusan perjanjian kerja dapat dilakukan apabila:</Text>
                <View style={styles.listItem}><Text style={styles.listBullet}>1.</Text><Text style={styles.listContent}>Meninggal dunia.</Text></View>
                <View style={styles.listItem}><Text style={styles.listBullet}>2.</Text><Text style={styles.listContent}>Apabila Pihak Kedua dinyatakan tidak lagi bisa beraktifitas karena kendala kesehatan dan itu dinyatakan dengan keterangan dokter.</Text></View>
                <View style={styles.listItem}><Text style={styles.listBullet}>3.</Text><Text style={styles.listContent}>Diberhentikan oleh Pihak Pertama yang mana Pihak Kedua melakukan pelanggaran disiplin dan atau etika yang bertentangan dengan norma yang dianut.</Text></View>
                <View style={styles.listItem}><Text style={styles.listBullet}>4.</Text><Text style={styles.listContent}>Apabila Pihak Pertama ingin memutuskan perjanjian kerja sebelum berakhir waktu perjanjian, maka pihak yang akan memutuskan perjanjian kerja wajib memberitahukan secara lisan 1 (satu) minggu sebelumnya dan berkewajiban bagi pihak yang memutuskan untuk menyampaikan alasan yang rasional dan berupaya seminimal mungkin tidak merugikan pihak lainnya.</Text></View>
                <View style={styles.listItem}><Text style={styles.listBullet}>5.</Text><Text style={styles.listContent}>Pihak Kedua tidak dapat memutuskan hubungan kerja sebagaimana telah disepakati pada tahap penawaran yang mana Pihak Kedua telah bersedia menyerahkan ijazah hingga kontrak berakhir.</Text></View>

                {/* PASAL 5 */}
                <Text style={styles.pasalTitle}>PASAL 5</Text>
                <Text style={styles.pasalSubTitle}>PENYELESAIAN PERSELISIHAN</Text>
                <View style={styles.listItem}><Text style={styles.listBullet}>1.</Text><Text style={styles.listContent}>Apabila terdapat permasalahan atau perselisihan dalam perjanjian ini, maka para pihak akan menyelesaikan secara musyawarah untuk memperoleh kata sepakat.</Text></View>
                <View style={styles.listItem}><Text style={styles.listBullet}>2.</Text><Text style={styles.listContent}>Dalam hal terjadi perselisihan pendapat dan permasalahan yang tidak dapat diselesaikan secara musyawarah atau kata sepakat, maka para pihak atau pihak yang merasa dirugikan dapat meminta bantuan Pihak Ketiga untuk bertindak sebagai penengah.</Text></View>
                <View style={styles.listItem}><Text style={styles.listBullet}>3.</Text><Text style={styles.listContent}>Apabila perselisihan masih tidak dapat diselesaikan para pihak sepakat maka akan diselesaikan sesuai dengan peraturan perundang-undangan yang berlaku.</Text></View>

                {/* PASAL 6 */}
                <Text style={styles.pasalTitle}>PASAL 6</Text>
                <Text style={styles.pasalSubTitle}>LAIN-LAIN</Text>
                <View style={styles.listItem}><Text style={styles.listBullet}>1.</Text><Text style={styles.listContent}>Segala peraturan dan atau ketentuan baik yang telah ditetapkan oleh CEO Balista Sushi & Tea.</Text></View>
                <View style={styles.listItem}><Text style={styles.listBullet}>2.</Text><Text style={styles.listContent}>Merupakan kesatuan dan bagian yang tidak dapat dipisahkan dari perjanjian kerja ini, walaupun tidak dilampirkan.</Text></View>
                <View style={styles.listItem}><Text style={styles.listBullet}>3.</Text><Text style={styles.listContent}>Hal-hal mengenai perubahan ketentuan atau yang belum, atau yang tidak ditentukan dalam perjanjian kerja ini akan diatur kemudian atas persetujuan para pihak dalam suatu amandemen dan merupakan bagian yang tidak terpisahkan dengan perjanjian kerja ini.</Text></View>

                {/* PASAL 7 */}
                <Text style={styles.pasalTitle}>PASAL 7</Text>
                <Text style={styles.pasalSubTitle}>PENUTUP</Text>
                <Text style={styles.text}>Perjanjian kerja ini dibuat rangkap 1 (satu) dengan dibubuhi materai dan mempunyai kekuatan hukum setelah ditandatangani oleh Pihak Pertama dan Pihak Kedua pada hari dan tanggal yang telah disebutkan.</Text>

                <Text style={[styles.text, { marginTop: 20 }]}>Bandung, {data.tglTandaTangan}</Text>
                
                <View style={styles.signatureSection}>
                    <View style={styles.signatureBox}>
                        <Text style={styles.bold}>PIHAK KEDUA</Text>
                        <Text style={styles.signerName}>{data.nama}</Text>
                    </View>
                    <View style={styles.signatureBox}>
                        <Text style={styles.bold}>PIHAK PERTAMA</Text>
                        <Text>Balista Sushi & Tea.</Text>
                        <Text style={styles.signerName}>Tasya Urfah</Text>
                    </View>
                </View>
            </Page>
        </Document>
    );
};