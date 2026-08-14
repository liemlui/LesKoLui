export interface TopicEntry {
  subject: string;
  level: string;       // e.g. "MYP 1", "MYP 2", "MYP 3-4", "MYP 5", "DP", "IGCSE", "A Level", "AP"
  gradeLabel: string;  // e.g. "MYP 1 / Grade 6", "MYP 3-4 / Grade 8-9"
  unit: string;        // chapter / unit name from textbook
  topic: string;
  aliases?: string;    // extra search keywords
}

// Helper to create entries compactly
function mk(
  subject: string,
  level: string,
  gradeLabel: string,
  unit: string,
  topics: string[],
  aliases?: string,
): TopicEntry[] {
  return topics.map(t => ({ subject, level, gradeLabel, unit, topic: t, aliases }));
}

// ─── Grade → MYP Level Mapping ──────────────────────────────────────────────

const GRADE_TO_MYP: Record<string, string> = {
  "grade 6":  "MYP 1", "myp 1": "MYP 1",
  "grade 7":  "MYP 2", "myp 2": "MYP 2",
  "grade 8":  "MYP 3-4", "myp 3": "MYP 3-4",
  "grade 9":  "MYP 3-4", "myp 4": "MYP 3-4",
  "grade 10": "MYP 5", "myp 5": "MYP 5",
  "grade 11": "DP", "grade 12": "DP", "dp": "DP",
};

const GRADE_LABELS: Record<string, string> = {
  "MYP 1":   "MYP 1 / Grade 6",
  "MYP 2":   "MYP 2 / Grade 7",
  "MYP 3-4": "MYP 3-4 / Grade 8-9",
  "MYP 5":   "MYP 5 / Grade 10",
  "DP":      "IB DP",
  "IGCSE":   "IGCSE",
  "A Level": "A Level",
  "AP":      "AP",
  "O Level": "O Level",
  "SMP 7":   "Kelas 7 (SMP)",
  "SMP 8":   "Kelas 8 (SMP)",
  "SMP 9":   "Kelas 9 (SMP)",
  "SMA 10":  "Kelas 10 (SMA)",
  "SMA 11":  "Kelas 11 (SMA)",
  "SMA 12":  "Kelas 12 (SMA)",
};

function inferMypLevel(studentLevel?: string): string | null {
  if (!studentLevel) return null;
  const key = studentLevel.toLowerCase().trim();
  // Direct match
  if (GRADE_TO_MYP[key]) return GRADE_TO_MYP[key];
  // Try "grade X" or "myp X" pattern
  const gradeMatch = key.match(/(?:grade|myp)\s*(\d+)/);
  if (gradeMatch) {
    const num = parseInt(gradeMatch[1]);
    if (num <= 6) return "MYP 1";
    if (num === 7) return "MYP 2";
    if (num === 8 || num === 9) return "MYP 3-4";
    if (num === 10) return "MYP 5";
    return "DP";
  }
  return null;
}

/** Map kelas Kurikulum Nasional ("VII", "X", "kelas 11", "12 SMA", "7") → level topik. */
function inferNationalLevel(grade?: string): string | null {
  if (!grade) return null;
  const g = grade.toLowerCase().trim();
  const roman: Record<string, number> = { vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12 };
  let n: number | null = null;
  if (roman[g]) n = roman[g];
  else {
    const m = g.match(/(?:kelas\s*)?(\d{1,2})/);
    if (m) n = parseInt(m[1]);
  }
  if (n == null) return null;
  if (n >= 7 && n <= 9) return `SMP ${n}`;
  if (n >= 10 && n <= 12) return `SMA ${n}`;
  return null;
}

/** Predicate hard-filter: topik level mana yang valid untuk kurikulum tertentu. */
function curriculumLevelFilter(curriculum?: string): ((level: string) => boolean) | null {
  switch (curriculum) {
    case "IB MYP":             return (l) => l.toLowerCase().startsWith("myp");
    case "IB DP":              return (l) => l.toLowerCase() === "dp";
    case "Cambridge IGCSE":    return (l) => l.toLowerCase() === "igcse";
    case "Cambridge O Level":  return (l) => l.toLowerCase().startsWith("o level");
    case "Cambridge AS Level":
    case "Cambridge A Level":  return (l) => l.toLowerCase().startsWith("a level");
    case "AP":                 return (l) => l.toLowerCase() === "ap";
    case "National":           return (l) => { const x = l.toLowerCase(); return x.startsWith("smp") || x.startsWith("sma"); };
    default:                   return null; // Custom / tanpa kurikulum → tampilkan semua
  }
}

/** Level target murid (untuk bonus relevansi), dari kurikulum + grade. */
function targetLevelFor(curriculum?: string, grade?: string): string | null {
  switch (curriculum) {
    case "IB MYP":            return inferMypLevel(grade);
    case "IB DP":             return "DP";
    case "Cambridge IGCSE":   return "IGCSE";
    case "Cambridge O Level": return "O Level";
    case "Cambridge AS Level":
    case "Cambridge A Level": return "A Level";
    case "AP":                return "AP";
    case "National":          return inferNationalLevel(grade);
    default:                  return null;
  }
}

function gradeLabelFromLevel(level: string): string {
  return GRADE_LABELS[level] ?? level;
}

// ─── Comprehensive topic database ────────────────────────────────────────────

