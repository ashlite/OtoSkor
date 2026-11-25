import guideChassisApronImg from '@/src/assets/images/guide_chassis_apron_1795583805745.jpg';
import guideElectricalAcImg from '@/src/assets/images/guide_electrical_ac_1795583809247.jpg';
import guideEngineOilImg from '@/src/assets/images/guide_engine_oil_1795583804896.jpg';
import guideExteriorPanelImg from '@/src/assets/images/guide_exterior_panel_1795583807445.jpg';
import guideInteriorFloodImg from '@/src/assets/images/guide_interior_flood_1795583807826.jpg';
import guideUndercarriageTiresImg from '@/src/assets/images/guide_undercarriage_tires_1795583806881.jpg';

export type VisualGuideId =
  | 'engine'
  | 'chassis'
  | 'undercarriage'
  | 'exterior'
  | 'interior'
  | 'electrical';

export interface VisualGuide {
  id: VisualGuideId;
  title: string;
  subtitle: string;
  imageUrl: string;
  goodSigns: string[];
  badSigns: string[];
  fieldTip: string;
}

export interface InspectionItemDefinition {
  id: string;
  categoryId: string;
  label: string;
  hint: string;
  isRedFlagCandidate?: boolean;
  redFlagLabel?: string;
  defaultRepairEstimate?: number;
  guideId: VisualGuideId;
}

export interface InspectionCategoryDefinition {
  id: string;
  title: string;
  weight: number; // Sum across all 7 categories = 100
  guideId: VisualGuideId;
  description: string;
  photoExamples: string[];
  items: InspectionItemDefinition[];
}

