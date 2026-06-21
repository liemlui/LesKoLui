export interface TopicEntry {
  subject: string;
  level: string;
  unit: string;
  topic: string;
  aliases?: string; // extra search keywords
}

// Helper to create entries compactly
function mk(subject: string, level: string, unit: string, topics: string[], aliases?: string): TopicEntry[] {
  return topics.map(t => ({ subject, level, unit, topic: t, aliases }));
}

// ─── Comprehensive curriculum topic database ──────────────────────────────────
// Covers: IB MYP, IB DP, Cambridge IGCSE/O Level, Cambridge AS/A Level, AP, National
export const IB_TOPICS: TopicEntry[] = [

  // ══════════════════════════════════════════════════════════
  // MATHEMATICS — MYP / IGCSE / National
  // ══════════════════════════════════════════════════════════
  ...mk("Mathematics", "MYP/IGCSE", "Number", [
    "Bilangan bulat, desimal & pecahan",
    "Faktor & kelipatan — FPB, KPK",
    "Perbandingan & proporsi",
    "Persentase, profit & loss",
    "Eksponen & akar",
    "Bentuk baku (standard form)",
    "Bilangan rasional & irasional",
  ]),
  ...mk("Mathematics", "MYP/IGCSE", "Algebra", [
    "Ekspresi aljabar & simplifikasi",
    "Persamaan linear satu variabel",
    "Sistem persamaan linear (SPLDV)",
    "Pertidaksamaan linear",
    "Persamaan kuadrat — faktorisasi",
    "Persamaan kuadrat — rumus ABC",
    "Pola & barisan bilangan",
    "Polinomial & faktor teorema",
    "Binomial ekspansi",
  ]),
  ...mk("Mathematics", "MYP/IGCSE", "Functions", [
    "Konsep fungsi & notasi f(x)",
    "Fungsi linear & gradien",
    "Fungsi kuadrat & parabola",
    "Fungsi invers & komposisi",
    "Fungsi eksponensial",
    "Fungsi logaritma",
    "Fungsi rasional",
    "Grafik & interpretasi fungsi",
  ]),
  ...mk("Mathematics", "MYP/IGCSE", "Geometry", [
    "Sudut & garis sejajar",
    "Segitiga — sifat & kongruensi",
    "Teorema Pythagoras",
    "Segi empat & poligon",
    "Lingkaran — luas & keliling",
    "Lingkaran — teorema sudut",
    "Kesebangunan & keserupaan",
    "Bangun ruang — volume & luas permukaan",
    "Transformasi — translasi, rotasi, refleksi",
    "Koordinat Kartesius & geometri analitik",
  ]),
  ...mk("Mathematics", "MYP/IGCSE", "Trigonometry", [
    "Perbandingan trigonometri (sin, cos, tan)",
    "Sudut istimewa & kuadran",
    "Aturan sinus & cosinus",
    "Identitas trigonometri",
    "Grafik fungsi trigonometri",
    "Persamaan trigonometri",
  ]),
  ...mk("Mathematics", "MYP/IGCSE", "Statistics & Probability", [
    "Representasi data — histogram & box plot",
    "Mean, median, modus & range",
    "Standar deviasi & variansi",
    "Peluang dasar & ruang sampel",
    "Peluang majemuk — bersyarat & independen",
    "Distribusi binomial",
    "Distribusi normal",
    "Korelasi & regresi linear",
    "Uji hipotesis & chi-squared",
  ]),
  ...mk("Mathematics", "MYP/IGCSE", "Vectors & Matrices", [
    "Vektor 2D — operasi & modulus",
    "Vektor 3D & dot product",
    "Matriks — operasi, invers & determinan",
    "Transformasi dengan matriks",
  ]),
  ...mk("Mathematics", "MYP/IGCSE", "Number Sequences", [
    "Barisan aritmatika",
    "Barisan & deret geometri",
    "Keuangan — bunga majemuk & anuitas",
  ]),

  // ── MATHEMATICS Advanced (DP / A Level / AP) ──────────────────
  ...mk("Mathematics", "DP/A Level", "Calculus", [
    "Limit & kontinuitas",
    "Turunan — first principles",
    "Aturan turunan — product, quotient, chain",
    "Turunan implisit",
    "Turunan fungsi trigonometri",
    "Turunan fungsi eksponensial & logaritma",
    "Nilai stasioner & titik balik",
    "Optimisasi — maks & min terapan",
    "Laju perubahan terkait (related rates)",
    "Integral — antiturunan dasar",
    "Integral tertentu & Fundamental Theorem",
    "Integrasi parsial",
    "Integrasi substitusi",
    "Luas area & volume revolusi",
    "Persamaan diferensial — separable",
    "Persamaan diferensial — linear orde 1",
  ]),
  ...mk("Mathematics", "DP/A Level", "Complex Numbers", [
    "Bilangan kompleks & Argand diagram",
    "De Moivre & akar kompleks",
  ]),
  ...mk("Mathematics", "DP/A Level", "Further Topics", [
    "Proof by induction",
    "Fungsi hiperbolik",
    "Distribusi Poisson",
    "Selang kepercayaan & uji hipotesis",
    "Metode numerik — Newton-Raphson",
  ]),

  // Aliases agar "Math", "Matematika", "Maths" cocok
  ...mk("Math", "MYP/IGCSE", "Algebra", ["Persamaan linear", "Persamaan kuadrat", "Sistem persamaan"], "matematika"),
  ...mk("Matematika", "National", "Aljabar", [
    "Persamaan linear & SPLDV",
    "Persamaan kuadrat",
    "Fungsi & grafik",
    "Barisan & deret",
  ]),
  ...mk("Matematika", "National", "Kalkulus", [
    "Limit fungsi",
    "Turunan — aturan dasar & rantai",
    "Aplikasi turunan — stasioner & optimasi",
    "Integral tak tentu",
    "Integral tertentu & aplikasi luas",
  ]),
  ...mk("Matematika", "National", "Geometri", [
    "Teorema Pythagoras",
    "Lingkaran — sifat & teorema",
    "Transformasi — rotasi, refleksi, translasi",
    "Bangun ruang",
  ]),
  ...mk("Matematika", "National", "Statistika", [
    "Mean, median, modus",
    "Standar deviasi",
    "Peluang & kombinatorik",
    "Distribusi binomial & normal",
  ]),

  // ══════════════════════════════════════════════════════════
  // BIOLOGY — IGCSE / DP / AP / National
  // ══════════════════════════════════════════════════════════
  ...mk("Biology", "IGCSE/DP/AP", "Cell Biology", [
    "Struktur sel prokariot & eukariot",
    "Organel sel & fungsinya",
    "Transport membran — difusi & osmosis",
    "Transport aktif & endositosis",
    "Pembelahan sel — mitosis & siklus sel",
    "Meiosis & gametogenesis",
  ]),
  ...mk("Biology", "IGCSE/DP/AP", "Biochemistry", [
    "Karbohidrat — monosakarida & polisakarida",
    "Lipid — struktur & fungsi",
    "Protein — struktur primer–kuartener & denaturasi",
    "Enzim — sifat & cara kerja",
    "Enzim — faktor suhu, pH & inhibisi",
    "ATP & respirasi seluler",
    "Glikolisis & siklus Krebs",
    "Fosforilasi oksidatif & ETC",
    "Respirasi anaerob & fermentasi",
  ]),
  ...mk("Biology", "IGCSE/DP/AP", "Genetics", [
    "Struktur DNA & nukleotida",
    "Replikasi DNA",
    "Transkripsi & translasi (ekspresi gen)",
    "Kode genetik & kodon",
    "Mutasi gen & kromosom",
    "Regulasi ekspresi gen",
    "Hukum Mendel 1 — dominansi & resesif",
    "Hukum Mendel 2 — dihibrida & assortment",
    "Kodominansi & gen terpaut (sex-linked)",
    "Bioteknologi — PCR & rekayasa genetika",
    "Bioteknologi — kloning & GMO",
  ]),
  ...mk("Biology", "IGCSE/DP/AP", "Evolution & Classification", [
    "Variasi & adaptasi",
    "Seleksi alam & bukti evolusi",
    "Spesiasi — alopatrik & simpatrik",
    "Klasifikasi taksonomi — 5 kingdom / 3 domain",
  ]),
  ...mk("Biology", "IGCSE/DP/AP", "Ecology", [
    "Rantai & jaring makanan",
    "Piramida ekologi — biomassa & energi",
    "Siklus nitrogen & karbon",
    "Dinamika populasi & carrying capacity",
    "Dampak manusia — polusi & deforestasi",
    "Konservasi biodiversitas",
  ]),
  ...mk("Biology", "IGCSE/DP/AP", "Plant Biology", [
    "Fotosintesis — reaksi terang (light reactions)",
    "Fotosintesis — siklus Calvin (dark reactions)",
    "Transpirasi & jaringan vaskuler",
    "Hormon tumbuhan — auksin, giberelin, etilen",
  ]),
  ...mk("Biology", "IGCSE/DP/AP", "Human Physiology", [
    "Sistem pencernaan — enzim & penyerapan",
    "Sistem sirkulasi — jantung, darah & pembuluh",
    "Sistem respirasi — paru & pertukaran gas",
    "Sistem ekskresi — ginjal & nefron",
    "Sistem saraf — neuron & sinapsis",
    "Sistem endokrin — hormon & mekanisme feedback",
    "Sistem imun — antibodi, vaksin & kekebalan",
    "Sistem reproduksi & hormon reproduksi",
  ]),
  ...mk("Biologi", "National", "Sel", ["Struktur & fungsi sel", "Transport membran", "Pembelahan sel mitosis & meiosis"]),
  ...mk("Biologi", "National", "Genetika", ["Hukum Mendel & persilangan", "DNA, RNA & sintesis protein", "Mutasi & bioteknologi"]),
  ...mk("Biologi", "National", "Ekologi", ["Ekosistem & rantai makanan", "Siklus materi & energi", "Dampak lingkungan"]),
  ...mk("Biologi", "National", "Fisiologi", ["Sistem pencernaan", "Sistem peredaran darah", "Sistem saraf & indra"]),

  // ══════════════════════════════════════════════════════════
  // CHEMISTRY — IGCSE / DP / AP / National
  // ══════════════════════════════════════════════════════════
  ...mk("Chemistry", "IGCSE/DP/AP", "Atomic Structure", [
    "Model atom — Thomson, Rutherford, Bohr & kuantum",
    "Proton, neutron, elektron & isotop",
    "Konfigurasi elektron & subkulit",
    "Spektrum emisi & level energi",
  ]),
  ...mk("Chemistry", "IGCSE/DP/AP", "Periodic Table", [
    "Tren periodik — jari-jari & energi ionisasi",
    "Golongan 1 — logam alkali",
    "Golongan 2 — logam alkali tanah",
    "Golongan 17 — halogen",
    "Logam transisi & kompleks",
  ]),
  ...mk("Chemistry", "IGCSE/DP/AP", "Stoichiometry", [
    "Konsep mol & massa molar",
    "Rumus empiris & rumus molekul",
    "Persamaan kimia setara",
    "Limiting reagent & percent yield",
    "Konsentrasi larutan, molaritas & titrasi",
  ]),
  ...mk("Chemistry", "IGCSE/DP/AP", "Bonding & Structure", [
    "Ikatan ionik & struktur kisi",
    "Ikatan kovalen & struktur Lewis",
    "Molekul polar & nonpolar",
    "Bentuk molekul — VSEPR",
    "Gaya antarmolekul — van der Waals & ikatan hidrogen",
    "Ikatan logam & sifat logam",
  ]),
  ...mk("Chemistry", "IGCSE/DP/AP", "Thermochemistry", [
    "Entalpi — reaksi eksoterm & endoterm",
    "Hukum Hess & siklus Born-Haber",
    "Energi ikatan & kalorimetri",
    "Entropi & energi Gibbs",
  ]),
  ...mk("Chemistry", "IGCSE/DP/AP", "Kinetics", [
    "Laju reaksi & faktor-faktornya",
    "Orde reaksi & persamaan laju",
    "Teori tumbukan & energi aktivasi",
    "Katalis — cara kerja & jenis",
  ]),
  ...mk("Chemistry", "IGCSE/DP/AP", "Equilibrium", [
    "Kesetimbangan dinamis — Kc & Kp",
    "Le Chatelier's principle",
    "Asam-basa kuat & lemah",
    "pH, pOH & Kw",
    "Buffer & titrasi asam-basa",
    "Ksp & kelarutan garam",
  ]),
  ...mk("Chemistry", "IGCSE/DP/AP", "Redox & Electrochemistry", [
    "Bilangan oksidasi & setengah reaksi",
    "Sel galvani — EMF & potensial elektroda",
    "Elektrolisis & hukum Faraday",
  ]),
  ...mk("Chemistry", "IGCSE/DP/AP", "Organic Chemistry", [
    "Hidrokarbon — alkana & isomer",
    "Alkena — reaksi adisi & polimerisasi",
    "Alkuna & aromatik benzena",
    "Alkohol & eter",
    "Aldehida & keton",
    "Asam karboksilat & ester",
    "Amina & amida",
    "Polimer — kondensasi & adisi",
  ]),
  ...mk("Kimia", "National", "Stoikiometri", ["Konsep mol", "Persamaan reaksi kimia", "Konsentrasi & titrasi"]),
  ...mk("Kimia", "National", "Kimia Organik", ["Alkana, alkena, alkuna", "Gugus fungsi", "Polimer"]),
  ...mk("Kimia", "National", "Kesetimbangan", ["Asam basa & pH", "Le Chatelier", "Larutan buffer"]),
  ...mk("Kimia", "National", "Termokimia", ["Entalpi reaksi", "Hukum Hess", "Kalorimetri"]),

  // ══════════════════════════════════════════════════════════
  // PHYSICS — IGCSE / DP / AP / National
  // ══════════════════════════════════════════════════════════
  ...mk("Physics", "IGCSE/DP/AP", "Mechanics", [
    "Pengukuran, satuan SI & vektor",
    "Kinematika — GLB & GLBB",
    "Grafik gerak — s-t, v-t, a-t",
    "Gerak proyektil",
    "Hukum Newton I, II, III",
    "Berat, massa & gaya normal",
    "Gaya gesek kinetik & statis",
    "Gerak melingkar & gaya sentripetal",
    "Gravitasi universal & orbit",
    "Momentum & impuls",
    "Hukum kekekalan momentum",
    "Tumbukan elastis & inelastis",
    "Torsi & kesetimbangan rotasi",
    "Momen inersia & gerak rotasi",
    "Gerak harmonik sederhana (GHS/SHM)",
  ]),
  ...mk("Physics", "IGCSE/DP/AP", "Energy & Thermodynamics", [
    "Kerja & energi kinetik",
    "Energi potensial gravitasi & pegas",
    "Hukum kekekalan energi mekanik",
    "Daya & efisiensi",
    "Suhu, kalor & kapasitas kalor",
    "Perpindahan kalor — konduksi, konveksi, radiasi",
    "Perubahan fase & kalor laten",
    "Gas ideal — hukum Boyle, Charles, Gay-Lussac",
    "Hukum termodinamika I",
    "Hukum termodinamika II & entropi",
    "Mesin panas & efisiensi Carnot",
  ]),
  ...mk("Physics", "IGCSE/DP/AP", "Waves & Optics", [
    "Karakteristik gelombang — amplitudo, frekuensi, panjang gelombang",
    "Gelombang longitudinal & transversal",
    "Gelombang bunyi & intensitas",
    "Resonansi & gelombang stasioner",
    "Efek Doppler",
    "Interferensi & difraksi",
    "Hukum Snell & pembiasan cahaya",
    "Cermin cekung & cembung",
    "Lensa konvergen & divergen",
    "Dispersi cahaya & spektrum",
  ]),
  ...mk("Physics", "IGCSE/DP/AP", "Electricity & Magnetism", [
    "Muatan listrik & hukum Coulomb",
    "Medan listrik & garis medan",
    "Potensial listrik & energi listrik",
    "Kapasitor & kapasitansi",
    "Arus, tegangan & resistansi — hukum Ohm",
    "Rangkaian seri & paralel",
    "Hukum Kirchhoff",
    "Daya listrik & energi",
    "Medan magnet & garis gaya",
    "Gaya pada kawat berarus & muatan (Lorentz)",
    "Induksi elektromagnetik — Faraday & Lenz",
    "Transformator & efisiensi",
    "Motor & generator listrik",
  ]),
  ...mk("Physics", "DP/AP", "Modern Physics", [
    "Efek fotolistrik & kuantisasi energi",
    "Dualitas gelombang-partikel & de Broglie",
    "Model atom Bohr & spektrum hidrogen",
    "Prinsip Heisenberg",
    "Radioaktivitas — alpha, beta, gamma",
    "Waktu paruh & peluruhan radioaktif",
    "Fisi & fusi nuklir",
    "Relativitas khusus — dilatasi waktu & E=mc²",
  ]),
  ...mk("Fisika", "National", "Mekanika", ["Hukum Newton & gaya", "Gerak lurus & grafik", "Momentum & impuls", "Energi & usaha"]),
  ...mk("Fisika", "National", "Listrik", ["Hukum Ohm & rangkaian", "Kapasitor", "Induksi elektromagnetik"]),
  ...mk("Fisika", "National", "Gelombang & Bunyi", ["Karakteristik gelombang", "Bunyi & resonansi", "Efek Doppler"]),
  ...mk("Fisika", "National", "Optik", ["Cermin & lensa", "Pembiasan & dispersi"]),
  ...mk("Fisika", "National", "Fisika Modern", ["Radioaktivitas", "Efek fotolistrik", "Fisika inti"]),

  // ══════════════════════════════════════════════════════════
  // ECONOMICS — IGCSE / DP / AP / National
  // ══════════════════════════════════════════════════════════
  ...mk("Economics", "IGCSE/DP/AP", "Basic Concepts", [
    "Kelangkaan, pilihan & biaya peluang",
    "Production Possibility Curve (PPC)",
    "Sistem ekonomi — pasar, terencana & campuran",
    "Faktor produksi — land, labor, capital",
  ]),
  ...mk("Economics", "IGCSE/DP/AP", "Microeconomics", [
    "Hukum permintaan & kurva permintaan",
    "Hukum penawaran & kurva penawaran",
    "Keseimbangan pasar & surplus",
    "Pergeseran kurva permintaan & penawaran",
    "Elastisitas harga permintaan (PED)",
    "Elastisitas pendapatan & silang (YED, XED)",
    "Elastisitas penawaran (PES)",
    "Surplus konsumen & produsen",
    "Teori produksi — TP, AP, MP",
    "Biaya produksi — FC, VC, ATC, MC",
    "Profit maksimisasi — MR = MC",
  ]),
  ...mk("Economics", "IGCSE/DP/AP", "Market Structure", [
    "Persaingan sempurna — karakteristik & keuntungan",
    "Monopoli — sumber kekuatan & efek",
    "Oligopoli & kartel — game theory",
    "Persaingan monopolistik",
    "Diskriminasi harga",
  ]),
  ...mk("Economics", "IGCSE/DP/AP", "Market Failure", [
    "Eksternalitas negatif & positif",
    "Barang publik & free rider problem",
    "Informasi asimetris",
    "Pajak Pigou, subsidi & regulasi pemerintah",
  ]),
  ...mk("Economics", "IGCSE/DP/AP", "Macroeconomics", [
    "GDP & cara menghitung — pengeluaran, pendapatan, output",
    "Indeks harga & inflasi (CPI)",
    "Jenis-jenis pengangguran",
    "Siklus bisnis — boom, resesi, recovery",
    "Permintaan agregat (AD) & penawaran agregat (AS)",
    "Multiplier & akselerator",
    "Kurva Phillips — inflasi & pengangguran",
  ]),
  ...mk("Economics", "IGCSE/DP/AP", "Policy & International", [
    "Kebijakan fiskal ekspansif & kontraktif",
    "Kebijakan moneter & suku bunga",
    "Perdagangan internasional & keunggulan komparatif",
    "Proteksionisme — tarif, kuota & subsidi",
    "Neraca pembayaran & current account",
    "Nilai tukar — fixed vs floating",
    "Kemiskinan, ketimpangan & HDI",
    "Peran IMF, World Bank & WTO",
  ]),
  ...mk("Ekonomi", "National", "Mikro", ["Permintaan & penawaran", "Elastisitas", "Struktur pasar"]),
  ...mk("Ekonomi", "National", "Makro", ["GDP & pertumbuhan", "Inflasi & pengangguran", "Kebijakan fiskal & moneter"]),

  // ══════════════════════════════════════════════════════════
  // BUSINESS MANAGEMENT — DP / Cambridge / AP
  // ══════════════════════════════════════════════════════════
  ...mk("Business Management", "DP/Cambridge", "Business Organization", [
    "Tujuan bisnis — misi, visi, SMART",
    "Jenis badan usaha — PT, CV, koperasi",
    "Stakeholder analisis",
    "Pertumbuhan bisnis — internal & merger/akuisisi",
    "CSR & etika bisnis",
    "Struktur organisasi — hierarki & flat",
  ]),
  ...mk("Business Management", "DP/Cambridge", "Marketing", [
    "Marketing mix — 4P (product, price, place, promotion)",
    "Segmentasi, targeting & positioning",
    "Riset pasar — primer & sekunder",
    "Product life cycle (PLC)",
    "Strategi penetapan harga",
    "Branding & manajemen merek",
  ]),
  ...mk("Business Management", "DP/Cambridge", "Finance & Accounting", [
    "Laporan laba rugi & analisis",
    "Neraca keuangan — aset & liabilitas",
    "Arus kas & manajemen likuiditas",
    "Rasio keuangan — profitabilitas & likuiditas",
    "Break-even analysis",
    "Sumber modal — utang & ekuitas",
    "Anggaran & pengendalian biaya",
  ]),
  ...mk("Business Management", "DP/Cambridge", "Human Resources", [
    "Motivasi kerja — Maslow, Herzberg, Taylor",
    "Gaya kepemimpinan — autokratik & demokratik",
    "Rekrutmen, seleksi & onboarding",
    "Pelatihan & pengembangan SDM",
    "Budaya & iklim organisasi",
  ]),
  ...mk("Business Management", "DP/Cambridge", "Operations", [
    "Metode produksi — job, batch, flow",
    "Pengendalian kualitas TQM & lean production",
    "Supply chain & manajemen persediaan (JIT)",
    "Lokasi & layout fasilitas",
  ]),
  ...mk("Business", "IGCSE/AP", "Business Essentials", [
    "Business objectives & stakeholders",
    "Marketing mix & 4P",
    "Break-even & cash flow",
    "Motivation theories",
    "Financial statements",
  ], "commerce"),

  // ══════════════════════════════════════════════════════════
  // COMPUTER SCIENCE — IGCSE / DP / AP
  // ══════════════════════════════════════════════════════════
  ...mk("Computer Science", "IGCSE/DP/AP", "Systems & Data", [
    "Komponen hardware komputer",
    "Representasi data — biner, desimal, hex",
    "Konversi basis bilangan",
    "Sistem operasi — fungsi & manajemen memori",
    "Memori RAM, ROM & cache",
  ]),
  ...mk("Computer Science", "IGCSE/DP/AP", "Networking", [
    "Topologi jaringan & model OSI",
    "Protokol TCP/IP & HTTP",
    "Keamanan jaringan — enkripsi & firewall",
    "Cloud computing & IoT",
  ]),
  ...mk("Computer Science", "IGCSE/DP/AP", "Algorithms", [
    "Flowchart & pseudocode",
    "Analisis kompleksitas Big-O",
    "Linear & binary search",
    "Bubble, merge & quick sort",
    "Rekursi & stack call",
  ]),
  ...mk("Computer Science", "IGCSE/DP/AP", "Programming", [
    "Variabel, tipe data & operator",
    "Selection — if-else & switch",
    "Iteration — for, while, do-while",
    "Array, list & string manipulation",
    "Fungsi & prosedur",
    "OOP — kelas, objek & method",
    "OOP — enkapsulasi, pewarisan, polimorfisme",
    "Debugging, testing & error handling",
  ]),
  ...mk("Computer Science", "IGCSE/DP/AP", "Data Structures & DB", [
    "Stack & queue",
    "Linked list",
    "Binary tree & BST",
    "Hash table",
    "Database relasional & SQL",
    "Normalisasi 1NF–3NF & ERD",
  ]),
  ...mk("Computer Science", "DP/AP", "Impacts of Computing", [
    "Etika digital & privasi data",
    "Hak cipta & lisensi perangkat lunak",
    "Keamanan siber — phishing & social engineering",
    "AI & machine learning dasar",
    "Dampak sosial otomasi & teknologi",
  ]),
  ...mk("Informatika", "National", "Pemrograman", ["Variabel & tipe data", "Percabangan & pengulangan", "Fungsi & prosedur"], "coding"),
  ...mk("Informatika", "National", "Jaringan", ["Topologi & protokol", "Keamanan jaringan"]),

  // ══════════════════════════════════════════════════════════
  // HISTORY — IGCSE / DP / AP / National
  // ══════════════════════════════════════════════════════════
  ...mk("History", "IGCSE/DP/AP", "Historical Skills", [
    "Analisis sumber primer & sekunder",
    "Reliabilitas, bias & perspektif sumber",
    "Kausalitas, perubahan & kesinambungan",
    "Perbandingan & signifikansi sejarah",
    "Penulisan esai sejarah — argumen & evidence",
  ]),
  ...mk("History", "IGCSE/DP/AP", "World Wars", [
    "Penyebab Perang Dunia I — jangka pendek & panjang",
    "Front barat & perang parit",
    "Dampak WWI & Perjanjian Versailles",
    "Liga Bangsa-Bangsa & kegagalannya",
    "Bangkitnya fasisme di Italia & Jerman",
    "Penyebab Perang Dunia II",
    "Holocaust & genosida",
    "Perang Pasifik & dampak bom atom",
    "Akhir WWII & Perjanjian Perdamaian",
  ]),
  ...mk("History", "IGCSE/DP/AP", "Cold War & Decolonization", [
    "Asal-usul & ideologi Perang Dingin",
    "Krisis Berlin & Kuba",
    "Perang Korea & Vietnam",
    "Détente & akhir Perang Dingin",
    "Dekolonisasi Asia & Afrika",
    "Gerakan hak sipil & HAM",
    "Apartheid di Afrika Selatan",
    "Nasionalisme Asia — India, China",
  ]),
  ...mk("History", "DP/AP", "Authoritarian States", [
    "Negara otoriter — definisi & ciri",
    "Hitler — ideologi Nazi & propaganda",
    "Stalin — metode kekuasaan & teror",
    "Mao Zedong — revolusi & Lompatan Jauh",
    "Mussolini & fasisme Italia",
  ]),
  ...mk("History", "IGCSE/DP/AP", "Indonesia", [
    "Penjajahan Belanda & VOC",
    "Pergerakan nasional & Sumpah Pemuda",
    "Proklamasi kemerdekaan 1945",
    "Pemberontakan & konflik pasca-kemerdekaan",
    "Orde Lama — Sukarno & Demokrasi Terpimpin",
    "Orde Baru — Suharto & pembangunan",
    "Reformasi 1998 & Indonesia modern",
  ]),
  ...mk("Sejarah", "National", "Indonesia", ["Kemerdekaan & proklamasi", "Orde Lama & Orde Baru", "Reformasi"]),
  ...mk("Sejarah", "National", "Dunia", ["Perang Dunia & dampaknya", "Perang Dingin", "Kolonialisme & dekolonisasi"]),

  // ══════════════════════════════════════════════════════════
  // GEOGRAPHY — IGCSE / DP / AP
  // ══════════════════════════════════════════════════════════
  ...mk("Geography", "IGCSE/DP/AP", "Physical Geography", [
    "Iklim & faktor-faktor iklim",
    "Tektonik lempeng & gempa bumi",
    "Vulkanisme & bahaya alam",
    "Erosi & bentuk lahan",
    "Siklus air & hidrologi",
    "Bioma & biosfer",
  ]),
  ...mk("Geography", "IGCSE/DP/AP", "Human Geography", [
    "Pertumbuhan populasi & piramida penduduk",
    "Migrasi — penyebab & dampak",
    "Urbanisasi & kota megapolitan",
    "Pembangunan & Indeks HDI",
    "Kemiskinan & ketimpangan spasial",
    "Industri & lokasi pabrik",
    "Ketahanan pangan & pertanian",
  ]),
  ...mk("Geography", "IGCSE/DP/AP", "Environment & Sustainability", [
    "Perubahan iklim & gas rumah kaca",
    "Deforestasi & dampak ekosistem",
    "Polusi air & udara",
    "Energi terbarukan & berkelanjutan",
    "Pengelolaan SDA",
  ]),
  ...mk("Geografi", "National", "Fisik", ["Dinamika bumi & gempa", "Iklim & cuaca", "Bentang alam"]),
  ...mk("Geografi", "National", "Manusia", ["Kependudukan & piramida", "Migrasi & urbanisasi", "Pembangunan & HDI"]),

  // ══════════════════════════════════════════════════════════
  // PSYCHOLOGY — DP / Cambridge / AP
  // ══════════════════════════════════════════════════════════
  ...mk("Psychology", "DP/AP", "Research Methods", [
    "Desain eksperimen & variabel",
    "Survey, observasi & studi kasus",
    "Etika penelitian psikologi",
    "Analisis data & interpretasi statistik",
  ]),
  ...mk("Psychology", "DP/AP", "Biological Approach", [
    "Otak & struktur lobus",
    "Neurotransmitter & psikofarmakologi",
    "Genetika & evolusi perilaku",
    "Hormon & perilaku",
  ]),
  ...mk("Psychology", "DP/AP", "Cognitive Approach", [
    "Memori — encoding, storage, retrieval",
    "Model memori multi-store & working memory",
    "Skema & pemrosesan informasi",
    "Pengambilan keputusan & bias kognitif",
    "Bahasa & kognisi",
  ]),
  ...mk("Psychology", "DP/AP", "Developmental", [
    "Tahap perkembangan kognitif Piaget",
    "Attachment theory — Bowlby & Ainsworth",
    "Perkembangan moral Kohlberg",
    "Perkembangan sosial-emosional",
  ]),
  ...mk("Psychology", "DP/AP", "Social Psychology", [
    "Konformitas — Asch & norma sosial",
    "Kepatuhan & eksperimen Milgram",
    "Pengaruh sosial & groupthink",
    "Prejudis, diskriminasi & stereotip",
    "Altruisme & perilaku prososial",
  ]),
  ...mk("Psychology", "DP/AP", "Abnormal Psychology", [
    "Model gangguan mental — biomedis & kognitif",
    "Gangguan depresi mayor & bipolar",
    "Gangguan kecemasan, fobia & OCD",
    "PTSD & gangguan trauma",
    "Skizofrenia & gejala psikotik",
    "Terapi kognitif-perilaku (CBT)",
  ]),

  // ══════════════════════════════════════════════════════════
  // LANGUAGE & LITERATURE
  // ══════════════════════════════════════════════════════════
  ...mk("Bahasa Indonesia", "National", "Membaca & Sastra", [
    "Analisis cerpen — unsur intrinsik",
    "Analisis novel — tema & karakter",
    "Analisis puisi — majas & citraan",
    "Teks eksplanasi — struktur & fungsi",
    "Teks argumentasi & persuasi",
    "Teks laporan & deskripsi",
    "Teks prosedur & instruksi",
  ]),
  ...mk("Bahasa Indonesia", "National", "Menulis", [
    "Esai argumentatif",
    "Laporan & karya ilmiah",
    "Surat resmi & tidak resmi",
    "Cerita pendek — penulisan kreatif",
    "Teks pidato & presentasi",
  ]),
  ...mk("Bahasa Indonesia", "National", "Tata Bahasa", [
    "Kata baku & EYD/PUEBI",
    "Kalimat efektif & konjungsi",
    "Paragraf kohesif & koherensi",
    "Jenis kalimat & struktur",
    "Diksi & pilihan kata",
  ]),
  ...mk("English", "DP/IGCSE/AP", "Literature Analysis", [
    "Literary devices — simile, metaphor, symbolism",
    "Poetry analysis — form, imagery, tone",
    "Prose analysis — narrative structure",
    "Drama & theatrical techniques",
    "Contextual & historical analysis",
  ]),
  ...mk("English", "DP/IGCSE/AP", "Writing Skills", [
    "Argumentative essay writing",
    "Analytical essay & literary commentary",
    "Creative writing — short story",
    "Report & summary writing",
    "Paragraph development — PEEL & TEEL",
    "Thesis statement & argument structure",
  ]),
  ...mk("English", "DP/IGCSE/AP", "Language", [
    "Grammar — tenses & modal verbs",
    "Passive voice & reported speech",
    "Register, tone & audience",
    "Vocabulary & academic word choice",
    "Text types — article, letter, speech",
  ]),
  ...mk("English", "DP/IGCSE/AP", "Speaking & Oral", [
    "Oral presentation & public speaking",
    "Debate & discussion skills",
    "Individual oral — global issues",
    "Pronunciation & fluency",
  ]),
  ...mk("English A", "DP", "DP English A", [
    "Close reading & textual commentary",
    "Individual oral — extract analysis",
    "HL essay — intertextual comparison",
    "Written task & research",
  ]),
  ...mk("English B", "DP", "DP English B", [
    "Text types — article, report, blog, speech",
    "Individual oral — stimulus discussion",
    "Paper 1 — comprehension strategies",
    "Paper 2 — written production",
  ]),

  // ══════════════════════════════════════════════════════════
  // IB-SPECIFIC — TOK / EE / CAS / Global Perspectives
  // ══════════════════════════════════════════════════════════
  ...mk("Theory of Knowledge", "DP", "TOK", [
    "Knowledge & knower — personal vs shared",
    "Ways of knowing (WOK) — reason, emotion, language",
    "Areas of knowledge (AOK) — natural sciences, history, ethics",
    "TOK exhibition — objek & klaim",
    "TOK essay — argument & counter-claim",
    "TOK essay — revisi draft & structure",
  ]),
  ...mk("TOK", "DP", "TOK", [
    "Essay draft & struktur argumen",
    "Exhibition planning & justifikasi",
    "Core theme — knowledge & technology",
  ]),
  ...mk("Extended Essay", "DP", "EE", [
    "Pemilihan topik & research question EE",
    "Literature review & sumber EE",
    "Methodology & analisis data EE",
    "Struktur & format EE",
    "Revisi, editing & refleksi EE",
  ]),
  ...mk("CAS", "DP", "CAS", [
    "Refleksi CAS activity",
    "CAS project planning & goals",
    "Learning outcomes CAS",
  ]),
  ...mk("Global Perspectives", "Cambridge", "GP", [
    "Identifikasi isu global & perspektif",
    "Evaluasi sumber & sudut pandang",
    "Individual Research Report (IRR)",
    "Team project & presentasi",
  ]),

  // ══════════════════════════════════════════════════════════
  // SCIENCES MYP (untuk murid yang subjeknya "Sciences")
  // ══════════════════════════════════════════════════════════
  ...mk("Sciences", "MYP", "Physics MYP", [
    "Besaran & satuan SI",
    "Gerak lurus & grafik",
    "Gaya & hukum Newton",
    "Energi & usaha",
    "Gelombang bunyi & cahaya",
    "Listrik & rangkaian sederhana",
  ]),
  ...mk("Sciences", "MYP", "Chemistry MYP", [
    "Atom & tabel periodik",
    "Senyawa & campuran",
    "Reaksi kimia & persamaan",
    "Asam & basa",
    "Kimia karbon dasar",
  ]),
  ...mk("Sciences", "MYP", "Biology MYP", [
    "Sel & organisme",
    "Sistem tubuh manusia",
    "Ekosistem & rantai makanan",
    "Pewarisan genetik dasar",
    "Evolusi dasar",
  ]),

  // ══════════════════════════════════════════════════════════
  // ADDITIONAL SUBJECTS
  // ══════════════════════════════════════════════════════════
  ...mk("Sociology", "DP/Cambridge", "Sociology", [
    "Struktur sosial & stratifikasi",
    "Sosialisasi & identitas sosial",
    "Deviasi & kontrol sosial",
    "Ketidaksetaraan gender & kelas",
    "Keluarga & perubahan sosial",
    "Globalisasi & budaya",
  ]),
  ...mk("Philosophy", "DP", "Philosophy", [
    "Logika & argumen deduktif",
    "Epistemologi — pengetahuan & kepercayaan",
    "Etika — teori utilitarianisme & Kantian",
    "Filsafat pikiran & identitas",
    "Estetika & filsafat seni",
  ]),
  ...mk("Environmental Systems & Societies", "DP", "ESS", [
    "Ekosistem & biodiversitas",
    "Siklus materi — karbon, nitrogen, fosfor",
    "Dampak manusia — polusi & limbah",
    "Perubahan iklim — penyebab & dampak",
    "Pengelolaan SDA berkelanjutan",
    "Kebijakan lingkungan internasional",
  ]),
  ...mk("ESS", "DP", "ESS", [
    "Ekosistem & jasa lingkungan",
    "Perubahan iklim & mitigasi",
    "Pengelolaan SDA & sustainability",
  ]),
  ...mk("IB DP", "DP", "Core", [
    "TOK essay & exhibition",
    "Extended Essay research question",
    "CAS project & refleksi",
  ]),
];