export const IB_TOPICS: TopicEntry[] = [

  // ═══════════════════════════════════════════════════════════════════════════
  // MATHEMATICS — MYP 1 (Grade 6) — Haese & Harris MYP 1
  // ═══════════════════════════════════════════════════════════════════════════
  ...mk("Mathematics", "MYP 1", "MYP 1 / Grade 6", "1 — Ratios & Proportions: Competition and Cooperation", [
    "Rasio & perbandingan",
    "Proporsi — direct & inverse proportion",
    "Skala & peta",
    "Persentase dasar",
    "Aplikasi rasio — campuran & resep",
  ]),
  ...mk("Mathematics", "MYP 1", "MYP 1 / Grade 6", "2 — Probability: Games and Play", [
    "Peluang dasar & ruang sampel",
    "Peluang teoretik vs eksperimental",
    "Diagram pohon — single events",
    "Permainan & peluang",
    "Prediksi & frekuensi harapan",
  ]),
  ...mk("Mathematics", "MYP 1", "MYP 1 / Grade 6", "3 — Integers: Human Explorations", [
    "Bilangan bulat positif & negatif",
    "Operasi hitung bilangan bulat",
    "Garis bilangan & nilai mutlak",
    "Bilangan prima & komposit",
    "FPB & KPK",
    "Urutan operasi — BODMAS/PEMDAS",
  ]),
  ...mk("Mathematics", "MYP 1", "MYP 1 / Grade 6", "4 — Algebraic Expressions & Equations: Puzzles and Tricks", [
    "Variabel & konstanta",
    "Ekspresi aljabar — substitusi & simplifikasi",
    "Persamaan linear satu variabel",
    "Menyusun persamaan dari soal cerita",
    "Pola & generalisasi aljabar",
  ]),
  ...mk("Mathematics", "MYP 1", "MYP 1 / Grade 6", "5 — 2D & 3D Geometry: Human and Natural Landscapes", [
    "Sudut — jenis & pengukuran",
    "Garis sejajar & transversal",
    "Segitiga — klasifikasi & jumlah sudut",
    "Segi empat — sifat & jenis",
    "Keliling & luas — persegi, persegi panjang, segitiga",
    "Bangun ruang — kubus, balok, prisma",
    "Volume & luas permukaan dasar",
    "Simetri & teselasi",
  ]),
  ...mk("Mathematics", "MYP 1", "MYP 1 / Grade 6", "6 — Rates: Interconnectedness of Human-Made Systems", [
    "Kecepatan, jarak, waktu",
    "Laju & debit",
    "Konversi satuan",
    "Grafik laju perubahan",
    "Perbandingan harga & value for money",
  ]),
  ...mk("Mathematics", "MYP 1", "MYP 1 / Grade 6", "7 — Univariate Data: Accessing Equal Opportunities", [
    "Pengumpulan data & survei",
    "Tabel frekuensi & tally",
    "Diagram batang & pie chart",
    "Mean, median, modus, range",
    "Interpretasi data & kesimpulan",
    "Outlier sederhana",
  ]),

  // ═══════════════════════════════════════════════════════════════════════════
  // MATHEMATICS — MYP 2 (Grade 7) — Haese & Harris MYP 2
  // ═══════════════════════════════════════════════════════════════════════════
  ...mk("Mathematics", "MYP 2", "MYP 2 / Grade 7", "1 — Number: Discoveries and Developments", [
    "Operasi bilangan — review & extend",
    "Pangkat & eksponen — hukum dasar",
    "Scientific notation / bentuk baku",
    "Akar kuadrat & pangkat tiga",
    "Bilangan rasional & irasional",
  ]),
  ...mk("Mathematics", "MYP 2", "MYP 2 / Grade 7", "2 — Triangles: Principles, Processes and Solutions", [
    "Teorema Pythagoras",
    "Aplikasi Pythagoras — jarak & konstruksi",
    "Segitiga sama kaki & sifat",
    "Kesebangunan segitiga",
    "Trigonometri dasar — sin, cos, tan",
    "Mencari panjang & sudut dengan trigonometri",
  ]),
  ...mk("Mathematics", "MYP 2", "MYP 2 / Grade 7", "3 — Linear Relationships: Impact of Human Decision-Making", [
    "Koordinat Kartesius — review",
    "Fungsi linear — y = mx + c",
    "Gradien — makna & perhitungan",
    "Menggambar grafik linear",
    "Persamaan garis dari dua titik",
    "Garis sejajar & tegak lurus",
    "Aplikasi — break-even & cost analysis",
  ]),
  ...mk("Mathematics", "MYP 2", "MYP 2 / Grade 7", "4 — 3D Shapes: Products, Processes and Solutions", [
    "Volume prisma & tabung",
    "Luas permukaan bangun ruang",
    "Jaring-jaring bangun ruang",
    "Proyeksi & tampilan 3D",
    "Skala & model 3D",
  ]),
  ...mk("Mathematics", "MYP 2", "MYP 2 / Grade 7", "5 — Bivariate Data: What It Means to Be Human", [
    "Scatter plot / diagram sebar",
    "Korelasi — positif, negatif, tidak ada",
    "Tren & garis best-fit",
    "Interpretasi data bivariat",
    "Prediksi dari scatter plot",
  ]),
  ...mk("Mathematics", "MYP 2", "MYP 2 / Grade 7", "6 — Geometric Transformations: Expressing Beliefs and Values", [
    "Translasi — vektor geser",
    "Refleksi — cermin x, y, & garis",
    "Rotasi — pusat & sudut",
    "Dilatasi — perbesaran & pengecilan",
    "Kombinasi transformasi",
    "Pola & desain transformasi",
  ]),
  ...mk("Mathematics", "MYP 2", "MYP 2 / Grade 7", "7 — Linear Systems: Social Entrepreneurship", [
    "Sistem persamaan linear dua variabel (SPLDV)",
    "Metode grafik — titik potong",
    "Metode substitusi & eliminasi",
    "Aplikasi sistem persamaan",
    "Pertidaksamaan linear & daerah solusi",
  ]),

  // ═══════════════════════════════════════════════════════════════════════════
  // MATHEMATICS — MYP 3-4 (Grade 8-9) — Haese & Harris MYP 3-4
  // ═══════════════════════════════════════════════════════════════════════════
  ...mk("Mathematics", "MYP 3-4", "MYP 3-4 / Grade 8-9", "1 — Being Specific", [
    "Problem solving strategies",
    "Sistem bilangan — real, rasional, irasional",
    "Laws of exponents & scientific notation",
    "Units & measurement — SI, konversi",
    "Surds, roots and radicals — bentuk akar",
    "Absolute value — nilai mutlak",
  ]),
  ...mk("Mathematics", "MYP 3-4", "MYP 3-4 / Grade 8-9", "2 — Decisions, Decisions", [
    "Making generalizations — pola ke rumus",
    "Coordinate geometry — jarak & titik tengah",
    "Modelling: Linear equations & systems",
    "Gradien, intercept & bentuk persamaan garis",
    "Sistem persamaan linear — 2 & 3 variabel",
  ]),
  ...mk("Mathematics", "MYP 3-4", "MYP 3-4 / Grade 8-9", "3 — Back to the Beginning", [
    "Relations and functions — domain & range",
    "Notasi fungsi f(x)",
    "Fungsi komposisi & invers",
    "Quadratic expressions — ekspansi & faktorisasi",
    "Completing the square",
    "Representing quadratic functions — grafik parabola",
    "Vertex, sumbu simetri, intercept",
    "Solving quadratic equations — faktorisasi, rumus ABC, completing square",
    "Diskriminan & jenis akar",
  ]),
  ...mk("Mathematics", "MYP 3-4", "MYP 3-4 / Grade 8-9", "4 — Mathematically Speaking", [
    "Set operations — gabungan, irisan, komplemen",
    "Venn diagrams — 2 & 3 himpunan",
    "Probability of single events",
    "Probability of combined events — AND, OR",
    "Diagram pohon — combined events",
    "Peluang bersyarat — conditional probability",
    "Two-way tables",
  ]),
  ...mk("Mathematics", "MYP 3-4", "MYP 3-4 / Grade 8-9", "5 — Spacious Interiors", [
    "Surface area — prisma, tabung, kerucut, bola",
    "Volume — prisma, tabung, kerucut, bola, limas",
    "Geometric transformations — translasi, refleksi, rotasi, dilatasi",
    "Matriks transformasi — 2×2",
    "Komposisi transformasi",
  ]),
  ...mk("Mathematics", "MYP 3-4", "MYP 3-4 / Grade 8-9", "6 — A Whole Range of Things", [
    "Univariate statistics — review & extend",
    "Mean, median, modus — grouped & ungrouped",
    "Box plot & whisker (box-and-whisker)",
    "Interquartile range (IQR)",
    "Standard deviation & variance",
    "Quantifying data — dispersi & distribusi",
    "Histograms — equal & unequal class widths",
    "Frequency density",
  ]),
  ...mk("Mathematics", "MYP 3-4", "MYP 3-4 / Grade 8-9", "7 — How Do They Measure Up?", [
    "The right triangle — Pythagoras & trigonometri",
    "Sin, cos, tan — extended to obtuse angles",
    "Properties of circles — busur, tali busur, juring",
    "Circle theorems 1 — sudut pusat & keliling",
    "Circle theorems 2 — segi empat siklik, tangent",
    "Panjang busur & luas juring",
  ]),
  ...mk("Mathematics", "MYP 3-4", "MYP 3-4 / Grade 8-9", "8 — What Comes Next?", [
    "Sequences — aritmatika & geometri",
    "Rumus suku ke-n — Un",
    "Deret — jumlah n suku",
    "Rearranging formulae — ubah subjek",
    "Proportion — direct & inverse",
    "Variation modelling",
  ]),
  ...mk("Mathematics", "MYP 3-4", "MYP 3-4 / Grade 8-9", "9 — So, What Do You Think?", [
    "Sampling techniques — random, stratified, convenience",
    "Bias dalam sampling",
    "Bivariate data — scatter plot & korelasi",
    "Line of best fit — by eye & least squares",
    "Persamaan regresi linear",
    "Koefisien korelasi — Pearson r",
    "Interpolasi & ekstrapolasi",
  ]),

  // ═══════════════════════════════════════════════════════════════════════════
  // MATHEMATICS — MYP 5 / DP Intro
  // ═══════════════════════════════════════════════════════════════════════════
  ...mk("Mathematics", "MYP 5", "MYP 5 / Grade 10", "Algebra Extensions", [
    "Fungsi kuadrat — vertex form & analisis",
    "Pertidaksamaan kuadrat",
    "Fungsi eksponensial & pertumbuhan",
    "Fungsi logaritma",
    "Polinomial & faktor teorema",
    "Binomial expansion — Pascal & nCr",
    "Partial fractions",
  ]),
  ...mk("Mathematics", "MYP 5", "MYP 5 / Grade 10", "Trigonometry & Geometry Extensions", [
    "Trigonometri — sudut di semua kuadran",
    "Identitas trigonometri dasar",
    "Aturan sinus & cosinus",
    "Grafik fungsi sin, cos, tan",
    "Persamaan trigonometri",
    "Vektor 2D — operasi & aplikasi",
    "Dot product",
  ]),
  ...mk("Mathematics", "MYP 5", "MYP 5 / Grade 10", "Calculus Intro", [
    "Limit & kontinuitas",
    "Turunan — first principles",
    "Aturan turunan — power, product, quotient, chain",
    "Aplikasi turunan — gradien & garis singgung",
    "Nilai stasioner — maksimum & minimum",
    "Optimisasi",
    "Integral — antiturunan",
    "Integral tertentu & luas area",
  ]),
  ...mk("Mathematics", "MYP 5", "MYP 5 / Grade 10", "Statistics & Probability Extensions", [
    "Distribusi normal — z-score",
    "Distribusi binomial",
    "Uji hipotesis — chi-squared",
    "Peluang majemuk — conditional & Bayes",
    "Diagram Venn — advanced",
  ]),

  // ═══════════════════════════════════════════════════════════════════════════
  // MATHEMATICS — IB DP
  // ═══════════════════════════════════════════════════════════════════════════
  ...mk("Mathematics", "DP", "IB DP", "Calculus", [
    "Limit & kontinuitas — epsilon-delta",
    "Turunan — first principles & rules",
    "Aturan turunan — product, quotient, chain, implicit",
    "Turunan fungsi trigonometri",
    "Turunan fungsi eksponensial & logaritma",
    "Nilai stasioner & titik balik",
    "Optimisasi — maks & min terapan",
    "Related rates",
    "Integral — antiturunan dasar",
    "Integral tertentu & Fundamental Theorem of Calculus",
    "Integrasi — substitusi, parsial",
    "Luas area & volume revolusi",
    "Persamaan diferensial — separable",
    "Persamaan diferensial — linear orde 1, integrating factor",
    "Slope fields & Euler method",
  ]),
  ...mk("Mathematics", "DP", "IB DP", "Functions & Equations", [
    "Fungsi komposisi & invers — formal",
    "Transformasi grafik — f(x+a), f(ax), af(x)",
    "Fungsi kuadrat — diskriminan & analisis",
    "Fungsi eksponensial & logaritma",
    "Fungsi rasional & asimtot",
    "Persamaan & pertidaksamaan modulus",
  ]),
  ...mk("Mathematics", "DP", "IB DP", "Trigonometry", [
    "Radian & arc length",
    "Identitas trigonometri — Pythagoras, sudut ganda",
    "Grafik fungsi trigonometri",
    "Persamaan trigonometri — general solution",
    "Aturan sinus & cosinus — extended",
    "Vectors — 2D & 3D",
    "Dot product, cross product",
    "Persamaan garis & bidang vektor",
  ]),
  ...mk("Mathematics", "DP", "IB DP", "Statistics & Probability", [
    "Distribusi normal — z-score, inverse normal",
    "Distribusi binomial — syarat & aplikasi",
    "Distribusi Poisson",
    "Central Limit Theorem",
    "Confidence intervals",
    "Uji hipotesis — one-tailed & two-tailed",
    "Chi-squared — goodness of fit & independence",
    "Peluang — conditional, Bayes' theorem",
    "Distribusi kontinu — probability density function",
  ]),
  ...mk("Mathematics", "DP", "IB DP", "Complex Numbers (HL)", [
    "Bilangan kompleks — a + bi",
    "Argand diagram & modulus",
    "De Moivre's theorem",
    "Euler form",
    "Akar kompleks — persamaan polinomial",
  ]),
  ...mk("Mathematics", "DP", "IB DP", "Proofs & Series (HL)", [
    "Proof by induction",
    "Barisan & deret — konvergensi",
    "Maclaurin series",
    "L'Hôpital's rule",
  ]),

  // ═══════════════════════════════════════════════════════════════════════════
  // MATHEMATICS — IGCSE (backward-compatible aliases)
  // ═══════════════════════════════════════════════════════════════════════════
  ...mk("Mathematics", "IGCSE", "IGCSE", "Number", [
    "Bilangan bulat, desimal & pecahan",
    "Faktor & kelipatan — FPB, KPK",
    "Perbandingan & proporsi",
    "Persentase — profit & loss, simple & compound interest",
    "Eksponen & akar — laws of indices",
    "Standard form / scientific notation",
    "Surds — bentuk akar & rasionalisasi",
  ]),
  ...mk("Mathematics", "IGCSE", "IGCSE", "Algebra", [
    "Ekspresi aljabar — ekspansi & faktorisasi",
    "Persamaan linear & SPLDV",
    "Persamaan kuadrat — faktorisasi, rumus ABC, completing square",
    "Pertidaksamaan — linear & kuadrat",
    "Barisan — aritmatika & geometri",
    "Binomial expansion — nCr",
    "Direct & inverse proportion",
    "Rumus — rearranging & substitution",
  ]),
  ...mk("Mathematics", "IGCSE", "IGCSE", "Functions", [
    "Notasi fungsi f(x)",
    "Fungsi linear, kuadrat, kubik, resiprokal",
    "Grafik fungsi & transformasi",
    "Fungsi invers & komposisi",
    "Fungsi eksponensial — growth & decay",
  ]),
  ...mk("Mathematics", "IGCSE", "IGCSE", "Geometry & Trigonometry", [
    "Sudut & garis — properties",
    "Segitiga — kongruensi & kesebangunan",
    "Teorema Pythagoras — 2D & 3D",
    "Trigonometri — sin, cos, tan, aplikasi",
    "Aturan sinus & cosinus",
    "Lingkaran — teorema, busur, juring",
    "Bangun ruang — volume & luas permukaan",
    "Vektor — 2D, operasi & geometri",
    "Transformasi — translasi, refleksi, rotasi, dilatasi",
  ]),
  ...mk("Mathematics", "IGCSE", "IGCSE", "Statistics & Probability", [
    "Mean, median, modus — grouped & ungrouped",
    "Box plot & IQR",
    "Histogram & frequency density",
    "Scatter plot & line of best fit",
    "Peluang — dasar & combined events",
    "Diagram pohon — probability",
    "Conditional probability",
    "Cumulative frequency & quartiles",
  ]),

  // ═══════════════════════════════════════════════════════════════════════════
  // MATH / MATEMATIKA ALIASES (backward compatible)
  // ═══════════════════════════════════════════════════════════════════════════
  ...mk("Math", "MYP 3-4", "MYP 3-4 / Grade 8-9", "Persamaan Linear", [
    "Persamaan linear & SPLDV",
    "Pertidaksamaan linear",
    "Gradien & persamaan garis",
  ], "matematika"),
  ...mk("Math", "MYP 3-4", "MYP 3-4 / Grade 8-9", "Fungsi Kuadrat", [
    "Fungsi kuadrat — grafik parabola",
    "Persamaan kuadrat — faktorisasi, rumus ABC",
    "Diskriminan & jenis akar",
  ], "matematika persamaan kuadrat"),
  ...mk("Math", "MYP 3-4", "MYP 3-4 / Grade 8-9", "Geometri", [
    "Teorema Pythagoras",
    "Lingkaran — teorema sudut",
    "Kesebangunan & kongruensi",
    "Transformasi geometri",
  ], "matematika bangun datar"),
  ...mk("Math", "MYP 3-4", "MYP 3-4 / Grade 8-9", "Statistika", [
    "Mean, median, modus",
    "Standar deviasi",
    "Box plot & histogram",
    "Scatter plot & korelasi",
  ], "matematika data statistik"),

  ...mk("Matematika", "MYP 3-4", "MYP 3-4 / Grade 8-9", "Aljabar", [
    "Persamaan linear & SPLDV — metode eliminasi substitusi",
    "Persamaan kuadrat — tiga metode",
    "Fungsi — notasi, domain, range, grafik",
    "Barisan & deret — aritmatika, geometri",
    "Eksponen & logaritma",
  ]),
  ...mk("Matematika", "MYP 3-4", "MYP 3-4 / Grade 8-9", "Geometri & Trigonometri", [
    "Teorema Pythagoras & aplikasi",
    "Lingkaran — teorema, busur, juring",
    "Transformasi — translasi, refleksi, rotasi, dilatasi",
    "Bangun ruang — volume & luas permukaan",
    "Trigonometri — sin cos tan, aturan sinus cosinus",
  ]),
  ...mk("Matematika", "MYP 3-4", "MYP 3-4 / Grade 8-9", "Statistika & Peluang", [
    "Mean, median, modus — data tunggal & kelompok",
    "Standar deviasi & variansi",
    "Peluang — dasar, majemuk, bersyarat",
    "Distribusi binomial & normal",
    "Scatter plot & regresi linear",
  ]),
  ...mk("Matematika", "DP", "IB DP", "Kalkulus", [
    "Limit fungsi",
    "Turunan — aturan dasar, rantai, product, quotient",
    "Aplikasi turunan — stasioner, optimasi, related rates",
    "Integral tak tentu & tertentu",
    "Integrasi — substitusi, parsial",
    "Aplikasi integral — luas area & volume revolusi",
    "Persamaan diferensial",
  ]),
  ...mk("Matematika", "DP", "IB DP", "Statistika Lanjut", [
    "Distribusi normal & binomial",
    "Confidence intervals",
    "Uji hipotesis — z-test, t-test, chi-squared",
  ]),

  // ═══════════════════════════════════════════════════════════════════════════
  // MATH AA / MATH AI — DP specific
  // ═══════════════════════════════════════════════════════════════════════════
  ...mk("Math AA HL", "DP", "IB DP", "1 — Algebra", [
    "Sequences — arithmetic, geometric, sigma notation",
    "Exponents and logarithms — laws, equations",
    "Binomial expansion — Pascal triangle, nCr formula",
    "Proof by induction",
    "Complex numbers — Cartesian form, polar form, De Moivre theorem, nth roots",
    "System of linear equations — row reduction, solutions",
    "Partial fractions"
  ]),

  ...mk("Math AA HL", "DP", "IB DP", "2 — Functions", [
    "Types of functions — linear, quadratic, rational, asymptotes",
    "Special functions — absolute value, signum, floor/ceiling",
    "Rearranging functions — inverse, composite, transformations",
    "Polynomial long division",
    "Factor and remainder theorem",
    "Fundamental theorem of algebra",
    "Sums and products of roots — Vieta formulas"
  ]),

  ...mk("Math AA HL", "DP", "IB DP", "3 — Vectors", [
    "Working with vectors — magnitude, unit vectors",
    "Equations of lines — vector, parametric, Cartesian",
    "Dot product — angle between vectors",
    "Cross product — area, torque (HL)",
    "Equation of a plane (HL)",
    "Angles between lines and planes (HL)"
  ]),

  ...mk("Math AA HL", "DP", "IB DP", "4 — Trigonometry and Circular Functions", [
    "Basic trigonometry — radians, degrees, unit circle",
    "Circular functions — sin, cos, tan graphs and transformations",
    "Trigonometric identities — Pythagorean, double angle, sum/difference",
    "Inverse and reciprocal trig functions — arcsin, arccos, arctan, sec, csc, cot (HL)"
  ]),

  ...mk("Math AA HL", "DP", "IB DP", "5 — Differentiation", [
    "Limits and L Hopital rule (HL)",
    "Derivation from first principles",
    "Polynomial differentiation — power, product, quotient, chain rules",
    "Derivatives of alternative functions — trig, exp, log",
    "Implicit differentiation (HL)",
    "Tangent and normal equations",
    "Turning points — maxima, minima, inflection",
    "Sketching graphs — first/second derivative tests",
    "Applications — kinematics, optimization, related rates",
    "Maclaurin series — expansion and approximation (HL)"
  ]),

  ...mk("Math AA HL", "DP", "IB DP", "6 — Integration", [
    "Indefinite integral — antiderivatives, +C",
    "Definite integral — fundamental theorem, evaluation",
    "Area between curves",
    "Volume of revolution — disk/washer method",
    "Ordinary differential equations — separation of variables, substitution (HL)",
    "Integrating factor and Euler method (HL)"
  ]),

  ...mk("Math AA HL", "DP", "IB DP", "7 — Probability", [
    "Single events — Venn diagrams, set notation",
    "Multiple events — tree diagrams, conditional probability",
    "Distributions — binomial, normal, continuous (HL)",
    "Bayes theorem (HL)"
  ]),

  ...mk("Math AA HL", "DP", "IB DP", "8 — Statistics", [
    "Descriptive statistics — mean, median, mode, std dev",
    "Sampling techniques — random, stratified, systematic",
    "Statistical graphs — histograms, box plots, cumulative frequency",
    "Bivariate statistics — scatter plots, correlation, regression"
  ]),

  ...mk("Math AA SL", "DP", "IB DP", "1 — Algebra", [
    "Sequences — arithmetic, geometric, sigma notation",
    "Exponents and logarithms — laws and equations",
    "Binomial expansion — Pascal triangle, nCr formula"
  ]),

  ...mk("Math AA SL", "DP", "IB DP", "2 — Functions", [
    "Types of functions — linear, quadratic, asymptotes, exponential, logarithmic",
    "Rearranging functions — inverse, composite, transformations",
    "Intersection of functions — solving graphically and algebraically"
  ]),

  ...mk("Math AA SL", "DP", "IB DP", "3 — Trigonometry and Circular Functions", [
    "Basic trigonometry — right triangles, unit circle, radians",
    "Circular functions — sin, cos, tan graphs, amplitude, period",
    "Trigonometric identities — Pythagorean, double angle"
  ]),

  ...mk("Math AA SL", "DP", "IB DP", "4 — Differentiation", [
    "Polynomial differentiation — power, product, quotient, chain rules",
    "Tangent and normal equations",
    "Turning points — maxima, minima, inflection",
    "Sketching graphs — using derivatives",
    "Applications — kinematics, optimization"
  ]),

  ...mk("Math AA SL", "DP", "IB DP", "5 — Integration", [
    "Indefinite integral — antiderivatives",
    "Definite integral — fundamental theorem",
    "Area between curves"
  ]),

  ...mk("Math AA SL", "DP", "IB DP", "6 — Probability", [
    "Single events — Venn diagrams, set notation",
    "Multiple events — tree diagrams",
    "Distributions — binomial and normal distributions"
  ]),

  ...mk("Math AA SL", "DP", "IB DP", "7 — Statistics", [
    "Descriptive statistics — mean, median, mode, std dev",
    "Sampling techniques",
    "Statistical graphs — histograms, box plots",
    "Bivariate statistics — scatter plots, correlation, regression"
  ]),

  ...mk("Math AI HL", "DP", "IB DP", "1 — Number and Algebra", [
    "Approximation and rounding — significant figures, decimal places",
    "Standard form — scientific notation",
    "Sets — notation, operations, Venn diagrams",
    "Exponents and logarithms",
    "Sequences and series — arithmetic, geometric, sigma notation",
    "Finance — simple interest, compound interest, annuities, amortization",
    "Estimation and error — absolute and relative error",
    "Simultaneous equations",
    "Matrices — operations, inverses, eigenvalues/eigenvectors (HL)",
    "Graph theory — trees, paths, Kruskal, Dijkstra (HL)"
  ]),

  ...mk("Math AI HL", "DP", "IB DP", "2 — Functions", [
    "Basic concepts — domain, range, inverse functions",
    "Linear models — y = mx + c, interpolation",
    "Quadratic models — vertex form, optimization",
    "Polynomials and cubic models",
    "Exponential models — growth and decay, logistic",
    "Sinusoidal models — amplitude, period, phase shift"
  ]),

  ...mk("Math AI HL", "DP", "IB DP", "3 — Geometry and Trigonometry", [
    "Lengths, areas, volumes — 2D and 3D shapes",
    "Right-angled triangles — Pythagoras, basic trig",
    "Non-right-angled triangles — sine rule, cosine rule, area formulas",
    "Circles — arcs, sectors, segments",
    "Voronoi diagrams — construction, nearest neighbour"
  ]),

  ...mk("Math AI HL", "DP", "IB DP", "4 — Calculus", [
    "Differentiation — polynomials, tangent/normal, turning points, optimization",
    "Integration — indefinite, definite, trapezoidal rule",
    "Kinematics — displacement, velocity, acceleration",
    "Differential equations — separable, slope fields (HL)"
  ]),

  ...mk("Math AI HL", "DP", "IB DP", "5 — Probability", [
    "Single events — Venn diagrams, sample space",
    "Multiple events — tree diagrams, conditional probability",
    "Probability distributions — binomial, normal, Poisson (HL)"
  ]),

  ...mk("Math AI HL", "DP", "IB DP", "6 — Statistics", [
    "Descriptive statistics — mean, median, mode, std dev, IQR",
    "Sampling techniques — random, stratified, systematic",
    "Statistical graphs — histograms, box plots, cumulative frequency",
    "Bivariate statistics — Pearson correlation, Spearman rank",
    "Chi-squared test — goodness of fit, independence",
    "T-test — one-sample, two-sample",
    "Confidence intervals and hypothesis testing (HL)",
    "Regression — linear and non-linear (HL)"
  ]),

  ...mk("Math AI SL", "DP", "IB DP", "1 — Number and Algebra", [
    "Approximation and rounding",
    "Standard form",
    "Sets — operations and Venn diagrams",
    "Exponents and logarithms",
    "Sequences and series — arithmetic, geometric, sigma notation",
    "Finance — simple interest, compound interest, annuities",
    "Estimation and error",
    "Simultaneous equations"
  ]),

  ...mk("Math AI SL", "DP", "IB DP", "2 — Functions", [
    "Basic concepts — domain, range, inverse functions",
    "Linear models",
    "Quadratic models",
    "Polynomials",
    "Exponential models — growth and decay",
    "Sinusoidal models"
  ]),

  ...mk("Math AI SL", "DP", "IB DP", "3 — Geometry and Trigonometry", [
    "Lengths, areas, volumes",
    "Right-angled triangles — Pythagoras, trig ratios",
    "Non-right-angled triangles — sine/cosine rules, area",
    "Circles — arcs, sectors",
    "Voronoi diagrams — construction and interpretation"
  ]),

  ...mk("Math AI SL", "DP", "IB DP", "4 — Calculus", [
    "Differentiation — polynomials, tangent/normal, turning points, optimization",
    "Integration — indefinite, definite, trapezoidal rule"
  ]),

  ...mk("Math AI SL", "DP", "IB DP", "5 — Probability", [
    "Single events — Venn diagrams",
    "Multiple events — tree diagrams",
    "Probability distributions — binomial, normal"
  ]),

  ...mk("Math AI SL", "DP", "IB DP", "6 — Statistics", [
    "Descriptive statistics — mean, median, mode, std dev, IQR",
    "Sampling techniques",
    "Statistical graphs — histograms, box plots",
    "Bivariate statistics — Pearson correlation, Spearman rank",
    "Chi-squared test — goodness of fit, independence",
    "T-test — one-sample, two-sample"
  ]),


  // ═══════════════════════════════════════════════════════════════════════════
  // SCIENCES — MYP 1-5
  // ═══════════════════════════════════════════════════════════════════════════
  ...mk("Sciences", "MYP 1", "MYP 1 / Grade 6", "Biology MYP 1", [
    "Sel — struktur dasar & fungsi",
    "Klasifikasi makhluk hidup — 5 kingdom",
    "Ekosistem — rantai & jaring makanan",
    "Adaptasi & habitat",
    "Reproduksi tumbuhan & hewan dasar",
  ]),
  ...mk("Sciences", "MYP 1", "MYP 1 / Grade 6", "Chemistry MYP 1", [
    "Materi & wujud zat — padat, cair, gas",
    "Perubahan fisika & kimia",
    "Campuran & pemisahan — filtrasi, distilasi",
    "Atom & unsur dasar",
    "Asam & basa — indikator sederhana",
  ]),
  ...mk("Sciences", "MYP 1", "MYP 1 / Grade 6", "Physics MYP 1", [
    "Besaran & satuan SI",
    "Gaya & gerak — GLB, GLBB",
    "Energi — bentuk & transformasi",
    "Rangkaian listrik sederhana",
    "Cahaya & pembentukan bayangan",
  ]),
  ...mk("Sciences", "MYP 3-4", "MYP 3-4 / Grade 8-9", "Biology MYP 3-4", [
    "Sel — prokariot & eukariot",
    "Transport membran — difusi, osmosis, transport aktif",
    "Enzim — sifat & faktor",
    "Fotosintesis & respirasi seluler",
    "Genetika — DNA, gen, kromosom, pewarisan Mendel",
    "Evolusi & seleksi alam",
    "Ekologi — populasi, komunitas, ekosistem",
    "Sistem tubuh manusia — pencernaan, sirkulasi, saraf",
  ]),
  ...mk("Sciences", "MYP 3-4", "MYP 3-4 / Grade 8-9", "Chemistry MYP 3-4", [
    "Struktur atom — proton, neutron, elektron, isotop",
    "Tabel periodik — golongan & periode, tren",
    "Ikatan kimia — ionik, kovalen, logam",
    "Stoikiometri — mol, massa molar, persamaan reaksi",
    "Reaksi kimia — jenis & penyetaraan",
    "Asam, basa & pH",
    "Laju reaksi — faktor & katalis",
    "Kimia karbon — hidrokarbon & polimer dasar",
  ]),
  ...mk("Sciences", "MYP 3-4", "MYP 3-4 / Grade 8-9", "Physics MYP 3-4", [
    "Kinematika — GLB, GLBB, gerak parabola",
    "Hukum Newton I, II, III",
    "Energi — kinetik, potensial, hukum kekekalan",
    "Termodinamika — suhu, kalor, perpindahan",
    "Gelombang — bunyi & cahaya",
    "Listrik — hukum Ohm, rangkaian seri & paralel",
    "Magnet & elektromagnetisme",
    "Fisika nuklir — radioaktivitas dasar",
  ]),

  // ═══════════════════════════════════════════════════════════════════════════
  // BIOLOGY
  // ═══════════════════════════════════════════════════════════════════════════
  ...mk("Biology", "IGCSE", "IGCSE", "Cell Biology", [
    "Struktur sel prokariot & eukariot",
    "Organel sel & fungsinya",
    "Transport membran — difusi, osmosis, transport aktif",
    "Pembelahan sel — mitosis & meiosis",
  ]),
  ...mk("Biology", "IGCSE", "IGCSE", "Biochemistry & Enzymes", [
    "Karbohidrat, lipid, protein — struktur & fungsi",
    "Enzim — cara kerja, faktor suhu & pH",
    "ATP & respirasi seluler — aerobik & anaerobik",
  ]),
  ...mk("Biology", "IGCSE", "IGCSE", "Genetics & Evolution", [
    "DNA — struktur & replikasi",
    "Transkripsi & translasi",
    "Hukum Mendel — monohibrida & dihibrida",
    "Mutasi & variasi genetik",
    "Seleksi alam & spesiasi",
    "Bioteknologi — PCR, GM crops",
  ]),
  ...mk("Biology", "IGCSE", "IGCSE", "Ecology", [
    "Rantai & jaring makanan",
    "Piramida ekologi",
    "Siklus karbon & nitrogen",
    "Dinamika populasi",
    "Konservasi & biodiversitas",
  ]),
  ...mk("Biology", "IGCSE", "IGCSE", "Plant Biology", [
    "Fotosintesis — light & dark reactions",
    "Transpirasi & transport xilem-floem",
    "Hormon tumbuhan",
  ]),
  ...mk("Biology", "IGCSE", "IGCSE", "Human Physiology", [
    "Sistem pencernaan",
    "Sistem sirkulasi — jantung & pembuluh",
    "Sistem respirasi — paru & pertukaran gas",
    "Sistem ekskresi — ginjal",
    "Sistem saraf — neuron & sinapsis",
    "Sistem endokrin & reproduksi",
    "Sistem imun — antibodi & vaksin",
  ]),
  ...mk("Biology", "DP", "IB DP", "1 — Cell Biology", [
    "Cell theory — principles and evidence",
    "Cells and membrane transport — eukaryotic vs prokaryotic",
    "Membrane structure — fluid mosaic model",
    "Transport — diffusion, osmosis, active transport, osmolarity",
    "Origin of cells — endosymbiotic theory",
    "Cell division — cell cycle, mitosis, cytokinesis"
  ]),

  ...mk("Biology", "DP", "IB DP", "2 — Molecular Biology", [
    "Molecules to metabolism — anabolism and catabolism",
    "Water — properties and biological significance",
    "Carbohydrates and lipids — structure and function",
    "Proteins — amino acids, levels of structure, denaturation",
    "Enzymes — mechanism, factors (pH, temp, substrate), inhibition",
    "Structure of DNA and RNA — nucleotides, double helix",
    "DNA replication — semi-conservative, enzymes",
    "Transcription — mRNA synthesis",
    "Translation — ribosomes, tRNA, genetic code",
    "Cell respiration — glycolysis, Krebs cycle, ETC",
    "Photosynthesis — light reactions, Calvin cycle"
  ]),

  ...mk("Biology", "DP", "IB DP", "3 — Genetics", [
    "Genes and chromosomes — loci, alleles, karyotyping",
    "Meiosis — crossing over, independent assortment",
    "Inheritance — monohybrid, dihybrid, sex-linked",
    "Genetic modifications and biotechnology — PCR, GMO, CRISPR",
    "Gene pools and speciation — Hardy-Weinberg (HL)"
  ]),

  ...mk("Biology", "DP", "IB DP", "4 — Ecology", [
    "Species, communities and ecosystems — definitions",
    "Energy flow — food chains, pyramids of energy",
    "Carbon cycling — pools and fluxes",
    "Climate change — greenhouse effect, impacts"
  ]),

  ...mk("Biology", "DP", "IB DP", "5 — Evolution and Biodiversity", [
    "Evidence of evolution — fossils, homologous structures",
    "Natural selection — variation, adaptation, selection pressure",
    "Classification of biodiversity — domains, kingdoms, phyla",
    "Cladistics — clades, cladograms, parsimony"
  ]),

  ...mk("Biology", "DP", "IB DP", "6 — Human Physiology", [
    "Digestion and absorption — enzymes, villi, absorption",
    "The blood system — heart, vessels, cardiac cycle",
    "Defence against infectious diseases — innate and adaptive immunity",
    "Gas exchange — ventilation, alveoli, hemoglobin",
    "Neurons and synapses — action potential, neurotransmitters",
    "Hormones and homeostasis — feedback loops, glucose regulation",
    "Reproduction — gametes, fertilization, IVF"
  ]),

  ...mk("Biology", "DP", "IB DP", "7 — Nucleic Acids (HL)", [
    "DNA structure and replication — detailed enzymes, Okazaki fragments",
    "Transcription and gene expression — promoters, transcription factors, epigenetics",
    "Translation — ribosome structure, initiation, elongation, termination"
  ]),

  ...mk("Biology", "DP", "IB DP", "8 — Metabolism, Cell Respiration and Photosynthesis (HL)", [
    "Metabolism — enzyme kinetics, competitive/non-competitive inhibition",
    "Cell respiration — detailed glycolysis, link reaction, Krebs, ETC, chemiosmosis",
    "Photosynthesis — detailed light reactions, photophosphorylation, Calvin cycle"
  ]),

  ...mk("Biology", "DP", "IB DP", "9 — Plant Biology (HL)", [
    "Transport in xylem — transpiration pull, cohesion-tension",
    "Transport in phloem — translocation, pressure-flow",
    "Reproduction of flowering plants — pollination, fertilization, seed dispersal",
    "Growth in plants — meristems, auxin, phototropism"
  ]),

  ...mk("Biology", "DP", "IB DP", "10 — Animal Physiology (HL)", [
    "Antibody production and vaccination — monoclonal antibodies, immunity",
    "Movement — muscle contraction (sliding filament theory), skeleton",
    "Kidneys and osmoregulation — nephron, ultrafiltration, ADH",
    "Reproduction — spermatogenesis, oogenesis, hormones"
  ]),

  // ═══════════════════════════════════════════════════════════════════════════
  // CHEMISTRY
  // ═══════════════════════════════════════════════════════════════════════════
  ...mk("Chemistry", "IGCSE", "IGCSE", "Atomic Structure & Periodic Table", [
    "Model atom — Thomson, Rutherford, Bohr",
    "Proton, neutron, elektron & isotop",
    "Konfigurasi elektron",
    "Tabel periodik — tren & golongan",
    "Logam alkali, halogen, gas mulia",
  ]),
  ...mk("Chemistry", "IGCSE", "IGCSE", "Stoichiometry", [
    "Konsep mol & massa molar",
    "Rumus empiris & molekul",
    "Persamaan kimia setara",
    "Limiting reagent & yield",
    "Konsentrasi & titrasi",
  ]),
  ...mk("Chemistry", "IGCSE", "IGCSE", "Bonding & Structure", [
    "Ikatan ionik & kisi",
    "Ikatan kovalen & struktur Lewis",
    "Molekul polar & nonpolar",
    "Bentuk molekul — VSEPR",
    "Gaya antarmolekul — van der Waals, ikatan hidrogen",
    "Ikatan logam & sifat",
  ]),
  ...mk("Chemistry", "IGCSE", "IGCSE", "Thermochemistry & Kinetics", [
    "Entalpi — eksoterm & endoterm",
    "Hukum Hess",
    "Energi ikatan & kalorimetri",
    "Laju reaksi & faktor",
    "Teori tumbukan & energi aktivasi",
    "Katalis",
  ]),
  ...mk("Chemistry", "IGCSE", "IGCSE", "Equilibrium & Acids/Bases", [
    "Kesetimbangan dinamis — Kc",
    "Le Chatelier's principle",
    "Asam-basa — kuat & lemah",
    "pH & indikator",
    "Titrasi asam-basa",
  ]),
  ...mk("Chemistry", "IGCSE", "IGCSE", "Redox & Electrochemistry", [
    "Bilangan oksidasi",
    "Setengah reaksi redoks",
    "Sel elektrokimia",
    "Elektrolisis",
  ]),
  ...mk("Chemistry", "IGCSE", "IGCSE", "Organic Chemistry", [
    "Alkana — struktur & reaksi",
    "Alkena — adisi & polimerisasi",
    "Alkohol & asam karboksilat",
    "Ester — pembentukan & hidrolisis",
    "Polimer — adisi & kondensasi",
  ]),
  ...mk("Chemistry", "DP", "IB DP", "1 — Quantitative Chemistry", [
    "Types and states of matter",
    "Chemical reactions",
    "Mole concept and chemical calculations",
    "Gas laws and ideal gases",
    "Chemical calculations — limiting/excess reactants"
  ]),

  ...mk("Chemistry", "DP", "IB DP", "2 — Atomic Structure", [
    "Types of particles — proton, neutron, electron",
    "Notation — atomic number, mass number",
    "Isotopes — abundance and relative atomic mass Ar",
    "Atomic shells, subshells and orbitals",
    "Electromagnetic spectrum",
    "Ionization energies — trends and exceptions"
  ]),

  ...mk("Chemistry", "DP", "IB DP", "3 — Periodicity", [
    "The Periodic Table — groups and periods",
    "Periodic trends — atomic radius, ionic radius",
    "Electronegativity and ionization energy trends",
    "Transition elements — properties and complexes (HL)"
  ]),

  ...mk("Chemistry", "DP", "IB DP", "4 — Bonding", [
    "Metallic bonding and properties",
    "Ionic bonding and lattice structure",
    "Covalent bonding and Lewis structures",
    "Intermolecular forces — van der Waals, hydrogen bonding",
    "Properties of molecular compounds",
    "Molecular orbitals (HL)",
    "Hybridization — sp, sp², sp³ (HL)",
    "Ozone and oxygen — resonance structures (HL)"
  ]),

  ...mk("Chemistry", "DP", "IB DP", "5 — Energetics", [
    "Temperature vs heat vs enthalpy",
    "Energy diagrams — exothermic and endothermic",
    "Hess law and energy cycles",
    "Energy calculations — bond enthalpies",
    "Energy cycles — Born-Haber (HL)",
    "Entropy and Gibbs free energy (HL)"
  ]),

  ...mk("Chemistry", "DP", "IB DP", "6 — Kinetics", [
    "Collision theory and activation energy",
    "Rate equation and reaction order (HL)",
    "Arrhenius equation — temperature and rate (HL)"
  ]),

  ...mk("Chemistry", "DP", "IB DP", "7 — Equilibrium", [
    "Dynamic equilibrium — Kc and Kp",
    "Equilibrium law expression",
    "Le Chatelier principle",
    "Equilibrium calculations — ICE tables",
    "Relation between ΔG and Kc (HL)"
  ]),

  ...mk("Chemistry", "DP", "IB DP", "8 — Acids and Bases", [
    "Acid and base definitions — Brønsted-Lowry, Lewis",
    "Strong vs weak acids and bases",
    "pH scale and Kw",
    "Buffers — composition and action (HL)",
    "pH curves and indicators (HL)",
    "Acid deposition — causes and effects"
  ]),

  ...mk("Chemistry", "DP", "IB DP", "9 — Redox", [
    "Oxidation states and half-reactions",
    "Reactivity series",
    "Electrochemical cells — voltaic and electrolytic",
    "Winkler method and BOD — water analysis"
  ]),

  ...mk("Chemistry", "DP", "IB DP", "10 — Organic Chemistry", [
    "Fundamentals — functional groups, homologous series",
    "Isomers — structural and stereoisomerism",
    "Reactions — addition, substitution, oxidation, reduction",
    "Reaction mechanisms — SN1, SN2, electrophilic addition (HL)",
    "Retrosynthesis and reaction overview (HL)"
  ]),

  ...mk("Chemistry", "DP", "IB DP", "11 — Measurement and Data Processing", [
    "Graphical techniques — calibration curves, error bars",
    "Spectroscopic identification — IR, NMR, mass spectrometry"
  ]),

  // ═══════════════════════════════════════════════════════════════════════════
  // PHYSICS
  // ═══════════════════════════════════════════════════════════════════════════
  ...mk("Physics", "IGCSE", "IGCSE", "Mechanics", [
    "Besaran & satuan SI — vektor & skalar",
    "Kinematika — GLB, GLBB, grafik gerak",
    "Hukum Newton I, II, III",
    "Gaya — normal, gesek, berat",
    "Momentum & impuls — kekekalan",
    "Tumbukan",
  ]),
  ...mk("Physics", "IGCSE", "IGCSE", "Energy & Thermal", [
    "Kerja & energi — kinetik, potensial",
    "Daya & efisiensi",
    "Suhu, kalor & kapasitas kalor",
    "Perpindahan kalor — konduksi, konveksi, radiasi",
    "Perubahan fase & kalor laten",
  ]),
  ...mk("Physics", "IGCSE", "IGCSE", "Waves & Optics", [
    "Gelombang — karakteristik",
    "Gelombang bunyi",
    "Pemantulan & pembiasan cahaya",
    "Lensa — konvergen & divergen",
    "Spektrum elektromagnetik",
  ]),
  ...mk("Physics", "IGCSE", "IGCSE", "Electricity & Magnetism", [
    "Muatan listrik & medan listrik",
    "Arus, tegangan, resistansi — hukum Ohm",
    "Rangkaian seri & paralel",
    "Daya listrik",
    "Medan magnet & elektromagnetisme",
    "Induksi elektromagnetik",
  ]),
  ...mk("Physics", "IGCSE", "IGCSE", "Nuclear & Space", [
    "Struktur atom & radioaktivitas",
    "Peluruhan alfa, beta, gamma",
    "Half-life & aplikasi",
    "Fusi & fisi nuklir",
  ]),
  ...mk("Physics", "DP", "IB DP", "1 — Measurements and Mathematical Foundations", [
    "Notation — SI units, order of magnitude, significant figures",
    "Measurements — uncertainties, error propagation, graphs",
    "Vectors — addition, subtraction, components"
  ]),

  ...mk("Physics", "DP", "IB DP", "2 — Mechanics", [
    "Motion — equations of motion (SUVAT), motion graphs, projectile motion, fluid resistance",
    "Forces — Newton laws, free-body diagrams, friction",
    "Work, energy and power — kinetic, potential, conservation",
    "Momentum and impulse — conservation, elastic and inelastic collisions"
  ]),

  ...mk("Physics", "DP", "IB DP", "3 — Thermal Physics", [
    "Thermal concepts — temperature, heat, internal energy, mole",
    "Phase transitions — latent heat, phase diagrams",
    "Kinetic model of an ideal gas — pressure, temperature, gas laws"
  ]),

  ...mk("Physics", "DP", "IB DP", "4 — Oscillations and Waves", [
    "Oscillations — simple harmonic motion, energy in SHM (HL)",
    "Travelling waves — transverse, longitudinal, speed, frequency, wavelength",
    "Wave characteristics — reflection, refraction, diffraction, polarization",
    "Interference — Young double-slit, thin films",
    "Standing waves — nodes, antinodes, harmonics"
  ]),

  ...mk("Physics", "DP", "IB DP", "5 — Electricity and Magnetism", [
    "Electric fields — Coulomb law, field lines, potential",
    "Resistance — Ohm law, resistivity, series/parallel circuits",
    "Cells — EMF, internal resistance",
    "Magnetic effects of electric currents — right-hand rules, solenoids",
    "Movement of charged particles in magnetic fields — mass spectrometer",
    "Electromagnetic induction — Faraday law, Lenz law (HL)",
    "Capacitors — capacitance, RC circuits (HL)",
    "Power generation and transmission — AC vs DC, transformers (HL)"
  ]),

  ...mk("Physics", "DP", "IB DP", "6 — Circular Motion and Gravitation", [
    "Circular motion — centripetal force and acceleration",
    "Gravitation — Newton law, gravitational field, orbits"
  ]),

  ...mk("Physics", "DP", "IB DP", "7 — Atomic and Nuclear Physics", [
    "Atomic structure — Rutherford, Bohr models, energy levels",
    "Nuclear structure — nucleons, binding energy, mass defect",
    "Radioactivity — alpha, beta, gamma decay, half-life",
    "Nuclear reactions — fission, fusion, chain reaction",
    "Elementary particles — quarks, leptons, standard model (HL)",
    "Interaction of matter with radiation — photoelectric effect (HL)",
    "Rutherford scattering — nuclear size estimation (HL)"
  ]),

  ...mk("Physics", "DP", "IB DP", "8 — Energy Production", [
    "Energy sources — fossil fuels, nuclear, solar, hydroelectric, wind",
    "Thermal energy transfer — conduction, convection, radiation, black body"
  ]),

  // ═══════════════════════════════════════════════════════════════════════════
  // ECONOMICS
  // ═══════════════════════════════════════════════════════════════════════════
  ...mk("Economics", "IGCSE", "IGCSE", "Basic Economic Problem", [
    "Scarcity & choice",
    "Opportunity cost",
    "Factors of production",
    "PPC — Production Possibility Curve",
  ]),
  ...mk("Economics", "IGCSE", "IGCSE", "Microeconomics", [
    "Demand & supply — hukum & kurva",
    "Price elasticity — PED, PES",
    "Market equilibrium & disequilibrium",
    "Government intervention — price ceiling/floor, tax, subsidy",
    "Market failure — externality, public goods",
    "Cost, revenue & profit",
    "Market structures — perfect competition, monopoly, oligopoly",
  ]),
  ...mk("Economics", "IGCSE", "IGCSE", "Macroeconomics", [
    "GDP — perhitungan & interpretasi",
    "Inflasi — CPI, penyebab, dampak",
    "Pengangguran — jenis & dampak",
    "Pertumbuhan ekonomi",
    "Fiscal policy — tax & government spending",
    "Monetary policy — interest rate & money supply",
    "Supply-side policy",
  ]),
  ...mk("Economics", "IGCSE", "IGCSE", "International Economics", [
    "Perdagangan internasional — comparative advantage",
    "Neraca pembayaran — current account",
    "Exchange rate — floating & fixed",
    "Globalisasi & proteksionisme",
    "WTO, IMF, World Bank",
  ]),
  ...mk("Economics", "DP", "IB DP", "1 — Introduction to Economics", [
    "Foundations of economics — scarcity, choice, opportunity cost",
    "Economic approach to the world — positive vs normative",
    "Structure of the IB Economics course"
  ]),

  ...mk("Economics", "DP", "IB DP", "2 — Microeconomics", [
    "Demand and supply — law of demand/supply, equilibrium, market efficiency",
    "Elasticities — PED, PES, YED, XED",
    "Critique of maximizing behavior — rational choice vs behavioral",
    "Externalities — MPC, MPB, MSC, MSB, production/consumption externalities",
    "Other sources of market failure — public goods, asymmetric information",
    "Government intervention — indirect taxes, subsidies, price ceilings/floors",
    "Theory of the firm — production, costs, revenues, profit, goals (HL)",
    "Market structures — perfect competition, monopoly, monopolistic competition, oligopoly (HL)"
  ]),

  ...mk("Economics", "DP", "IB DP", "3 — Macroeconomics", [
    "Overall economic activity — circular flow of income, leakages/injections",
    "Measures of economic activity — GDP, GNP/GNI, green GDP",
    "Business cycle — phases, output gaps",
    "Aggregate demand (AD) — components, shifts",
    "Aggregate supply — SRAS, LRAS (neoclassical vs Keynesian)",
    "Keynesian multiplier — MPC, MPS, spending multiplier",
    "Macroeconomic objectives — low unemployment, low inflation, growth, equity",
    "Phillips curve — short-run vs long-run",
    "Fiscal policy — government spending, taxation, automatic stabilizers",
    "Monetary policy — interest rates, money supply, quantitative easing",
    "Supply-side policies — interventionist vs market-based"
  ]),

  ...mk("Economics", "DP", "IB DP", "4 — The Global Economy", [
    "Free trade — absolute and comparative advantage, WTO",
    "Trade protectionism — tariffs, subsidies, quotas, administrative barriers",
    "Economic integration — free trade areas, customs unions, monetary unions",
    "Exchange rates — freely floating, fixed, managed float",
    "Balance of payments — current account, capital/financial account",
    "Sustainable development — SDGs, environmental sustainability",
    "Measuring development — GDP/capita, HDI, GII, MPI",
    "Contributions and barriers to development — trade, aid, debt, corruption",
    "Evaluation of development policies — market-led vs interventionist"
  ]),

  // ═══════════════════════════════════════════════════════════════════════════
  // BUSINESS MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════
  ...mk("Business Management", "IGCSE", "IGCSE", "Business Basics", [
    "Types of business — sole trader, partnership, corporation",
    "Business objectives & stakeholders",
    "Entrepreneurship & business plan",
    "External environment — PESTLE",
  ]),
  ...mk("Business Management", "IGCSE", "IGCSE", "Marketing", [
    "Market research — primary & secondary",
    "Marketing mix — 4Ps (product, price, place, promotion)",
    "Market segmentation & targeting",
    "Branding & positioning",
  ]),
  ...mk("Business Management", "IGCSE", "IGCSE", "Finance & Accounting", [
    "Sources of finance",
    "Cash flow forecasting",
    "Income statement & balance sheet",
    "Ratio analysis — profitability, liquidity",
    "Break-even analysis",
    "Budgeting",
  ]),
  ...mk("Business Management", "IGCSE", "IGCSE", "Operations & HR", [
    "Production methods — job, batch, flow",
    "Quality management — TQM, QA, QC",
    "Supply chain & inventory",
    "Recruitment & training",
    "Motivation theories — Maslow, Herzberg",
    "Organizational structure",
  ]),
  ...mk("Business Management", "DP", "IB DP", "1 — Business Organisation and Environment", [
    "Introduction to business and management — role, sectors, entrepreneurship",
    "Types of organisations — sole trader, partnership, private/public limited companies, social enterprises",
    "Organisational objectives — mission, vision, SMART objectives, CSR",
    "Stakeholders — internal vs external, stakeholder conflict",
    "External environment — STEEPLE analysis",
    "Growth and evolution — internal/external growth, mergers, economies of scale",
    "Organisational planning tools — decision tree, fishbone diagram, force-field analysis, Gantt chart"
  ]),

  ...mk("Business Management", "DP", "IB DP", "2 — Human Resource Management", [
    "Functions and evolution of HR — workforce planning, recruitment, appraisal",
    "Organisational structure — tall/flat, centralised/decentralised, matrix",
    "Leadership and management — autocratic, democratic, laissez-faire, situational",
    "Motivation — Taylor, Maslow, Herzberg, Adams, Pink",
    "Organisational culture — power, role, task, person",
    "Employer and employee relations — trade unions, negotiation, industrial action"
  ]),

  ...mk("Business Management", "DP", "IB DP", "3 — Accounts and Finance", [
    "Sources of finance — internal (retained profit, sale of assets), external (loans, share capital)",
    "Costs and revenues — fixed, variable, semi-variable, direct, indirect",
    "Break-even analysis — calculation, margin of safety, limitations",
    "Final accounts — income statement (P&L), balance sheet",
    "Profitability and liquidity ratio analysis — GPM, NPM, ROCE, current ratio, acid test",
    "Efficiency ratio analysis — stock turnover, debtor days, creditor days (HL)",
    "Cash flow — forecast vs statement, working capital management",
    "Investment appraisal — payback period, ARR, NPV (HL)",
    "Budgeting — variance analysis, flexible vs fixed budgets (HL)"
  ]),

  ...mk("Business Management", "DP", "IB DP", "4 — Marketing", [
    "Role of marketing — market vs product orientation, social marketing",
    "Marketing planning — segmentation, targeting, positioning (STP), USP",
    "Sales forecasting — time series analysis, moving averages (HL)",
    "Market research — primary, secondary, qualitative, quantitative, sampling",
    "The four Ps — Product (product life cycle, BCG matrix), Price, Place, Promotion",
    "Extended marketing mix — People, Process, Physical evidence (7Ps)",
    "International marketing — globalisation vs localisation, entry modes",
    "E-commerce — B2B, B2C, C2C, opportunities and threats"
  ]),

  ...mk("Business Management", "DP", "IB DP", "5 — Operations Management", [
    "Role of operations management — efficiency, quality, sustainability",
    "Production methods — job, batch, mass/flow, mass customisation, cellular",
    "Lean production and quality management — JIT, Kaizen, TQM, QA vs QC",
    "Location — quantitative and qualitative factors, offshoring, reshoring",
    "Production planning — capacity utilisation, stock control",
    "Research and development — innovation, IP protection, patents",
    "Crisis management and contingency planning — risk assessment, business continuity"
  ]),

  // ═══════════════════════════════════════════════════════════════════════════
  // HISTORY, GEOGRAPHY, PSYCHOLOGY — condensed
  // ═══════════════════════════════════════════════════════════════════════════
  ...mk("History", "IGCSE", "IGCSE", "IGCSE History", [
    "World War I — causes & consequences",
    "Treaty of Versailles & League of Nations",
    "World War II — key events",
    "Cold War — origins, crises, détente",
    "Decolonization & independence movements",
    "20th century international relations",
  ]),
  ...mk("History", "DP", "IB DP", "DP History", [
    "Paper 1 — source analysis (Move to Global War, Rights & Protest, etc.)",
    "Paper 2 — world history topics (Authoritarian States, Cold War, Independence)",
    "Paper 3 — regional depth (Asia & Oceania, Europe, Americas)",
    "IA — historical investigation",
  ]),

  ...mk("Geography", "IGCSE", "IGCSE", "IGCSE Geography", [
    "Population — growth, structure, migration",
    "Settlement — urbanisation, land use models",
    "Plate tectonics — earthquakes, volcanoes",
    "Weather & climate — climate zones, tropical storms",
    "Rivers & coasts — erosion, deposition, management",
    "Economic activity — industry, tourism, development",
    "Environmental risks — climate change, resource depletion",
  ]),
  ...mk("Geography", "DP", "IB DP", "1 — Changing Population", [
    "Population and economic development patterns — core and periphery",
    "Changing populations and places — migration, fertility, mortality, aging",
    "Challenges and opportunities — population policies, megacities, gentrification"
  ]),

  ...mk("Geography", "DP", "IB DP", "2 — Global Climate — Vulnerability and Resilience", [
    "Causes of global climate change — enhanced greenhouse effect, albedo, feedback loops",
    "Consequences of global climate change — sea level rise, extreme weather, biome shifts",
    "Responding to global climate change — mitigation vs adaptation, international agreements"
  ]),

  ...mk("Geography", "DP", "IB DP", "3 — Global Resource Consumption and Security", [
    "Global trends in consumption — ecological footprint, water-food-energy nexus",
    "Impacts of changing trends — resource depletion, waste, environmental degradation",
    "Resource stewardship — circular economy, sustainable development, green technology"
  ]),

  ...mk("Psychology", "DP", "IB DP", "DP Psychology", [
    "Biological approach — brain, neurotransmitters, hormones",
    "Cognitive approach — memory, thinking, bias",
    "Sociocultural approach — conformity, culture, identity",
    "Research methods — experiments, interviews, ethics",
    "Abnormal psychology — depression, anxiety, treatment",
    "IA — experimental study replication",
  ]),

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPUTER SCIENCE
  // ═══════════════════════════════════════════════════════════════════════════
  ...mk("Computer Science", "IGCSE", "IGCSE", "Theory", [
    "Number systems — binary, hex, denary",
    "Data storage — bits, bytes, compression",
    "Logic gates & truth tables",
    "CPU — fetch-decode-execute cycle",
    "Memory — RAM, ROM, cache",
    "Input & output devices",
    "Networks — LAN, WAN, topologies, protocols",
    "Cyber security — threats & prevention",
  ]),
  ...mk("Computer Science", "IGCSE", "IGCSE", "Programming", [
    "Algorithms — sequence, selection, iteration",
    "Pseudocode & flowcharts",
    "Data types & variables",
    "Arrays & lists",
    "Functions & procedures",
    "File handling",
    "Debugging & testing",
  ]),
  ...mk("Computer Science", "DP", "IB DP", "DP Computer Science", [
    "System fundamentals — hardware, software, OS",
    "Computer organization — CPU architecture, cache, memory",
    "Networks — OSI/TCP-IP, protocols, security",
    "Computational thinking — recursion, searching, sorting",
    "Abstract data structures — stacks, queues, trees, graphs",
    "OOP — classes, inheritance, polymorphism",
    "Databases — SQL, normalization",
    "IA — programming solution",
  ]),

  // ═══════════════════════════════════════════════════════════════════════════
  // ADDITIONAL SUBJECTS
  // ═══════════════════════════════════════════════════════════════════════════
  ...mk("Theory of Knowledge", "DP", "IB DP", "TOK", [
    "Knowledge & the knower — personal vs shared knowledge",
    "Ways of knowing (WOK) — reason, emotion, language, faith, memory",
    "Areas of knowledge (AOK) — natural sciences, history, ethics, arts",
    "TOK exhibition — objects & IA prompt",
    "TOK essay — prescribed titles, argument & counterclaim",
  ]),
  ...mk("TOK", "DP", "IB DP", "TOK", [
    "Exhibition — tiga objek & justifikasi",
    "Essay — struktur, klaim, counterclaim",
    "Core theme — knowledge & technology",
  ]),
  ...mk("Extended Essay", "DP", "IB DP", "EE", [
    "Research question — pemilihan & refinement",
    "Literature review & sumber",
    "Methodology & analisis",
    "Struktur & format EE",
    "Refleksi — RPPF & viva voce",
  ]),
  ...mk("CAS", "DP", "IB DP", "CAS", [
    "CAS project — planning & goals",
    "Reflection — learning outcomes",
    "Portfolio — evidence & documentation",
  ]),
  ...mk("ESS", "DP", "IB DP", "1 — Systems and Models", [
    "Components of systems — inputs, outputs, storages, flows",
    "Types of systems — open, closed, isolated",
    "Energy within systems — laws of thermodynamics"
  ]),

  ...mk("ESS", "DP", "IB DP", "2 — Systems in the Natural World", [
    "Flows of energy and matter — solar energy, carbon cycle, nitrogen cycle",
    "Biomes — classification, distribution, climate links",
    "Ecosystems — zonation, succession (primary and secondary)",
    "Species — definitions, biotic interactions",
    "Population changes — J-curve, S-curve, carrying capacity",
    "Biodiversity — natural changes, human impacts"
  ]),

  ...mk("ESS", "DP", "IB DP", "3 — Investigating Ecosystems", [
    "General data collection rules — sampling, quadrats, transects",
    "Measuring abiotic factors — temperature, light, pH, soil moisture",
    "Measuring biotic factors — species richness, percentage cover",
    "Collecting and identifying organisms — keys, classification",
    "Species abundance — Lincoln index (capture-mark-recapture)",
    "Species diversity — Simpson diversity index",
    "Productivity and biomass — GPP, NPP, biomass pyramids"
  ]),

  ...mk("ESS", "DP", "IB DP", "4 — Systems in the Human World", [
    "Human population dynamics — Demographic Transition Model, population pyramids",
    "Human resource use — renewable vs non-renewable, carrying capacity",
    "Pollution — point vs non-point source, solid domestic waste management"
  ]),

  ...mk("ESS", "DP", "IB DP", "5 — Humans and Their Effect on the Biotic World", [
    "Value of biodiversity — ecological, economic, ethical, aesthetic",
    "Conservation of biodiversity — in-situ vs ex-situ, protected areas, CITES"
  ]),

  ...mk("ESS", "DP", "IB DP", "6 — Water, Soil and Food Production", [
    "Water — hydrological cycle, aquatic food production, fisheries",
    "Soil — formation, degradation, conservation",
    "Terrestrial food production — agroecosystems, food miles",
    "Management strategies — sustainable agriculture, aquaculture"
  ]),

  ...mk("ESS", "DP", "IB DP", "7 — Energy and the Atmosphere", [
    "Atmosphere — ozone depletion, photochemical smog, acid deposition",
    "Energy production — fossil fuels, nuclear, renewables",
    "Energy choice and security — energy density, EROI, geopolitics"
  ]),

  ...mk("ESS", "DP", "IB DP", "8 — Climate Change and Sustainability", [
    "Climate change — enhanced greenhouse effect, feedback loops, impacts",
    "Sustainability — environmental value systems (ecocentric, anthropocentric, technocentric)",
    "Environmental indicators — ecological footprint, biocapacity",
    "Environmental Impact Assessments (EIA)"
  ]),
  ...mk("Environmental Systems & Societies", "DP", "IB DP", "1 — Systems and Models", [
    "Components of systems",
    "Types of systems — open, closed, isolated",
    "Energy within systems"
  ]),

  ...mk("Environmental Systems & Societies", "DP", "IB DP", "2 — Systems in the Natural World", [
    "Flows of energy and matter — carbon/nitrogen cycles",
    "Biomes and ecosystems — zonation, succession",
    "Species and populations",
    "Biodiversity"
  ]),

  ...mk("Environmental Systems & Societies", "DP", "IB DP", "3 — Investigating Ecosystems", [
    "Data collection — quadrats, transects",
    "Abiotic and biotic factors",
    "Species abundance — Lincoln index, Simpson index",
    "Productivity — GPP, NPP"
  ]),

  ...mk("Environmental Systems & Societies", "DP", "IB DP", "4 — Systems in the Human World", [
    "Human population dynamics — DTM, population pyramids",
    "Resource use and pollution — solid waste"
  ]),

  ...mk("Environmental Systems & Societies", "DP", "IB DP", "5 — Biodiversity Conservation", [
    "Value of biodiversity",
    "Conservation — in-situ, ex-situ, CITES"
  ]),

  ...mk("Environmental Systems & Societies", "DP", "IB DP", "6 — Water, Soil and Food", [
    "Water and aquatic food production",
    "Soil — degradation and conservation",
    "Terrestrial food production — sustainability"
  ]),

  ...mk("Environmental Systems & Societies", "DP", "IB DP", "7 — Energy and Atmosphere", [
    "Atmosphere — ozone, smog, acid deposition",
    "Energy production and security"
  ]),

  ...mk("Environmental Systems & Societies", "DP", "IB DP", "8 — Climate Change and Sustainability", [
    "Climate change — greenhouse effect, impacts",
    "Sustainability — EVS, ecological footprint, EIA"
  ]),

  // ═══════════════════════════════════════════════════════════════════════════
  // LANGUAGE & LITERATURE
  // ═══════════════════════════════════════════════════════════════════════════
  ...mk("Bahasa Indonesia", "MYP 3-4", "MYP 3-4 / Grade 8-9", "Membaca & Sastra", [
    "Analisis cerpen — unsur intrinsik & ekstrinsik",
    "Analisis novel — tema, karakter, alur, latar",
    "Analisis puisi — majas, citraan, diksi, rima",
    "Teks eksplanasi — struktur & kaidah kebahasaan",
    "Teks argumentasi & persuasi",
    "Teks laporan & deskripsi",
    "Teks prosedur",
  ]),
  ...mk("Bahasa Indonesia", "MYP 3-4", "MYP 3-4 / Grade 8-9", "Menulis", [
    "Esai argumentatif — struktur & pengembangan argumen",
    "Karya ilmiah — rumusan masalah, metodologi, pembahasan",
    "Surat resmi & tidak resmi",
    "Cerita pendek — penulisan kreatif",
    "Pidato & teks presentasi",
  ]),
  ...mk("Bahasa Indonesia", "MYP 3-4", "MYP 3-4 / Grade 8-9", "Tata Bahasa", [
    "Kata baku & PUEBI",
    "Kalimat efektif — konjungsi & kohesi",
    "Paragraf — koherensi & pengembangan",
    "Jenis kalimat — tunggal, majemuk",
    "Diksi & gaya bahasa",
  ]),
  ...mk("English", "IGCSE", "IGCSE", "Reading & Literature", [
    "Literary devices — metaphor, simile, symbolism, irony",
    "Poetry analysis — form, imagery, tone, theme",
    "Prose analysis — narrative voice, structure, character",
    "Drama — theatrical techniques, dialogue, stagecraft",
  ]),
  ...mk("English", "IGCSE", "IGCSE", "Writing", [
    "Narrative writing — plot, setting, character",
    "Descriptive writing — sensory details, mood",
    "Argumentative writing — thesis, evidence, counter-argument",
    "Summary writing — paraphrase & concision",
    "Report & article writing",
  ]),
  ...mk("English", "IGCSE", "IGCSE", "Language Skills", [
    "Grammar — tenses, conditionals, modals",
    "Passive voice & reported speech",
    "Vocabulary — academic word list, collocations",
    "Punctuation & sentence variety",
  ]),

  // ═══════════════════════════════════════════════════════════════════════════
  // KURIKULUM NASIONAL — SMP (Matematika, Fisika, Kimia, Biologi)
  // ═══════════════════════════════════════════════════════════════════════════
  ...mk("Matematika", "SMP 7", "Kelas 7 (SMP)", "Bilangan", [
    "Bilangan bulat & operasi hitung",
    "Bilangan pecahan, desimal, persen",
    "Perbandingan senilai & berbalik nilai",
    "Skala pada peta & denah",
    "Aritmetika sosial — untung, rugi, bunga, diskon",
  ]),
  ...mk("Matematika", "SMP 7", "Kelas 7 (SMP)", "Himpunan & Aljabar", [
    "Himpunan — notasi, operasi, diagram Venn",
    "Bentuk aljabar & operasinya",
    "Persamaan linear satu variabel (PLSV)",
    "Pertidaksamaan linear satu variabel",
  ]),
  ...mk("Matematika", "SMP 7", "Kelas 7 (SMP)", "Geometri & Data", [
    "Garis, sudut, dan hubungan antar sudut",
    "Segitiga & segiempat — sifat, keliling, luas",
    "Penyajian data — tabel, diagram batang/garis/lingkaran",
    "Ukuran pemusatan — mean, median, modus",
  ]),
  ...mk("Matematika", "SMP 8", "Kelas 8 (SMP)", "Aljabar & Fungsi", [
    "Relasi & fungsi — domain, kodomain, range",
    "Persamaan garis lurus & gradien",
    "Sistem persamaan linear dua variabel (SPLDV)",
    "Faktorisasi bentuk aljabar",
  ]),
  ...mk("Matematika", "SMP 8", "Kelas 8 (SMP)", "Geometri", [
    "Teorema Pythagoras & penerapannya",
    "Lingkaran — unsur, keliling, luas, sudut pusat & keliling",
    "Bangun ruang sisi datar — kubus, balok, prisma, limas",
    "Garis singgung lingkaran",
  ]),
  ...mk("Matematika", "SMP 8", "Kelas 8 (SMP)", "Statistika & Peluang", [
    "Penyajian data kelompok",
    "Peluang empirik & teoretik",
    "Ruang sampel & titik sampel",
  ]),
  ...mk("Matematika", "SMP 9", "Kelas 9 (SMP)", "Bilangan & Aljabar", [
    "Bilangan berpangkat & bentuk akar",
    "Persamaan kuadrat — pemfaktoran, rumus abc",
    "Fungsi kuadrat — grafik, titik puncak, diskriminan",
  ]),
  ...mk("Matematika", "SMP 9", "Kelas 9 (SMP)", "Transformasi & Geometri", [
    "Transformasi — translasi, refleksi, rotasi, dilatasi",
    "Kesebangunan & kekongruenan",
    "Bangun ruang sisi lengkung — tabung, kerucut, bola",
  ]),
  ...mk("Matematika", "SMP 9", "Kelas 9 (SMP)", "Statistika & Peluang", [
    "Statistika lanjut — kuartil, jangkauan",
    "Peluang kejadian majemuk",
  ]),

  ...mk("Fisika", "SMP 7", "Kelas 7 (SMP)", "Besaran & Zat", [
    "Besaran pokok & turunan, satuan SI",
    "Pengukuran — jangka sorong, mikrometer",
    "Suhu & pemuaian — termometer, kalibrasi",
    "Wujud zat & perubahan wujud",
  ]),
  ...mk("Fisika", "SMP 7", "Kelas 7 (SMP)", "Kalor & Gerak", [
    "Kalor — kalor jenis, kapasitas kalor, perpindahan kalor",
    "Asas Black & perubahan wujud",
    "Gerak lurus — kelajuan, kecepatan, percepatan",
    "Gerak lurus beraturan (GLB) & GLBB",
  ]),
  ...mk("Fisika", "SMP 8", "Kelas 8 (SMP)", "Gaya & Energi", [
    "Gaya & resultan gaya",
    "Hukum Newton I, II, III",
    "Usaha & energi — kinetik, potensial",
    "Daya",
    "Pesawat sederhana — tuas, katrol, bidang miring",
  ]),
  ...mk("Fisika", "SMP 8", "Kelas 8 (SMP)", "Tekanan & Gelombang", [
    "Tekanan zat padat, cair (Hukum Pascal & Archimedes), gas",
    "Getaran & gelombang — frekuensi, periode, cepat rambat",
    "Bunyi — resonansi, gema, ultrasonik",
    "Cahaya & alat optik — cermin, lensa, mata",
  ]),
  ...mk("Fisika", "SMP 9", "Kelas 9 (SMP)", "Listrik & Magnet", [
    "Listrik statis — muatan, Hukum Coulomb",
    "Listrik dinamis — Hukum Ohm, rangkaian seri & paralel",
    "Energi & daya listrik",
    "Kemagnetan — medan magnet, elektromagnet, induksi",
  ]),
  ...mk("Fisika", "SMP 9", "Kelas 9 (SMP)", "Tata Surya", [
    "Tata surya — planet, satelit, gerhana",
    "Rotasi & revolusi bumi",
  ]),

  ...mk("Kimia", "SMP 7", "Kelas 7 (SMP)", "Zat & Perubahan", [
    "Klasifikasi materi — unsur, senyawa, campuran",
    "Pemisahan campuran — filtrasi, distilasi, kromatografi",
    "Perubahan fisika & kimia",
    "Sifat asam, basa, garam & indikator",
  ]),
  ...mk("Kimia", "SMP 8", "Kelas 8 (SMP)", "Partikel Materi", [
    "Atom, molekul, ion",
    "Teori atom dasar",
    "Partikel penyusun materi — proton, neutron, elektron",
    "Zat aditif & adiktif",
  ]),
  ...mk("Kimia", "SMP 9", "Kelas 9 (SMP)", "Reaksi & Larutan", [
    "Reaksi kimia sederhana — ciri & persamaan reaksi",
    "Hukum kekekalan massa (Lavoisier)",
    "Larutan asam-basa & pH",
    "Korosi & pencegahannya",
  ]),

  ...mk("Biologi", "SMP 7", "Kelas 7 (SMP)", "Makhluk Hidup & Lingkungan", [
    "Ciri-ciri makhluk hidup",
    "Klasifikasi makhluk hidup — 5 kingdom",
    "Ekosistem — komponen biotik & abiotik",
    "Rantai makanan & jaring-jaring makanan",
    "Interaksi antar makhluk hidup",
  ]),
  ...mk("Biologi", "SMP 8", "Kelas 8 (SMP)", "Sistem Tubuh Manusia", [
    "Sistem gerak — rangka, otot, sendi",
    "Sistem pencernaan & enzim",
    "Sistem pernapasan",
    "Sistem peredaran darah",
    "Sistem ekskresi",
  ]),
  ...mk("Biologi", "SMP 9", "Kelas 9 (SMP)", "Reproduksi & Pewarisan Sifat", [
    "Sistem reproduksi manusia",
    "Pewarisan sifat — gen, kromosom, Hukum Mendel",
    "Persilangan monohibrid & dihibrid",
    "Bioteknologi — konvensional & modern",
    "Kelangsungan hidup & adaptasi",
  ]),

  // ═══════════════════════════════════════════════════════════════════════════
  // KURIKULUM NASIONAL — SMA MIPA (Matematika, Fisika, Kimia, Biologi)
  // ═══════════════════════════════════════════════════════════════════════════
  ...mk("Matematika", "SMA 10", "Kelas 10 (SMA)", "Aljabar & Fungsi", [
    "Eksponen & logaritma — sifat, persamaan, pertidaksamaan",
    "Persamaan & pertidaksamaan nilai mutlak",
    "Sistem persamaan linear tiga variabel (SPLTV)",
    "Sistem pertidaksamaan dua variabel",
    "Fungsi — komposisi & invers",
  ]),
  ...mk("Matematika", "SMA 10", "Kelas 10 (SMA)", "Trigonometri & Vektor", [
    "Perbandingan trigonometri — sin, cos, tan",
    "Sudut istimewa & kuadran",
    "Aturan sinus & cosinus",
    "Vektor — operasi, proyeksi, sudut antar vektor",
  ]),
  ...mk("Matematika", "SMA 10", "Kelas 10 (SMA)", "Barisan & Deret", [
    "Barisan & deret aritmetika",
    "Barisan & deret geometri",
    "Deret geometri tak hingga",
    "Notasi sigma",
  ]),
  ...mk("Matematika", "SMA 11", "Kelas 11 (SMA)", "Aljabar Lanjut", [
    "Program linear — model matematika & nilai optimum",
    "Matriks — operasi, determinan, invers",
    "Transformasi geometri & komposisinya",
    "Polinomial — teorema sisa & faktor",
    "Lingkaran — persamaan & garis singgung",
  ]),
  ...mk("Matematika", "SMA 11", "Kelas 11 (SMA)", "Kalkulus", [
    "Limit fungsi aljabar & trigonometri",
    "Turunan — aturan, aplikasi (maks/min, laju)",
    "Gradien & garis singgung kurva",
    "Integral tak tentu",
    "Integral tentu & luas daerah",
  ]),
  ...mk("Matematika", "SMA 12", "Kelas 12 (SMA)", "Statistika & Peluang", [
    "Statistika — mean, median, modus, kuartil, simpangan baku",
    "Kaidah pencacahan — aturan perkalian, permutasi, kombinasi",
    "Peluang kejadian — tunggal & majemuk",
    "Peluang bersyarat & kejadian saling bebas",
    "Dimensi tiga — jarak titik, garis, bidang",
  ]),

  ...mk("Fisika", "SMA 10", "Kelas 10 (SMA)", "Mekanika", [
    "Besaran, satuan & angka penting",
    "Vektor & resultan gaya",
    "Gerak lurus (GLB & GLBB) & gerak parabola",
    "Hukum Newton & penerapan",
    "Usaha, energi & daya",
    "Momentum, impuls & tumbukan",
    "Gerak melingkar beraturan",
    "Hukum gravitasi Newton",
  ]),
  ...mk("Fisika", "SMA 11", "Kelas 11 (SMA)", "Fluida & Termodinamika", [
    "Elastisitas & Hukum Hooke",
    "Fluida statis — tekanan hidrostatis, Pascal, Archimedes",
    "Fluida dinamis — debit, kontinuitas, Bernoulli",
    "Suhu, kalor & perpindahan kalor",
    "Termodinamika — hukum ke-0/1/2, mesin Carnot",
  ]),
  ...mk("Fisika", "SMA 11", "Kelas 11 (SMA)", "Gelombang & Optik", [
    "Getaran harmonik sederhana",
    "Gelombang mekanik — transversal & longitudinal",
    "Bunyi — cepat rambat, efek Doppler",
    "Gelombang cahaya — interferensi, difraksi, polarisasi",
    "Alat optik — mata, lup, mikroskop, teleskop",
  ]),
  ...mk("Fisika", "SMA 12", "Kelas 12 (SMA)", "Listrik & Magnet", [
    "Listrik statis — Hukum Coulomb, medan & potensial listrik",
    "Kapasitor",
    "Listrik dinamis — Hukum Ohm, Kirchhoff, rangkaian",
    "Medan magnet & gaya Lorentz",
    "Induksi elektromagnetik & Hukum Faraday",
    "Arus bolak-balik (AC) — rangkaian RLC",
  ]),
  ...mk("Fisika", "SMA 12", "Kelas 12 (SMA)", "Fisika Modern", [
    "Relativitas khusus",
    "Radiasi benda hitam & efek fotolistrik",
    "Fisika inti & radioaktivitas",
    "Sumber energi & reaktor",
  ]),

  ...mk("Kimia", "SMA 10", "Kelas 10 (SMA)", "Struktur Atom & Ikatan", [
    "Struktur atom & konfigurasi elektron",
    "Sistem periodik unsur",
    "Ikatan kimia — ion, kovalen, logam",
    "Bentuk molekul & kepolaran",
    "Stoikiometri — mol, massa, volume, pereaksi pembatas",
  ]),
  ...mk("Kimia", "SMA 10", "Kelas 10 (SMA)", "Larutan & Redoks", [
    "Larutan elektrolit & non-elektrolit",
    "Konsep reaksi redoks & bilangan oksidasi",
    "Tata nama senyawa",
    "Persamaan reaksi & penyetaraan",
  ]),
  ...mk("Kimia", "SMA 11", "Kelas 11 (SMA)", "Termokimia & Kinetika", [
    "Termokimia — entalpi, Hukum Hess, kalorimeter",
    "Laju reaksi & faktor yang memengaruhi",
    "Kesetimbangan kimia & tetapan Kc/Kp",
    "Pergeseran kesetimbangan (Le Chatelier)",
  ]),
  ...mk("Kimia", "SMA 11", "Kelas 11 (SMA)", "Asam-Basa & Kesetimbangan", [
    "Teori asam-basa (Arrhenius, Bronsted-Lowry, Lewis)",
    "pH larutan & perhitungannya",
    "Hidrolisis garam",
    "Larutan penyangga (buffer)",
    "Titrasi asam-basa",
    "Kelarutan & hasil kali kelarutan (Ksp)",
  ]),
  ...mk("Kimia", "SMA 12", "Kelas 12 (SMA)", "Sifat Koligatif & Unsur", [
    "Sifat koligatif larutan — penurunan tekanan uap, kenaikan titik didih, penurunan titik beku, tekanan osmotik",
    "Kimia unsur — golongan utama & transisi",
    "Senyawa karbon & gugus fungsi",
    "Reaksi senyawa karbon",
    "Makromolekul — polimer, karbohidrat, protein, lemak",
  ]),

  ...mk("Biologi", "SMA 10", "Kelas 10 (SMA)", "Keanekaragaman Hayati", [
    "Keanekaragaman hayati & klasifikasi",
    "Virus — struktur, replikasi, peran",
    "Bakteri & archaebacteria",
    "Jamur (fungi) — ciri & peran",
    "Plantae — lumut, paku, tumbuhan berbiji",
    "Animalia — invertebrata & vertebrata",
  ]),
  ...mk("Biologi", "SMA 10", "Kelas 10 (SMA)", "Ekologi", [
    "Ekosistem & aliran energi",
    "Daur biogeokimia",
    "Populasi & komunitas",
    "Perubahan lingkungan & pencemaran",
  ]),
  ...mk("Biologi", "SMA 11", "Kelas 11 (SMA)", "Sel & Jaringan", [
    "Struktur & fungsi sel",
    "Transport membran — difusi, osmosis, transpor aktif",
    "Jaringan tumbuhan & hewan",
    "Sistem gerak — rangka & otot",
    "Sistem sirkulasi — jantung, darah, pembuluh",
  ]),
  ...mk("Biologi", "SMA 11", "Kelas 11 (SMA)", "Sistem Organ", [
    "Sistem pencernaan",
    "Sistem pernapasan",
    "Sistem ekskresi — ginjal, kulit, paru, hati",
    "Sistem koordinasi — saraf, hormon, indra",
    "Sistem reproduksi",
    "Sistem imun",
  ]),
  ...mk("Biologi", "SMA 12", "Kelas 12 (SMA)", "Metabolisme & Genetika", [
    "Pertumbuhan & perkembangan tumbuhan",
    "Enzim & metabolisme",
    "Fotosintesis & respirasi sel",
    "Materi genetik — DNA, RNA, sintesis protein",
    "Pembelahan sel — mitosis & meiosis",
    "Hukum Mendel & persilangan",
  ]),
  ...mk("Biologi", "SMA 12", "Kelas 12 (SMA)", "Evolusi & Bioteknologi", [
    "Teori evolusi & bukti-bukti",
    "Seleksi alam & spesiasi",
    "Bioteknologi — rekayasa genetika, kloning",
    "Dampak bioteknologi",
  ]),

  // ═══════════════════════════════════════════════════════════════════════════
  // KURIKULUM NASIONAL — SMA IPS & BAHASA
  // ═══════════════════════════════════════════════════════════════════════════
  ...mk("Ekonomi", "SMA 10", "Kelas 10 (SMA)", "Dasar Ekonomi", [
    "Konsep dasar ilmu ekonomi — kelangkaan, pilihan, biaya peluang",
    "Masalah pokok ekonomi & sistem ekonomi",
    "Pelaku ekonomi — rumah tangga, perusahaan, pemerintah",
    "Permintaan, penawaran & keseimbangan pasar",
    "Elastisitas permintaan & penawaran",
    "Pasar & struktur pasar",
  ]),
  ...mk("Ekonomi", "SMA 11", "Kelas 11 (SMA)", "Makroekonomi", [
    "Pendapatan nasional — PDB, PNB, metode perhitungan",
    "Pertumbuhan & pembangunan ekonomi",
    "Inflasi — jenis, sebab, dampak",
    "Kebijakan fiskal & moneter",
    "APBN & APBD",
    "Perpajakan",
    "Kerja sama ekonomi internasional & perdagangan internasional",
  ]),
  ...mk("Ekonomi", "SMA 12", "Kelas 12 (SMA)", "Badan Usaha & Manajemen", [
    "BUMN, BUMD, BUMS & koperasi",
    "Manajemen — fungsi & bidang",
    "Pasar modal — saham, obligasi, reksa dana",
    "Akuntansi dasar sebagai alat pengambilan keputusan",
  ]),

  ...mk("Akuntansi", "SMA 11", "Kelas 11 (SMA)", "Siklus Akuntansi", [
    "Persamaan dasar akuntansi",
    "Transaksi & bukti transaksi",
    "Jurnal umum",
    "Buku besar & neraca saldo",
    "Jurnal penyesuaian",
    "Neraca lajur (worksheet)",
  ]),
  ...mk("Akuntansi", "SMA 12", "Kelas 12 (SMA)", "Laporan Keuangan", [
    "Laporan laba rugi",
    "Laporan perubahan modal/ekuitas",
    "Neraca (posisi keuangan)",
    "Jurnal penutup & penutupan buku",
    "Akuntansi perusahaan dagang — jurnal khusus",
    "Persediaan — FIFO, LIFO, rata-rata",
  ]),

  ...mk("Sejarah", "SMA 10", "Kelas 10 (SMA)", "Sejarah Indonesia", [
    "Konsep berpikir sejarah — kronologis, diakronik, sinkronik",
    "Masa pra-aksara & masuknya Hindu-Buddha",
    "Kerajaan Islam di Nusantara",
    "Kolonialisme & imperialisme Eropa",
    "Historiografi Indonesia",
  ]),
  ...mk("Sejarah", "SMA 11", "Kelas 11 (SMA)", "Pergerakan & Kemerdekaan", [
    "Pergerakan nasional Indonesia",
    "Pendudukan Jepang",
    "Proklamasi kemerdekaan",
    "Revolusi mempertahankan kemerdekaan",
    "Konferensi Meja Bundar",
  ]),
  ...mk("Sejarah", "SMA 12", "Kelas 12 (SMA)", "Indonesia Modern & Dunia", [
    "Demokrasi liberal & terpimpin",
    "Orde Baru — pembangunan & krisis",
    "Reformasi 1998",
    "Perang Dunia I & II",
    "Perang Dingin",
    "Dekolonisasi Asia-Afrika & Gerakan Non-Blok",
  ]),

  ...mk("Geografi", "SMA 10", "Kelas 10 (SMA)", "Dasar Geografi", [
    "Hakikat, ruang lingkup & prinsip geografi",
    "Peta, proyeksi, skala & interpretasi",
    "Penginderaan jauh & SIG",
    "Litosfer — tenaga endogen & eksogen",
    "Atmosfer — cuaca & iklim",
    "Hidrosfer — siklus air, sungai, danau",
  ]),
  ...mk("Geografi", "SMA 11", "Kelas 11 (SMA)", "Lingkungan & SDA", [
    "Biosfer — persebaran flora & fauna",
    "Antroposfer — dinamika penduduk",
    "Sumber daya alam & pengelolaannya",
    "Lingkungan hidup & pembangunan berkelanjutan",
    "Mitigasi bencana alam",
  ]),
  ...mk("Geografi", "SMA 12", "Kelas 12 (SMA)", "Kewilayahan", [
    "Pola keruangan desa & kota",
    "Interaksi desa-kota",
    "Wilayah & pewilayahan",
    "Negara maju & berkembang",
    "Pusat pertumbuhan & pengembangan wilayah",
  ]),

  ...mk("Sosiologi", "SMA 10", "Kelas 10 (SMA)", "Interaksi & Sosialisasi", [
    "Fungsi & peran sosiologi",
    "Interaksi sosial — syarat & bentuk",
    "Sosialisasi & pembentukan kepribadian",
    "Nilai & norma sosial",
    "Perilaku menyimpang",
    "Lembaga sosial",
  ]),
  ...mk("Sosiologi", "SMA 11", "Kelas 11 (SMA)", "Struktur & Konflik", [
    "Struktur sosial & diferensiasi",
    "Stratifikasi sosial",
    "Mobilitas sosial",
    "Konflik sosial & integrasi",
    "Kelompok sosial & dinamikanya",
  ]),
  ...mk("Sosiologi", "SMA 12", "Kelas 12 (SMA)", "Perubahan Sosial", [
    "Perubahan sosial & modernisasi",
    "Globalisasi & dampaknya",
    "Ketimpangan sosial",
    "Kearifan lokal & pemberdayaan komunitas",
    "Evaluasi pemberdayaan",
  ]),

  ...mk("Bahasa Indonesia", "SMA 10", "Kelas 10 (SMA)", "Teks & Struktur", [
    "Teks laporan hasil observasi",
    "Teks eksposisi",
    "Teks anekdot",
    "Teks negosiasi",
    "Teks biografi",
    "Puisi — diksi, majas, imaji",
  ]),
  ...mk("Bahasa Indonesia", "SMA 11", "Kelas 11 (SMA)", "Teks Akademik & Sastra", [
    "Teks prosedur",
    "Teks eksplanasi",
    "Teks ceramah",
    "Teks cerpen — unsur intrinsik & ekstrinsik",
    "Teks proposal",
    "Teks drama",
  ]),
  ...mk("Bahasa Indonesia", "SMA 12", "Kelas 12 (SMA)", "Opini & Surat", [
    "Teks editorial",
    "Teks artikel opini",
    "Teks kritik & esai",
    "Teks novel — analisis unsur",
    "Surat lamaran pekerjaan",
    "Debat — argumen & tata cara",
  ]),

  ...mk("Bahasa Inggris", "SMA 10", "Kelas 10 (SMA)", "Genre Text Dasar", [
    "Narrative text — legend, fable, fairy tale",
    "Descriptive text",
    "Recount text",
    "Procedure text",
    "Report text",
    "Simple present, past, future tense",
  ]),
  ...mk("Bahasa Inggris", "SMA 11", "Kelas 11 (SMA)", "Exposition & Letter", [
    "Analytical exposition",
    "Hortatory exposition",
    "Explanation text",
    "Personal & formal letter",
    "Passive voice & reported speech",
    "Conditional sentences",
  ]),
  ...mk("Bahasa Inggris", "SMA 12", "Kelas 12 (SMA)", "Discussion & Application", [
    "News item",
    "Discussion text",
    "Review text",
    "Application letter & CV",
    "Caption text",
    "Conjunction & sentence connectors",
  ]),

  // ═══════════════════════════════════════════════════════════════════════════
  // PENGUATAN MYP/DP — Sciences MYP 2 & 5, DP Humanities & Languages
  // ═══════════════════════════════════════════════════════════════════════════
  ...mk("Sciences", "MYP 2", "MYP 2 / Grade 7", "Biology & Chemistry Foundations", [
    "Sel & organel dasar",
    "Klasifikasi makhluk hidup sederhana",
    "Reproduksi tumbuhan & hewan",
    "Zat, campuran & pemisahan",
    "Atom, unsur & senyawa",
    "Reaksi kimia sederhana",
  ]),
  ...mk("Sciences", "MYP 2", "MYP 2 / Grade 7", "Physics Foundations", [
    "Gaya & gerak",
    "Energi — bentuk & transfer",
    "Kelistrikan dasar — rangkaian sederhana",
    "Magnet & elektromagnet",
    "Bunyi & cahaya",
  ]),
  ...mk("Sciences", "MYP 5", "MYP 5 / Grade 10", "Biology & Chemistry", [
    "Genetika dasar — DNA & pewarisan sifat",
    "Evolusi & seleksi alam",
    "Ekosistem & daur materi",
    "Ikatan kimia & stoikiometri dasar",
    "Asam-basa & reaksi redoks",
  ]),
  ...mk("Sciences", "MYP 5", "MYP 5 / Grade 10", "Physics", [
    "Kinematika — GLB, GLBB, parabola",
    "Hukum Newton & momentum",
    "Energi, usaha & daya",
    "Gelombang & bunyi",
    "Listrik & rangkaian",
  ]),

  ...mk("History", "DP", "IB DP", "Prescribed Subjects & World History", [
    "Military leaders — perang & strategi",
    "Conquest & its impact",
    "Rights & protest movements",
    "Conflict & intervention",
    "Perang Dunia I — sebab & dampak",
    "Perang Dunia II & Perang Dingin",
    "Dekolonisasi & kemerdekaan Asia-Afrika",
    "Revolusi industri & sosial",
    "Totalitarian regimes",
  ]),
  ...mk("Geography", "DP", "IB DP", "Core Themes", [
    "Populasi & distribusi penduduk",
    "Climate change & kerentanan",
    "Sumber daya & konsumsi global",
    "Globalisasi & interaksi spasial",
    "Urbanisasi & megakota",
    "Pembangunan berkelanjutan",
    "Mitigasi & adaptasi bencana",
    "Food security & pertanian",
  ]),
  ...mk("Psychology", "DP", "IB DP", "Core Approaches", [
    "Biological approach — otak & perilaku",
    "Cognitive approach — memori & berpikir",
    "Sociocultural approach — budaya & kelompok",
    "Research methods — eksperimen, studi kasus, korelasi",
    "Ethics in psychological research",
    "Abnormal psychology — gangguan & terapi",
    "Developmental psychology",
  ]),
  ...mk("English A", "DP", "IB DP", "Language & Literature", [
    "Textual analysis — prose, poetry, drama",
    "Comparative essay structure",
    "Literary devices — imagery, symbolism, tone",
    "Paper 1 guided analysis",
    "Paper 2 comparative study",
    "Individual Oral (IO) — global issue & extract",
    "Higher Level Essay (HLE)",
  ]),
  ...mk("English B", "DP", "IB DP", "Language Acquisition", [
    "Reading comprehension — text types",
    "Writing — blog, letter, article, speech",
    "Listening — audio & video comprehension",
    "Speaking — individual oral & interaction",
    "Theme: identities, experiences, human ingenuity",
    "Theme: social organization, sharing the planet",
  ]),
  ...mk("French B", "DP", "IB DP", "Language Acquisition", [
    "Compréhension écrite & orale",
    "Production écrite — formats variés",
    "Individual oral & interaction",
    "Grammaire — temps, subjonctif, pronoms",
  ]),
  ...mk("Spanish B", "DP", "IB DP", "Language Acquisition", [
    "Comprensión de lectura & auditiva",
    "Expresión escrita — formatos variados",
    "Oral individual & interacción",
    "Gramática — tiempos, subjuntivo, pronombres",
  ]),
  ...mk("Mandarin B", "DP", "IB DP", "Language Acquisition", [
    "阅读理解 & 听力理解",
    "写作 — 书信、日记、短文",
    "口语 — 个人口头与互动",
    "语法 — 量词、句型、时态标记",
  ]),
  ...mk("Bahasa Indonesia B", "DP", "IB DP", "Language Acquisition", [
    "Pemahaman bacaan & mendengarkan",
    "Menulis — surat, blog, artikel, pidato",
    "Individual oral & interaksi",
    "Tata bahasa — afiksasi, kalimat efektif, ejaan",
  ]),

  // ═══════════════════════════════════════════════════════════════════════════
  // AP (College Board)
  // ═══════════════════════════════════════════════════════════════════════════
  ...mk("AP Calculus AB", "AP", "AP", "Differential & Integral Calculus", [
    "Limits & continuity",
    "Derivatives — rules & applications",
    "Related rates & optimization",
    "Integrals — definite & indefinite",
    "Fundamental Theorem of Calculus",
    "Applications of integration — area & volume",
  ]),
  ...mk("AP Calculus BC", "AP", "AP", "Calculus BC", [
    "Parametric & polar calculus",
    "Series — convergence & Taylor/Maclaurin",
    "Integration techniques — parts, partial fractions",
    "Improper integrals",
    "Vector-valued functions & motion",
  ]),
  ...mk("AP Statistics", "AP", "AP", "Statistics", [
    "Exploratory data analysis — distributions & graphs",
    "Sampling & experimental design",
    "Probability & random variables",
    "Sampling distributions & CLT",
    "Confidence intervals",
    "Hypothesis testing — significance tests",
  ]),
  ...mk("AP Biology", "AP", "AP", "Biology", [
    "Chemistry of life & macromolecules",
    "Cell structure & function",
    "Cellular energetics — respiration & photosynthesis",
    "Cell communication & cycle",
    "Heredity & gene expression",
    "Natural selection & ecology",
  ]),
  ...mk("AP Chemistry", "AP", "AP", "Chemistry", [
    "Atomic structure & periodicity",
    "Chemical bonding & molecular geometry",
    "Stoichiometry & reactions",
    "Kinetics & equilibrium",
    "Thermodynamics & electrochemistry",
    "Acids, bases & buffers",
  ]),
  ...mk("AP Physics 1", "AP", "AP", "Algebra-Based Physics", [
    "Kinematics & dynamics",
    "Work, energy & power",
    "Momentum & impulse",
    "Circular motion & gravitation",
    "Simple harmonic motion",
    "Torque & rotational motion",
    "Fluids & waves",
  ]),
  ...mk("AP Physics C: Mechanics", "AP", "AP", "Mechanics", [
    "Kinematics with calculus",
    "Newton's laws & friction",
    "Work, energy & power",
    "Systems of particles & momentum",
    "Rotation — torque & angular momentum",
    "Oscillations & gravitation",
  ]),
  ...mk("AP Microeconomics", "AP", "AP", "Microeconomics", [
    "Supply, demand & elasticity",
    "Consumer & producer surplus",
    "Perfect competition & monopoly",
    "Monopolistic competition & oligopoly",
    "Factor markets & externalities",
    "Government intervention",
  ]),
  ...mk("AP Macroeconomics", "AP", "AP", "Macroeconomics", [
    "GDP, unemployment & inflation",
    "Aggregate demand & supply",
    "Fiscal & monetary policy",
    "Money, banking & financial sector",
    "Economic growth & international trade",
  ]),
  ...mk("AP World History: Modern", "AP", "AP", "World History", [
    "Global tapestry 1200–1450",
    "Networks of exchange 1450–1750",
    "Land-based & maritime empires",
    "Revolutions 1750–1900",
    "Global conflicts 1900–present",
    "Decolonization & globalization",
  ]),
  ...mk("AP US History", "AP", "AP", "US History", [
    "Colonial America & revolution",
    "Constitution & early republic",
    "Civil War & reconstruction",
    "Industrialization & progressive era",
    "Great Depression & New Deal",
    "Cold War & civil rights",
    "Contemporary America",
  ]),
  ...mk("AP Psychology", "AP", "AP", "Psychology", [
    "Research methods & statistics",
    "Biological bases of behavior",
    "Sensation & perception",
    "Learning & memory",
    "Cognition & intelligence",
    "Development, personality & disorders",
  ]),
  ...mk("AP English Language & Composition", "AP", "AP", "Rhetoric & Composition", [
    "Rhetorical analysis — appeals, tone, diction",
    "Argument essay — claim, evidence, reasoning",
    "Synthesis essay — sources & citations",
    "Multiple choice — reading comprehension",
    "Style, grammar & sentence variety",
  ]),
  ...mk("AP Computer Science A", "AP", "AP", "Java Programming", [
    "Primitive types & objects",
    "Control flow & iteration",
    "Arrays & ArrayLists",
    "Methods & recursion",
    "Inheritance & polymorphism",
    "Searching & sorting algorithms",
  ]),

  // ═══════════════════════════════════════════════════════════════════════════
  // CAMBRIDGE O LEVEL
  // ═══════════════════════════════════════════════════════════════════════════
  ...mk("Mathematics (4024)", "O Level", "O Level", "Mathematics D", [
    "Number, ratio & proportion",
    "Algebra & equations",
    "Functions & graphs",
    "Geometry & mensuration",
    "Trigonometry",
    "Statistics & probability",
  ]),
  ...mk("Additional Mathematics (4037)", "O Level", "O Level", "Additional Mathematics", [
    "Quadratics & polynomials",
    "Indices, surds & logarithms",
    "Binomial expansion",
    "Trigonometric identities & equations",
    "Differentiation & integration",
    "Vectors & kinematics",
  ]),
  ...mk("Biology (5090)", "O Level", "O Level", "Biology", [
    "Cell structure & organisation",
    "Biological molecules & enzymes",
    "Movement in & out of cells",
    "Plant nutrition & transport",
    "Human nutrition & systems",
    "Reproduction, heredity & ecology",
  ]),
  ...mk("Chemistry (5070)", "O Level", "O Level", "Chemistry", [
    "States of matter & atomic structure",
    "Chemical bonding & formulas",
    "Stoichiometry & the mole",
    "Acids, bases & salts",
    "Metals & electrochemistry",
    "Organic chemistry basics",
  ]),
  ...mk("Physics (5054)", "O Level", "O Level", "Physics", [
    "Measurement & motion",
    "Forces, work & energy",
    "Thermal physics & states of matter",
    "Waves & light",
    "Electricity & magnetism",
    "Atomic physics & radioactivity",
  ]),
  ...mk("Economics (2281)", "O Level", "O Level", "Economics", [
    "Basic economic problem & factors of production",
    "Price mechanism — demand & supply",
    "Market structures & elasticity",
    "Money, banking & inflation",
    "Government & the economy",
    "International trade & development",
  ]),
  ...mk("English Language (1123)", "O Level", "O Level", "English Language", [
    "Directed writing — letters, reports, speeches",
    "Narrative & descriptive writing",
    "Reading comprehension",
    "Summary writing",
    "Grammar, punctuation & vocabulary",
  ]),

  // ═══════════════════════════════════════════════════════════════════════════
  // CAMBRIDGE A / AS LEVEL
  // ═══════════════════════════════════════════════════════════════════════════
  ...mk("Mathematics (9709)", "A Level", "A Level", "Pure Mathematics", [
    "Quadratics, functions & transformations",
    "Coordinate geometry & circles",
    "Trigonometry & identities",
    "Sequences & series",
    "Differentiation & integration",
    "Differential equations basics",
    "Vectors & complex numbers",
  ]),
  ...mk("Mathematics (9709)", "A Level", "A Level", "Statistics & Mechanics", [
    "Probability & distributions",
    "Normal & binomial distribution",
    "Hypothesis testing",
    "Kinematics in one & two dimensions",
    "Forces & Newton's laws",
    "Moments & equilibrium",
  ]),
  ...mk("Further Mathematics (9231)", "A Level", "A Level", "Further Pure", [
    "Complex numbers & polar form",
    "Matrices & linear transformations",
    "Hyperbolic functions",
    "Further calculus & series",
    "Polar coordinates & conics",
  ]),
  ...mk("Biology (9700)", "A Level", "A Level", "Biology", [
    "Cell structure & microscopy",
    "Biological molecules & enzymes",
    "Cell membranes & transport",
    "Cell division & genetics",
    "Energy & respiration / photosynthesis",
    "Homeostasis, coordination & ecology",
  ]),
  ...mk("Chemistry (9701)", "A Level", "A Level", "Chemistry", [
    "Atomic structure & bonding",
    "Energetics & kinetics",
    "Equilibria & acids-bases",
    "Electrochemistry & transition metals",
    "Organic chemistry & mechanisms",
    "Spectroscopy & analysis",
  ]),
  ...mk("Physics (9702)", "A Level", "A Level", "Physics", [
    "Physical quantities & kinematics",
    "Dynamics & forces",
    "Work, energy & circular motion",
    "Oscillations & waves",
    "Electricity & capacitance",
    "Magnetic fields & induction",
    "Quantum & nuclear physics",
  ]),
  ...mk("Economics (9708)", "A Level", "A Level", "Economics", [
    "Scarcity, choice & opportunity cost",
    "Price system & market failure",
    "Government intervention",
    "Macroeconomic objectives & policies",
    "International trade & exchange rates",
    "Economic development",
  ]),
  ...mk("Psychology (9990)", "A Level", "A Level", "Psychology", [
    "Research methods & experimental design",
    "Biological, cognitive & learning approaches",
    "Social approach — conformity & obedience",
    "Clinical & abnormal psychology",
    "Issues, debates & ethics",
  ]),
  ...mk("Computer Science (9618)", "A Level", "A Level", "Computer Science", [
    "Data representation & number systems",
    "Processors, memory & logic circuits",
    "Programming — data structures & algorithms",
    "Networks & the internet",
    "Databases & SQL",
    "Object-oriented programming",
  ]),
];