export const VISUAL_GUIDES: Record<VisualGuideId, VisualGuide> = {
  engine: {
    id: 'engine',
    title: 'Mesin, Oli & Sistem Pendingin',
    subtitle: 'Bandingkan kondisi blok mesin, tutup oli, dan dipstick',
    imageUrl: guideEngineOilImg,
    goodSigns: [
      'Blok mesin dan paking tutup klep kering tanpa rembesan oli basah.',
      'Oli di dipstick berwarna cokelat keemasan/gelap wajar, tidak berbuih.',
      'Bagian dalam tutup pengisian oli bersih tanpa kerak lumpur atau cairan putih susu.',
    ],
    badSigns: [
      'Rembesan oli menetes di sekitar gasket silinder atau bawah bak oli.',
      'Cairan seperti susu cokelat/putih (teh tarik) di tutup oli — tanda air radiator tercampur oli.',
      'Kerak hitam tebal (sludge) akibat pemilik sebelumnya jarang ganti oli.',
    ],
    fieldTip:
      'Buka tutup pengisian oli sebelum mesin panas, lalu sorot pakai senter HP ke dalam noken as untuk mengecek kebersihan logam dan kerak oli.',
  },
  chassis: {
    id: 'chassis',
    title: 'Rangka, Apron & Indikasi Tabrak',
    subtitle: 'Identifikasi keaslian tulangan ruang mesin dan titik las pabrik',
    imageUrl: guideChassisApronImg,
    goodSigns: [
      'Titik las (spot weld) bulat rapi seragam di apron kiri-kanan dan rumah sokbreker.',
      'Sealer/lem sambungan pelat bawaan pabrik rata, tidak kaku atau terkelupas.',
      'Baut kap mesin, fender, dan penyangga radiator belum pernah dibuka paksa (cat baut utuh).',
    ],
    badSigns: [
      'Tulangan apron keriting, bekas ketok palu, atau las ulang kasar tidak beraturan.',
      'Cat baru menyemprot bagian dalam ruang mesin (overspray) menutupi kabel atau baut.',
      'Posisi dudukan radiator atau lampu depan miring dan tidak simetris kiri-kanan.',
    ],
    fieldTip:
      'Bandingkan bentuk tulangan apron sebelah kiri dan kanan secara simetris. Ketidaksimetrisan hampir pasti menandakan bekas benturan depan.',
  },
  undercarriage: {
    id: 'undercarriage',
    title: 'Kaki-Kaki, Ban, Rem & Kolong',
    subtitle: 'Cek keausan ban, piringan cakram, dan karet boot as roda',
    imageUrl: guideUndercarriageTiresImg,
    goodSigns: [
      'Alur kembang ban tebal dan aus merata dari sisi dalam hingga sisi luar.',
      'Permukaan piringan cakram rata halus tanpa bibir tajam atau karat dalam.',
      'Karet boot as roda (CV joint) dan shockbreaker kering, tidak sobek atau bocor oli.',
    ],
    badSigns: [
      'Ban botak hanya di sisi dalam atau luar (tanda spooring/kaki-kaki bermasalah).',
      'Karet boot robek memuntahkan gemuk hitam atau batang shockbreaker basah oleh oli.',
      'Karat keropos tebal pada rangka bawah/arm suspensi atau bekas lumpur kering mengeras.',
    ],
    fieldTip:
      'Putar setir mentok ke kanan/kiri lalu intip bagian dalam roda depan menggunakan senter HP untuk melihat kondisi karet boot dan rembesan shock.',
  },
  exterior: {
    id: 'exterior',
    title: 'Eksterior, Nat Panel & Kualitas Cat',
    subtitle: 'Periksa presisi celah antar panel dan pantulan permukaan cat',
    imageUrl: guideExteriorPanelImg,
    goodSigns: [
      'Celah (nat) antara fender, kap mesin, dan pintu rapat konsisten dari atas ke bawah.',
      'Pantulan bayangan di bodi mobil lurus jernih seperti cermin tanpa gelombang.',
      'Warna antar panel seragam di bawah cahaya matahari atau lampu terang.',
    ],
    badSigns: [
      'Celah pintu melebar di salah satu sisi atau pintu terasa berat/turun saat ditutup.',
      'Tekstur cat kasar menyerupai kulit jeruk (orange peel) atau bergelombang akibat dempul tebal.',
      'Ada bintik debu cat, garis masking tape di karet kaca, atau warna belang antar pintu.',
    ],
    fieldTip:
      'Berjongkok sejajar lampu depan dan lihat bodi dari sudut miring ke belakang; permukaan bodi yang pernah didempul akan terlihat bergelombang.',
  },
  interior: {
    id: 'interior',
    title: 'Kabin, Rel Jok & Indikasi Banjir',
    subtitle: 'Deteksi bekas rendaman air banjir pada kolong jok dan karpet',
    imageUrl: guideInteriorFloodImg,
    goodSigns: [
      'Baut dan rel besi penyangga jok bersih mengilap bebas karat kemerahan.',
      'Karpet dasar kering, bersih, dan tidak mengeluarkan bau apek/lembap saat AC mati.',
      'Sabuk pengaman ditarik sampai habis bersih tanpa bercak air atau jamur.',
    ],
    badSigns: [
      'Rel jok dan baut bawah jok berkarat parah sementara bagian kabin atas tampak bersih.',
      'Terdapat sisa endapan lumpur halus di sela karpet dasar, soket bawah setir, atau ruang ban serep.',
      'Muncul bau parfum menyengat berlebihan untuk menutupi aroma lembap bekas banjir.',
    ],
    fieldTip:
      'Tarik sabuk pengaman (seatbelt) hingga ujung paling panjang; pemilik sering lupa membersihkan bekas garis air atau jamur di ujung dalam sabuk.',
  },
  electrical: {
    id: 'electrical',
    title: 'Kelistrikan, Aki, Sekring & Pipa AC',
    subtitle: 'Evaluasi kebersihan terminal aki, kotak sekring, dan jalur AC',
    imageUrl: guideElectricalAcImg,
    goodSigns: [
      'Terminal aki bersih kencang tanpa kerak putih/biru, indikator aki sehat.',
      'Kotak sekring (fuse box) rapi memakai soket bawaan pabrik tanpa kabel jumper tambahan.',
      'Sambungan pipa aluminium AC kering bersih tanpa kotoran debu menempel oli.',
    ],
    badSigns: [
      'Kerak asam tebal di kutub aki atau sambungan kabel dililit isolasi hitam tidak rapi.',
      'Kabel tambahan menumpuk di sekring utama (risiko korsleting atau modifikasi kelistrikan).',
      'Lembap berminyak dan berdebu hitam di sambungan pipa AC — tanda kebocoran freon/oli kompresor.',
    ],
    fieldTip:
      'Putar kunci ke posisi ON (sebelum starter) dan pastikan lampu indikator Check Engine, Airbag, dan ABS menyala lalu padam setelah mesin hidup.',
  },
};