// ─── Canonical subject name map ───────────────────────────────────────────────
// Maps common student subject names to the subjects used in IB_TOPICS
const SUBJECT_ALIASES: Record<string, string[]> = {
  "mathematics":        ["Mathematics", "Math", "Matematika"],
  "math":               ["Mathematics", "Math", "Matematika"],
  "maths":              ["Mathematics", "Math", "Matematika"],
  "matematika":         ["Matematika", "Mathematics", "Math"],
  "biology":            ["Biology", "Biologi"],
  "biologi":            ["Biologi", "Biology"],
  "chemistry":          ["Chemistry", "Kimia"],
  "kimia":              ["Kimia", "Chemistry"],
  "physics":            ["Physics", "Fisika"],
  "fisika":             ["Fisika", "Physics"],
  "economics":          ["Economics", "Ekonomi"],
  "ekonomi":            ["Ekonomi", "Economics"],
  "history":            ["History", "Sejarah"],
  "sejarah":            ["Sejarah", "History"],
  "geography":          ["Geography", "Geografi"],
  "geografi":           ["Geografi", "Geography"],
  "computer science":   ["Computer Science", "Informatika"],
  "cs":                 ["Computer Science", "Informatika"],
  "informatika":        ["Informatika", "Computer Science"],
  "business":           ["Business Management", "Business"],
  "business management":["Business Management", "Business"],
  "english":            ["English", "English A", "English B"],
  "english a":          ["English A", "English"],
  "english b":          ["English B", "English"],
  "bahasa indonesia":   ["Bahasa Indonesia"],
  "psychology":         ["Psychology"],
  "sciences":           ["Sciences", "Biology", "Chemistry", "Physics"],
  "science":            ["Sciences", "Biology", "Chemistry", "Physics"],
  "tok":                ["Theory of Knowledge", "TOK"],
  "theory of knowledge":["Theory of Knowledge", "TOK"],
  "extended essay":     ["Extended Essay"],
  "ee":                 ["Extended Essay"],
  "ess":                ["Environmental Systems & Societies", "ESS"],
};