// ─── Canonical subject name map ────────────────────────────────────────────

const SUBJECT_ALIASES: Record<string, string[]> = {
  "mathematics":        ["Mathematics", "Math", "Matematika", "Math AA HL", "Math AA SL", "Math AI HL", "Math AI SL"],
  "math":               ["Mathematics", "Math", "Matematika"],
  "maths":              ["Mathematics", "Math", "Matematika"],
  "matematika":         ["Matematika", "Mathematics", "Math"],
  "math aa hl":         ["Math AA HL", "Mathematics"],
  "math aa sl":         ["Math AA SL", "Mathematics"],
  "math ai hl":         ["Math AI HL", "Mathematics"],
  "math ai sl":         ["Math AI SL", "Mathematics"],
  "biology":            ["Biology", "Biologi", "Sciences"],
  "biologi":            ["Biologi", "Biology"],
  "chemistry":          ["Chemistry", "Kimia", "Sciences"],
  "kimia":              ["Kimia", "Chemistry"],
  "physics":            ["Physics", "Fisika", "Sciences"],
  "fisika":             ["Fisika", "Physics"],
  "sciences":           ["Sciences", "Biology", "Chemistry", "Physics"],
  "science":            ["Sciences", "Biology", "Chemistry", "Physics"],
  "economics":          ["Economics", "Ekonomi"],
  "ekonomi":            ["Ekonomi", "Economics"],
  "business":           ["Business Management", "Business"],
  "business management":["Business Management", "Business"],
  "history":            ["History", "Sejarah"],
  "sejarah":            ["Sejarah", "History"],
  "geography":          ["Geography", "Geografi"],
  "geografi":           ["Geografi", "Geography"],
  "computer science":   ["Computer Science", "Informatika"],
  "cs":                 ["Computer Science", "Informatika"],
  "informatika":        ["Informatika", "Computer Science"],
  "english":            ["English", "English A", "English B"],
  "english a":          ["English A", "English"],
  "english b":          ["English B", "English"],
  "bahasa indonesia":   ["Bahasa Indonesia"],
  "bahasa inggris":     ["Bahasa Inggris", "English"],
  "akuntansi":          ["Akuntansi", "Accounting"],
  "accounting":         ["Accounting", "Akuntansi"],
  "sosiologi":          ["Sosiologi", "Sociology"],
  "sociology":          ["Sociology", "Sosiologi"],
  "ipa":                ["IPA", "Sciences", "Fisika", "Kimia", "Biologi"],
  "ips":                ["IPS", "Ekonomi", "Sejarah", "Geografi", "Sosiologi"],
  "sastra indonesia":   ["Sastra Indonesia", "Bahasa Indonesia"],
  "sastra inggris":     ["Sastra Inggris", "English Literature"],
  "psychology":         ["Psychology"],
  "tok":                ["Theory of Knowledge", "TOK"],
  "theory of knowledge":["Theory of Knowledge", "TOK"],
  "extended essay":     ["Extended Essay"],
  "ee":                 ["Extended Essay"],
  "ess":                ["Environmental Systems & Societies", "ESS"],
  "environmental systems & societies": ["Environmental Systems & Societies", "ESS"],
  "cas":                ["CAS"],
};

