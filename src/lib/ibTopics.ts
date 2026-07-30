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

export function searchTopics(query: string, subject?: string, studentLevel?: string): TopicEntry[] {
  if (!query || query.length < 1) return [];
  const q = query.trim().toLowerCase();

  const allowedSubjects = subject
    ? new Set(resolveSubjectAliases(subject).map(s => s.toLowerCase()))
    : null;

  const sfWords = subject
    ? subject.toLowerCase().split(/[\s,&-]+/).filter(w => w.length > 2)
    : [];

  const studentMyp = inferMypLevel(studentLevel);

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
    if (studentMyp) {
      if (lLow === studentMyp.toLowerCase()) {
        gradeBonus = 30;  // exact grade match
      } else if (studentMyp === "MYP 3-4" && (lLow === "myp 3-4" || lLow === "myp 3" || lLow === "myp 4")) {
        gradeBonus = 30;
      } else if (lLow === "myp 3-4" && (studentMyp === "MYP 3" || studentMyp === "MYP 4")) {
        gradeBonus = 30;
      } else if (lLow.includes("igcse") || lLow.includes("dp")) {
        gradeBonus = 5;   // still relevant but not grade-matched
      }
    }

    return { entry: t, score: contentScore + subjectBonus + gradeBonus };
  })
  .filter(x => x.score > 0)
  .sort((a, b) => b.score - a.score)
  .slice(0, 12);

  return scored.map(x => x.entry);
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

  const studentMyp = inferMypLevel(studentLevel);

  const scored = IB_TOPICS
    .filter((t) => resolvedSubjects.has(t.subject.toLowerCase()))
    .map((t) => {
      let score = 1;
      // If student has a known grade, prioritize grade-matched topics
      if (studentMyp) {
        const lLow = t.level.toLowerCase();
        if (lLow === studentMyp.toLowerCase()) {
          score = 20;
        } else if (studentMyp === "MYP 3-4" && (lLow === "myp 3-4")) {
          score = 20;
        } else if (lLow.includes("igcse") || lLow.includes("dp") || lLow.includes("myp")) {
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