function resolveSubjectAliases(subject: string): string[] {
  const key = subject.toLowerCase().trim();
  return SUBJECT_ALIASES[key] ?? [subject];
}

// ─── Search function ──────────────────────────────────────────────────────────
export function searchTopics(query: string, subject?: string): TopicEntry[] {
  if (!query || query.length < 1) return [];
  const q = query.trim().toLowerCase();

  // Resolve allowed subjects (includes aliases, e.g. "Biology" → ["Biology","Biologi"])
  const allowedSubjects = subject
    ? new Set(resolveSubjectAliases(subject).map(s => s.toLowerCase()))
    : null;
  // Words from the filter subject, for partial match on variants like "Math AA", "English B"
  const sfWords = subject
    ? subject.toLowerCase().split(/[\s,&-]+/).filter(w => w.length > 2)
    : [];

  const scored = IB_TOPICS.map((t) => {
    const tLow = t.topic.toLowerCase();
    const uLow = t.unit.toLowerCase();
    const sLow = t.subject.toLowerCase();
    const aLow = (t.aliases ?? "").toLowerCase();

    // Content match — must score > 0 to be included
    const topicScore   = tLow.includes(q) ? 15 : 0;
    const unitScore    = uLow.includes(q) ? 6  : 0;
    const aliasScore   = aLow.includes(q) ? 5  : 0;
    const subjInQuery  = sLow.includes(q) ? 3  : 0;
    const contentScore = topicScore + unitScore + aliasScore + subjInQuery;
    if (contentScore === 0) return { entry: t, score: 0 };

    // Subject relevance bonus
    let subjectBonus = 0;
    if (allowedSubjects) {
      if (allowedSubjects.has(sLow)) {
        subjectBonus = 20; // exact / alias match
      } else if (sfWords.some(w => sLow.includes(w))) {
        subjectBonus = 10; // partial word match (e.g. "math" in "Math AA")
      }
    }

    return { entry: t, score: contentScore + subjectBonus };
  })
  .filter(x => x.score > 0)
  .sort((a, b) => b.score - a.score)
  .slice(0, 12);

  return scored.map(x => x.entry);
}