export function resolveSubjectAliases(subject: string): string[] {
  const key = subject.toLowerCase().trim();
  return SUBJECT_ALIASES[key] ?? [subject];
}

// ─── Search function ────────────────────────────────────────────────────────

export function searchTopics(
  query: string,
  opts: { subject?: string; grade?: string; curriculum?: string } = {},
): TopicEntry[] {
  if (!query || query.length < 1) return [];
  const q = query.trim().toLowerCase();

  const allowedSubjects = opts.subject
    ? new Set(resolveSubjectAliases(opts.subject).map(s => s.toLowerCase()))
    : null;

  const sfWords = opts.subject
    ? opts.subject.toLowerCase().split(/[\s,&-]+/).filter(w => w.length > 2)
    : [];

  const target = targetLevelFor(opts.curriculum, opts.grade);
  const levelOk = curriculumLevelFilter(opts.curriculum);

  // Family prefix untuk bonus "satu kurikulum, beda kelas" (mis. SMA 10 vs SMA 11).
  const familyOf = (level: string): string => {
    const l = level.toLowerCase();
    if (l.startsWith("myp")) return "myp";
    if (l.startsWith("smp")) return "smp";
    if (l.startsWith("sma")) return "sma";
    if (l === "dp") return "dp";
    if (l === "igcse") return "igcse";
    if (l === "ap") return "ap";
    if (l.startsWith("a level")) return "a level";
    if (l.startsWith("o level")) return "o level";
    return l;
  };

  const scored = IB_TOPICS.map((t) => {
    const tLow = t.topic.toLowerCase();
    const uLow = t.unit.toLowerCase();
    const sLow = t.subject.toLowerCase();
    const aLow = (t.aliases ?? "").toLowerCase();
    const lLow = t.level.toLowerCase();

    // Content match
    const topicScore   = tLow.includes(q) ? 15 : 0;
    const unitScore    = uLow.includes(q) ? 8  : 0;
    const aliasScore   = aLow.includes(q) ? 5  : 0;
    const subjInQuery  = sLow.includes(q) ? 3  : 0;
    const contentScore = topicScore + unitScore + aliasScore + subjInQuery;
    if (contentScore === 0) return { entry: t, score: 0 };

    // Subject relevance bonus
    let subjectBonus = 0;
    if (allowedSubjects) {
      if (allowedSubjects.has(sLow)) {
        subjectBonus = 25;
      } else if (sfWords.some(w => sLow.includes(w))) {
        subjectBonus = 12;
      }
    }

    // Grade-level relevance bonus — prioritize student's grade
    let gradeBonus = 0;
    if (target) {
      const targetLow = target.toLowerCase();
      if (lLow === targetLow) {
        gradeBonus = 30; // exact grade match
      } else if (familyOf(lLow) === familyOf(targetLow)) {
        gradeBonus = 8;  // same curriculum family, different grade
      }
    }

    return { entry: t, score: contentScore + subjectBonus + gradeBonus };
  })
  .filter(x => x.score > 0);

  // Hard-filter kurikulum; kalau kosong, fallback ke semua hasil agar search tetap berguna.
  const byCurriculum = levelOk ? scored.filter(x => levelOk(x.entry.level)) : scored;
  const final = byCurriculum.length > 0 ? byCurriculum : scored;

  return final
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
    .map(x => x.entry);
}