export const INSPECTION_CATEGORIES: InspectionCategoryDefinition[] = [
  {
    id: 'engine',
    title: 'Mesin & Transmisi',
    weight: 25,
    guideId: 'engine',
    description: 'Pemeriksaan kebocoran, kualitas pelumas, sistem pendingin, dan respons transmisi.',
    photoExamples: [
      'Foto ruang mesin keseluruhan tampak atas (kap terbuka terang).',
      'Close-up paking tutup klep / sisi blok mesin untuk melihat ada tidaknya rembesan oli.',
      'Tutup pengisian oli dibuka menghadap ke atas & ujung dipstick oli.',
      'Tabung cadangan air radiator (coolant) & fan belt.',
    ],
    items: [
      {
        id: 'eng_oil_leak',
        categoryId: 'engine',
        label: 'Kebocoran Oli Blok Mesin & Cover Klep',
        hint: 'Periksa sekitar paking tutup klep, carter oli bawah, dan seal kruk as.',
        defaultRepairEstimate: 1500000,
        guideId: 'engine',
      },
      {
        id: 'eng_oil_sludge',
        categoryId: 'engine',
        label: 'Kondisi Oli & Tutup Pengisian (Bebas Sludge / Susu)',
        hint: 'Cek dipstick dan tutup oli: bebas kerak lumpur hitam atau emulsi putih.',
        isRedFlagCandidate: true,
        redFlagLabel: 'Oli mesin bercampur air / sludge parah',
        defaultRepairEstimate: 8500000,
        guideId: 'engine',
      },
      {
        id: 'eng_idle_sound',
        categoryId: 'engine',
        label: 'Suara Mesin Stasioner & Getaran Halus',
        hint: 'Tidak ada bunyi ketukan logam kasar, ngelitik, atau getaran berlebih saat AC menyala.',
        defaultRepairEstimate: 2500000,
        guideId: 'engine',
      },
      {
        id: 'eng_exhaust_smoke',
        categoryId: 'engine',
        label: 'Gas Buang Knalpot Bersih (Bebas Asap Putih/Biru)',
        hint: 'Saat digas 3.000 RPM tidak keluar asap putih pekat atau kebiruan.',
        isRedFlagCandidate: true,
        redFlagLabel: 'Knalpot mengeluarkan asap putih/biru (indikasi ring piston/seal)',
        defaultRepairEstimate: 9000000,
        guideId: 'engine',
      },
      {
        id: 'eng_cooling',
        categoryId: 'engine',
        label: 'Radiator, Selang & Cairan Coolant',
        hint: 'Air radiator menggunakan coolant (bukan air keran berkarat), kipas menyala otomatis.',
        defaultRepairEstimate: 1200000,
        guideId: 'engine',
      },
      {
        id: 'eng_transmission',
        categoryId: 'engine',
        label: 'Perpindahan Gigi / CVT Halus Tanpa Hentak',
        hint: 'Pindah tuas P-R-N-D tidak jeda lama atau menyentak keras (untuk MT: kopling ringan).',
        isRedFlagCandidate: true,
        redFlagLabel: 'Transmisi bermasalah / jedug keras',
        defaultRepairEstimate: 7500000,
        guideId: 'engine',
      },
      {
        id: 'eng_mounts_belts',
        categoryId: 'engine',
        label: 'Engine Mounting & Kondisi Fan Belt',
        hint: 'Karet belt tidak retak getas dan getaran mesin tidak merambat ke setir.',
        defaultRepairEstimate: 1500000,
        guideId: 'engine',
      },
    ],
  },
  {
    id: 'chassis',
    title: 'Rangka, Struktur & Bebas Tabrak/Banjir',
    weight: 20,
    guideId: 'chassis',
    description: 'Verifikasi keutuhan sasis utama, titik las pabrik, dan riwayat bencana.',
    photoExamples: [
      'Tulangan apron depan kiri & kanan beserta baut kap mesin / fender.',
      'Area pilar A/B (karet pintu dibuka sedikit) untuk melihat titik las pabrik.',
      'Lantai bagasi belakang (karpet & ban serep diangkat).',
      'Baut rel bawah jok & kolong bawah setir untuk mendeteksi karat banjir.',
    ],
    items: [
      {
        id: 'chs_front_apron',
        categoryId: 'chassis',
        label: 'Apron Depan, Bullhead & Spot Weld Pabrik Utuh',
        hint: 'Tulangan depan lurus simetris dengan titik las pabrik utuh dan baut kap belum dibuka.',
        isRedFlagCandidate: true,
        redFlagLabel: 'Indikasi bekas tabrak depan pada tulang apron/sasis',
        defaultRepairEstimate: 10000000,
        guideId: 'chassis',
      },
      {
        id: 'chs_pillars_roof',
        categoryId: 'chassis',
        label: 'Pilar A / B / C & Struktur Atap Lurus',
        hint: 'Buka karet pintu untuk memastikan titik las pilar asli pabrik dan bebas las sambungan.',
        isRedFlagCandidate: true,
        redFlagLabel: 'Indikasi bekas tabrak berat pada pilar/atap',
        defaultRepairEstimate: 12000000,
        guideId: 'chassis',
      },
      {
        id: 'chs_rear_trunk',
        categoryId: 'chassis',
        label: 'Lantai Bagasi & Ruang Ban Serep Utuh',
        hint: 'Pelat lantai belakang tidak penyok ketokan dan sealer pabrik rapi.',
        isRedFlagCandidate: true,
        redFlagLabel: 'Indikasi bekas tabrak belakang pada lantai bagasi',
        defaultRepairEstimate: 6000000,
        guideId: 'chassis',
      },
      {
        id: 'chs_flood_rails',
        categoryId: 'chassis',
        label: 'Baut Rel Jok, Kolom Setir & Soket Bawah Bebas Karat',
        hint: 'Periksa bagian kolong bawah dasbor dan rel jok dengan senter.',
        isRedFlagCandidate: true,
        redFlagLabel: 'Karat & bekas lumpur di bawah jok/dasbor (indikasi bekas banjir)',
        defaultRepairEstimate: 15000000,
        guideId: 'interior',
      },
      {
        id: 'chs_flood_odor',
        categoryId: 'chassis',
        label: 'Karpet Dasar & Sabuk Pengaman Bebas Bau Apek/Jamur',
        hint: 'Tarik seatbelt sampai ujung dan cium bau karpet kabin.',
        isRedFlagCandidate: true,
        redFlagLabel: 'Bau apek/jamur pada seatbelt & karpet (indikasi banjir)',
        defaultRepairEstimate: 4000000,
        guideId: 'interior',
      },
      {
        id: 'chs_glass_codes',
        categoryId: 'chassis',
        label: 'Kode Tahun Kaca Depan & Samping Sesuai Tahun Mobil',
        hint: 'Pastikan seluruh kaca masih asli atau catat jika ada kaca yang pernah pecah diganti.',
        defaultRepairEstimate: 2000000,
        guideId: 'exterior',
      },
    ],
  },
  {
    id: 'undercarriage',
    title: 'Kaki-Kaki, Rem & Ban',
    weight: 15,
    guideId: 'undercarriage',
    description: 'Evaluasi suspensi, sistem kemudi, pengereman, dan kondisi keempat ban.',
    photoExamples: [
      'Tapak ban depan & belakang beserta kode 4-digit tahun produksi di dinding ban.',
      'Celah balik velg: piringan cakram rem & kaliper.',
      'Kolong roda depan (setir diputar penuh): karet boot as roda & batang shockbreaker.',
      'Kolong sasis bagian bawah & knalpot (gunakan flash HP).',
    ],
    items: [
      {
        id: 'und_tires',
        categoryId: 'undercarriage',
        label: 'Ketebalan & Keausan Merata Ban (4 Roda + Serep)',
        hint: 'Cek kode tahun produksi ban (4 digit) dan pastikan tidak botak sebelah.',
        defaultRepairEstimate: 3600000,
        guideId: 'undercarriage',
      },
      {
        id: 'und_shocks',
        categoryId: 'undercarriage',
        label: 'Shockbreaker Kering & Redaman Stabil',
        hint: 'Tekan sudut bodi mobil; tidak memantul berkali-kali dan tabung shock kering.',
        defaultRepairEstimate: 2800000,
        guideId: 'undercarriage',
      },
      {
        id: 'und_steering_rack',
        categoryId: 'undercarriage',
        label: 'Rack Steer, Tie Rod & Ball Joint Senyap',
        hint: 'Putar setir kanan-kiri penuh; tidak ada bunyi ketek-ketek atau oblak.',
        defaultRepairEstimate: 3500000,
        guideId: 'undercarriage',
      },
      {
        id: 'und_brakes',
        categoryId: 'undercarriage',
        label: 'Piringan Cakram, Kampas & Minyak Rem',
        hint: 'Permukaan rotor halus rata tanpa alur dalam, minyak rem bening tidak hitam.',
        defaultRepairEstimate: 1500000,
        guideId: 'undercarriage',
      },
      {
        id: 'und_cv_boots',
        categoryId: 'undercarriage',
        label: 'Karet Boot As Roda & Bushing Arm Utuh',
        hint: 'Tidak ada karet sobek atau gemuk as roda berceceran di balik velg.',
        defaultRepairEstimate: 1200000,
        guideId: 'undercarriage',
      },
      {
        id: 'und_underbody_rust',
        categoryId: 'undercarriage',
        label: 'Kolong Sasis & Knalpot Bebas Karat Keropos',
        hint: 'Waspada unit bekas daerah pesisir/rob dengan karat mengelupas.',
        defaultRepairEstimate: 2500000,
        guideId: 'undercarriage',
      },
    ],
  },
  {
    id: 'exterior',
    title: 'Eksterior, Bodi & Cat',
    weight: 12,
    guideId: 'exterior',
    description: 'Pemeriksaan kerapian nat panel, orisinalitas cat, lampu, dan karet bodi.',
    photoExamples: [
      'Tampak depan serong kiri & kanan (memperlihatkan nat kap mesin, bumper, dan fender).',
      'Tampak belakang serong kiri & kanan serta celah pintu samping.',
      'Close-up mika lampu utama, foglamp, dan lampu belakang.',
      'Spion luar & karet pelipit kaca pintu.',
    ],
    items: [
      {
        id: 'ext_panel_gaps',
        categoryId: 'exterior',
        label: 'Presisi Celah (Nat) Pintu, Kap Mesin & Bagasi',
        hint: 'Celah antar panel simetris kanan-kiri, pintu menutup mantap tanpa turun.',
        defaultRepairEstimate: 1000000,
        guideId: 'exterior',
      },
      {
        id: 'ext_paint_quality',
        categoryId: 'exterior',
        label: 'Kerataan Cat & Bebas Dempul Tebal / Belang',
        hint: 'Periksa refleksi bodi dari sudut miring dan ketuk panel tipis untuk mendeteksi dempul.',
        defaultRepairEstimate: 2500000,
        guideId: 'exterior',
      },
      {
        id: 'ext_lights',
        categoryId: 'exterior',
        label: 'Lampu Utama, Foglamp & Stoplamp Bening Tanpa Embun',
        hint: 'Semua bohlam/LED menyala terang dan mika lampu tidak retak atau menguning parah.',
        defaultRepairEstimate: 1200000,
        guideId: 'exterior',
      },
      {
        id: 'ext_mirrors_seals',
        categoryId: 'exterior',
        label: 'Spion Lipat Elektrik & Karet Pelipit Pintu',
        hint: 'Motor retract spion berjalan mulus dan karet kaca tidak getas pecah-pecah.',
        defaultRepairEstimate: 1000000,
        guideId: 'exterior',
      },
      {
        id: 'ext_bumpers',
        categoryId: 'exterior',
        label: 'Bumper Depan-Belakang & Fender Rapat Kokoh',
        hint: 'Klip bumper tidak longgar atau disekrup paksa.',
        defaultRepairEstimate: 800000,
        guideId: 'exterior',
      },
    ],
  },
  {
    id: 'electrical',
    title: 'Kelistrikan, Aki & Sistem AC',
    weight: 10,
    guideId: 'electrical',
    description: 'Pengecekan sistem pengisian daya, kelistrikan kabin, sensor, dan pendingin udara.',
    photoExamples: [
      'Aki (kutub/terminal aki) dan kotak sekring ruang mesin dalam kondisi terbuka.',
      'Panel instrumen/speedometer saat kunci kontak ON dan saat mesin menyala.',
      'Sambungan pipa aluminium AC di ruang mesin.',
      'Layar head unit / kamera mundur saat gigi R aktif.',
    ],
    items: [
      {
        id: 'elc_battery_wiring',
        categoryId: 'electrical',
        label: 'Kondisi Aki, Alternator & Kerapian Kotak Sekring',
        hint: 'Terminal aki bebas kerak dan jalur kabel sekring masih standar pabrik.',
        defaultRepairEstimate: 1100000,
        guideId: 'electrical',
      },
      {
        id: 'elc_ac_cooling',
        categoryId: 'electrical',
        label: 'AC Dingin Cepat, Pipa Kering & Kompresor Senyap',
        hint: 'Uji dingin AC di putaran stasioner selama 5 menit; cek blower belakang jika ada.',
        defaultRepairEstimate: 2200000,
        guideId: 'electrical',
      },
      {
        id: 'elc_warning_lights',
        categoryId: 'electrical',
        label: 'Indikator Dashboard (Check Engine / ABS / Airbag)',
        hint: 'Semua indikator wajib menyala saat kontak ON lalu mati bersih setelah mesin hidup.',
        isRedFlagCandidate: true,
        redFlagLabel: 'Lampu indikator Check Engine / Airbag / ABS menyala terus',
        defaultRepairEstimate: 3000000,
        guideId: 'electrical',
      },
      {
        id: 'elc_cabin_controls',
        categoryId: 'electrical',
        label: 'Power Window, Central Lock & Head Unit Berfungsi',
        hint: 'Uji naik-turun seluruh kaca dari sakelar utama dan masing-masing pintu.',
        defaultRepairEstimate: 900000,
        guideId: 'electrical',
      },
      {
        id: 'elc_sensors_camera',
        categoryId: 'electrical',
        label: 'Sensor Parkir, Kamera Mundur & Wiper/Washer',
        hint: 'Pastikan sensor mundur dan pompa air wiper berfungsi normal.',
        defaultRepairEstimate: 600000,
        guideId: 'electrical',
      },
    ],
  },
  {
    id: 'interior',
    title: 'Interior, Odometer & Keselamatan',
    weight: 10,
    guideId: 'interior',
    description: 'Kewajaran keausan kabin terhadap angka odometer dan keutuhan perangkat keselamatan.',
    photoExamples: [
      'Speedometer menyala dengan angka odometer terbaca jelas.',
      'Close-up permukaan kulit/karet setir & karet pedal rem/gas.',
      'Baris jok depan-belakang, doortrim, dan plafon kabin.',
      'Sabuk pengaman ditarik penuh & perlengkapan ban serep/dongkrak/kunci cadangan.',
    ],
    items: [
      {
        id: 'int_odometer_wear',
        categoryId: 'interior',
        label: 'Kewajaran Keausan Setir, Pedal & Jok vs Odometer',
        hint: 'Mobil KM rendah (<60 rb) seharusnya kulit setir & karet pedal belum licin terkikis.',
        isRedFlagCandidate: true,
        redFlagLabel: 'Keausan interior tidak wajar (dugaan odometer diputar/reset)',
        defaultRepairEstimate: 0,
        guideId: 'interior',
      },
      {
        id: 'int_seats_trim',
        categoryId: 'interior',
        label: 'Kondisi Jok, Busa, Doortrim & Plafon Bersih Utuh',
        hint: 'Tidak ada sobekan parah, plafon melorot, atau bekas puntung rokok.',
        defaultRepairEstimate: 1500000,
        guideId: 'interior',
      },
      {
        id: 'int_airbag_safety',
        categoryId: 'interior',
        label: 'Keutuhan Cover Airbag & Sistem Sabuk Pengaman',
        hint: 'Cover airbag di setir dan dasbor penumpang rata utuh tidak bekas jahitan/lem ulang.',
        isRedFlagCandidate: true,
        redFlagLabel: 'Indikasi airbag pernah meledak / tidak utuh',
        defaultRepairEstimate: 8000000,
        guideId: 'interior',
      },
      {
        id: 'int_tools_spare',
        categoryId: 'interior',
        label: 'Kelengkapan Dongkrak, Kunci Roda & Kunci Cadangan',
        hint: 'Tanyakan keberadaan kunci cadangan dan remote serep kepada penjual.',
        defaultRepairEstimate: 800000,
        guideId: 'interior',
      },
    ],
  },
  {
    id: 'roadtest',
    title: 'Uji Jalan (Test Drive)',
    weight: 8,
    guideId: 'undercarriage',
    description: 'Pengujian langsung stabilitas kemudi, tenaga, pengereman, dan suhu operasional.',
    photoExamples: [
      'Panel indikator suhu mesin & RPM setelah mobil selesai dikendarai 10–15 menit.',
      'Catatan: Sebagian besar poin Uji Jalan (tarikan, kestabilan setir, getar rem) wajib dinilai langsung saat berkendara dan akan dilaporkan AI jika tidak terlihat dari foto.',
    ],
    items: [
      {
        id: 'rd_alignment',
        categoryId: 'roadtest',
        label: 'Setir Lurus Stabil (Tidak Menarik ke Kiri/Kanan)',
        hint: 'Lepas pegangan ringan di jalan lurus rata untuk menguji kelurusan kaki-kaki.',
        defaultRepairEstimate: 500000,
        guideId: 'undercarriage',
      },
      {
        id: 'rd_acceleration',
        categoryId: 'roadtest',
        label: 'Akselerasi Spontan & Tidak Terasa Berat/Ngempos',
        hint: 'Uji tarikan bawah hingga kecepatan menengah serta respons kickdown.',
        defaultRepairEstimate: 1800000,
        guideId: 'engine',
      },
      {
        id: 'rd_braking_feel',
        categoryId: 'roadtest',
        label: 'Pengereman Pakem Tanpa Getar di Setir/Pedal',
        hint: 'Injak rem agak dalam di kecepatan 60 km/jam; pastikan tidak oleng atau bergetar.',
        defaultRepairEstimate: 1200000,
        guideId: 'undercarriage',
      },
      {
        id: 'rd_temp_after_drive',
        categoryId: 'roadtest',
        label: 'Suhu Mesin Stabil Setelah Jalan 10–15 Menit',
        hint: 'Indikator suhu tetap di tengah/normal dan tidak muncul bau sangit oli/kopling.',
        defaultRepairEstimate: 1500000,
        guideId: 'engine',
      },
    ],
  },
];

export const ALL_INSPECTION_ITEMS: InspectionItemDefinition[] = INSPECTION_CATEGORIES.flatMap(
  (category) => category.items
);