// ─── Topic browser (grade-filtered chip groups) ─────────────────────────────

export interface TopicGroup { unit: string; topics: TopicEntry[]; }

export function browseTopicsForSubjects(
  subjects: string[],
  studentLevel?: string,
  curriculum?: string,
  maxGroups = 8,
): TopicGroup[] {
  if (subjects.length === 0) return [];

  const resolvedSubjects = new Set<string>();
  for (const s of subjects) {
    for (const alias of resolveSubjectAliases(s)) {
      resolvedSubjects.add(alias.toLowerCase());
    }
  }

  const target = targetLevelFor(curriculum, studentLevel);
  const levelOk = curriculumLevelFilter(curriculum);

  const scored = IB_TOPICS
    .filter((t) => resolvedSubjects.has(t.subject.toLowerCase()))
    .filter((t) => (levelOk ? levelOk(t.level) : true))
    .map((t) => {
      let score = 1;
      // If student has a known grade, prioritize grade-matched topics
      if (target) {
        const lLow = t.level.toLowerCase();
        if (lLow === target.toLowerCase()) {
          score = 20;
        } else if (
          lLow.includes("myp") || lLow.includes("dp") || lLow.includes("igcse") ||
          lLow.includes("smp") || lLow.includes("sma") || lLow.includes("ap") ||
          lLow.includes("a level") || lLow.includes("o level")
        ) {
          score = 3;  // still show, but deprioritized
        }
      }
      return { entry: t, score };
    });

  const unitMap = new Map<string, { total: number; topics: TopicEntry[] }>();
  for (const { entry, score } of scored) {
    // Build a composite key: unit + grade label to separate same unit names across grades
    const key = `${entry.gradeLabel} › ${entry.unit}`;
    const g = unitMap.get(key) ?? { total: 0, topics: [] };
    g.total += score;
    g.topics.push(entry);
    unitMap.set(key, g);
  }

  return Array.from(unitMap.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, maxGroups)
    .map(([unit, { topics }]) => ({ unit, topics }));
}

// ─── Grade helpers ──────────────────────────────────────────────────────────

export function getStudentGradeLabel(studentLevel?: string): string | null {
  const level = inferMypLevel(studentLevel);
  return level ? gradeLabelFromLevel(level) : null;
}

export function getStudentMypLevel(studentLevel?: string): string | null {
  return inferMypLevel(studentLevel);
}
