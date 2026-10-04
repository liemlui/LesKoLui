# 04 — Template Engine

Principle: **Report = Data × Theme × Layout.** Data fills automatically; a Theme sets the visual feel (colors, fonts, decorations); a Layout sets the arrangement. 20 themes × 5 layouts = 100 visual combinations.

Files: `template/types.ts`, `template/themes.ts`, `template/layouts.tsx`, `template/deco.tsx`, `template/paginate.ts`, `template/ReportRenderer.tsx`.

## `template/types.ts`

```ts
export type HeaderStyle = "bubble" | "script" | "plain";
export type LabelStyle  = "pill" | "rounded" | "flag";
export type PhotoStyle  = "round" | "circle" | "polaroid";
export type DecoKind    = "snow" | "leaf" | "petal" | "sparkle" | "star" | "wave" | "sun" | "none";

export interface Theme {
  id: string;
  name: string;
  bg: string;                 // CSS color or gradient for the page
  ink: string;                // main text color
  muted: string;              // secondary text
  accent: string;             // main accent (header stroke/label fallback)
  palette: string[];          // rotating colors across entries (>= 4)
  fontDisplay: string;        // CSS font-family for headings
  fontBody: string;           // CSS font-family for body
  header: HeaderStyle;
  label: LabelStyle;
  photo: PhotoStyle;
  deco: DecoKind;
  headerText: string;         // e.g. "ABSENSI" | "ABSEN" | "Absensi"
}

export interface ReportEntry {
  date: string;               // display, e.g. "5 Mei"
  subject: string;
  photoUrl?: string;          // objectURL of the session photo
  narrative: string;          // polished text (AI or tutor-edited)
}

export interface ReportData {
  studentName: string;
  period: string;             // e.g. "Mei 2026"
  tutorName: string;
  logoUrl?: string;
  entries: ReportEntry[];
  summary: string;            // "Absensi" summary
  teacherNote?: string;
  quote?: string;
}

export interface Layout {
  id: string;
  name: string;
  maxEntriesPerPage: number;  // used by pagination
  render: (page: ReportData, theme: Theme, opts: { isFirst: boolean; isLast: boolean }) => JSX.Element;
}
```

`ReportData.logoUrl` and `ReportData.tutorName` are rendered by the shared `LogoEl` helper in `template/layouts.tsx`. It places the tutor name and optional logo at the top-right of the first-page header, before the themed report title.

## `template/themes.ts` — all 20 themes

Fonts are CSS family names matching the `@fontsource` imports in `main.tsx`. Each theme is one object.

```ts
import { Theme } from "./types";

const F = {
  fredoka: "'Fredoka', sans-serif",
  baloo: "'Baloo 2', sans-serif",
  pacifico: "'Pacifico', cursive",
  poppins: "'Poppins', sans-serif",
  nunito: "'Nunito', sans-serif",
  quicksand: "'Quicksand', sans-serif",
  comfortaa: "'Comfortaa', sans-serif",
  caveat: "'Caveat', cursive",
};

export const THEMES: Theme[] = [
  { id:"winter",   name:"Winter Blue",     bg:"linear-gradient(175deg,#d7eefb,#c3e2f7)", ink:"#2b4a68", muted:"#5e7a99", accent:"#3f7fd0", palette:["#4f9d4f","#e0892f","#d9605f","#7a74c4"], fontDisplay:F.fredoka, fontBody:F.nunito, header:"bubble", label:"rounded", photo:"round", deco:"snow", headerText:"ABSENSI" },
  { id:"navy",     name:"Navy Gold",       bg:"linear-gradient(180deg,#1d3a5d,#15314f)", ink:"#e8f0f8", muted:"#9bb4cc", accent:"#e7b24a", palette:["#e7b24a","#d9a23c","#e7b24a","#d9a23c"], fontDisplay:F.pacifico, fontBody:F.poppins, header:"script", label:"flag", photo:"round", deco:"sparkle", headerText:"ABSEN" },
  { id:"tropis",   name:"Tropis",          bg:"linear-gradient(175deg,#cfeafa,#bfe6e0)", ink:"#1f5a55", muted:"#4e857f", accent:"#2f9488", palette:["#2f9488","#e0892f","#3f7fd0","#d9605f"], fontDisplay:F.baloo, fontBody:F.nunito, header:"bubble", label:"pill", photo:"circle", deco:"leaf", headerText:"ABSENSI" },
  { id:"sakura",   name:"Sakura Pastel",   bg:"linear-gradient(175deg,#ffe4ef,#ffd0e2)", ink:"#7a3a55", muted:"#a8718a", accent:"#e86a93", palette:["#e86a93","#e0892f","#7a74c4","#3f9488"], fontDisplay:F.fredoka, fontBody:F.nunito, header:"script", label:"pill", photo:"circle", deco:"petal", headerText:"ABSENSI" },
  { id:"clean",    name:"Clean White",     bg:"#ffffff", ink:"#2c3e50", muted:"#7b8a99", accent:"#2c3e50", palette:["#f4b942","#f48fb1","#9b7ede","#5aa9e6"], fontDisplay:F.poppins, fontBody:F.nunito, header:"plain", label:"pill", photo:"polaroid", deco:"none", headerText:"Absensi" },
  { id:"atoms",    name:"Atoms Science",   bg:"linear-gradient(175deg,#e3f0fb,#d6e6f5)", ink:"#274b6b", muted:"#5a7a99", accent:"#4d7fd0", palette:["#4d7fd0","#e26d6d","#54b08a","#e0a83c"], fontDisplay:F.baloo, fontBody:F.nunito, header:"bubble", label:"rounded", photo:"round", deco:"sparkle", headerText:"ABSENSI" },
  { id:"sunset",   name:"Sunset Warm",     bg:"linear-gradient(175deg,#ffe1c4,#ffc9c9)", ink:"#7a3f44", muted:"#a87178", accent:"#e8743f", palette:["#e8743f","#e8a23f","#d95f8a","#9b6ec4"], fontDisplay:F.fredoka, fontBody:F.nunito, header:"bubble", label:"pill", photo:"circle", deco:"sun", headerText:"ABSENSI" },
  { id:"forest",   name:"Forest Green",    bg:"linear-gradient(175deg,#dff0d8,#cfe8c6)", ink:"#2f5a30", muted:"#5e8560", accent:"#3f8f3f", palette:["#3f8f3f","#a8862f","#cf7a3f","#5fa8a0"], fontDisplay:F.baloo, fontBody:F.nunito, header:"bubble", label:"rounded", photo:"round", deco:"leaf", headerText:"ABSENSI" },
  { id:"ocean",    name:"Ocean Teal",      bg:"linear-gradient(175deg,#cdeef0,#b9e4ec)", ink:"#1f5560", muted:"#4e8590", accent:"#2f8e9e", palette:["#2f8e9e","#3f7fd0","#54b08a","#e0892f"], fontDisplay:F.quicksand, fontBody:F.nunito, header:"bubble", label:"pill", photo:"circle", deco:"wave", headerText:"ABSENSI" },
  { id:"lavender", name:"Lavender Dream",  bg:"linear-gradient(175deg,#ede4fb,#e0d2f5)", ink:"#4f3a6b", muted:"#7a6899", accent:"#7a5fd0", palette:["#7a5fd0","#e0892f","#d9605f","#3f9488"], fontDisplay:F.fredoka, fontBody:F.nunito, header:"script", label:"pill", photo:"circle", deco:"star", headerText:"ABSENSI" },
  { id:"slate",    name:"Mono Slate",      bg:"#f4f6f8", ink:"#2c3e50", muted:"#6b7a89", accent:"#37506b", palette:["#37506b","#5e7488","#8596a6","#aab8c4"], fontDisplay:F.poppins, fontBody:F.poppins, header:"plain", label:"rounded", photo:"round", deco:"none", headerText:"Absensi" },
  { id:"sunshine", name:"Sunshine Yellow", bg:"linear-gradient(175deg,#fff3c4,#ffe79a)", ink:"#7a5f1f", muted:"#a8893c", accent:"#e8a83f", palette:["#e8a83f","#e8743f","#54b08a","#5aa9e6"], fontDisplay:F.baloo, fontBody:F.nunito, header:"bubble", label:"pill", photo:"circle", deco:"sun", headerText:"ABSENSI" },
  { id:"coral",    name:"Coral Reef",      bg:"linear-gradient(175deg,#ffe0d6,#ffccd0)", ink:"#7a3f44", muted:"#a87178", accent:"#e8603f", palette:["#e8603f","#e8a23f","#3f9488","#7a74c4"], fontDisplay:F.fredoka, fontBody:F.nunito, header:"bubble", label:"pill", photo:"circle", deco:"wave", headerText:"ABSENSI" },
  { id:"midnight", name:"Midnight Stars",  bg:"linear-gradient(180deg,#1b2a4a,#162138)", ink:"#e6ecf6", muted:"#92a4c0", accent:"#7aa5e6", palette:["#7aa5e6","#e6c45a","#d97a9a","#7ad0c0"], fontDisplay:F.comfortaa, fontBody:F.poppins, header:"plain", label:"pill", photo:"polaroid", deco:"star", headerText:"Absensi" },
  { id:"kraft",    name:"Kraft Scrapbook", bg:"#e8dcc6", ink:"#5a4a32", muted:"#8a7858", accent:"#b07d3f", palette:["#b07d3f","#7a8a4f","#c46a5a","#5f8a8a"], fontDisplay:F.caveat, fontBody:F.nunito, header:"script", label:"rounded", photo:"polaroid", deco:"none", headerText:"Absensi" },
  { id:"mint",     name:"Mint Fresh",      bg:"linear-gradient(175deg,#d6f3e6,#c6ecdc)", ink:"#1f5a47", muted:"#4e8570", accent:"#2f9470", palette:["#2f9470","#3f7fd0","#e0a83c","#d9605f"], fontDisplay:F.quicksand, fontBody:F.nunito, header:"bubble", label:"pill", photo:"circle", deco:"leaf", headerText:"ABSENSI" },
  { id:"berry",    name:"Berry Bold",      bg:"linear-gradient(175deg,#f6d6ec,#efc0e0)", ink:"#6b2a55", muted:"#995289", accent:"#c43f93", palette:["#c43f93","#e0892f","#5f6ec4","#3f9488"], fontDisplay:F.baloo, fontBody:F.poppins, header:"bubble", label:"flag", photo:"round", deco:"sparkle", headerText:"ABSENSI" },
  { id:"sky",      name:"Sky Balloon",     bg:"linear-gradient(175deg,#d6ecfb,#c6e0f5)", ink:"#2b4a68", muted:"#5e7a99", accent:"#4d9fd0", palette:["#4d9fd0","#e8743f","#54b08a","#d95f8a"], fontDisplay:F.fredoka, fontBody:F.nunito, header:"bubble", label:"pill", photo:"circle", deco:"sun", headerText:"ABSENSI" },
  { id:"autumn",   name:"Autumn Leaves",   bg:"linear-gradient(175deg,#fbe4c4,#f5cda0)", ink:"#6b3f1f", muted:"#996e3c", accent:"#c4742f", palette:["#c4742f","#b0492f","#7a8a3f","#5f8a8a"], fontDisplay:F.baloo, fontBody:F.nunito, header:"bubble", label:"rounded", photo:"round", deco:"leaf", headerText:"ABSENSI" },
  { id:"galaxy",   name:"Galaxy Purple",   bg:"linear-gradient(180deg,#2a1b4a,#1f1638)", ink:"#ece6f6", muted:"#a594c0", accent:"#9a7ae6", palette:["#9a7ae6","#e6a45a","#d97ad0","#7ad0e6"], fontDisplay:F.comfortaa, fontBody:F.poppins, header:"plain", label:"pill", photo:"polaroid", deco:"star", headerText:"Absensi" },
];

export const THEME_IDS = THEMES.map(t => t.id);
export const getTheme = (id: string) => THEMES.find(t => t.id === id) ?? THEMES[0];
```

## `template/deco.tsx`

Map a `DecoKind` to a few positioned decorations (emoji are fine; SVG optional). Keep them `position:absolute; pointer-events:none; z-index:1`.

```tsx
import { DecoKind } from "./types";
const SETS: Record<DecoKind, Array<{c:string; style:React.CSSProperties}>> = {
  snow:   [{c:"❄",style:{top:10,left:14,fontSize:22,opacity:.45,color:"#fff"}},{c:"❄",style:{top:58,right:18,fontSize:14,opacity:.5,color:"#fff"}}],
  leaf:   [{c:"🌿",style:{top:10,left:12,fontSize:24,opacity:.7}},{c:"🍃",style:{top:54,right:14,fontSize:20,opacity:.7}}],
  petal:  [{c:"🌸",style:{top:10,left:12,fontSize:22,opacity:.8}},{c:"🌸",style:{top:60,right:16,fontSize:14,opacity:.7}}],
  sparkle:[{c:"✦",style:{top:90,right:18,fontSize:18,opacity:.6}},{c:"✦",style:{top:140,left:16,fontSize:12,opacity:.5}}],
  star:   [{c:"★",style:{top:14,right:16,fontSize:20,opacity:.55}},{c:"✦",style:{top:70,left:18,fontSize:14,opacity:.5}}],
  wave:   [{c:"〰",style:{bottom:30,left:14,fontSize:22,opacity:.4}}],
  sun:    [{c:"☀",style:{top:12,right:14,fontSize:22,opacity:.5}}],
  none:   [],
};
export function Deco({kind}:{kind:DecoKind}) {
  return <>{SETS[kind].map((d,i)=><span key={i} style={{position:"absolute",pointerEvents:"none",zIndex:1,...d.style}}>{d.c}</span>)}</>;
}
```

> Do NOT copy any third-party stock illustration or mascot from the tutor's existing Canva reports (those may be copyrighted). Use only the original emoji/SVG decorations defined here.

## `template/layouts.tsx` — 5 layouts

Each layout is a function returning JSX for ONE page. Apply theme colors via inline styles / CSS vars on the root. Implement these ids: `cards`, `timeline`, `flags`, `magazine`, `scrapbook`. Skeleton for `cards` (use as the model; others vary the arrangement):

```tsx
function Header(d, theme) {
  const mo = <span style={{display:"inline-block",marginTop:8,fontWeight:800,fontSize:12,
    color:theme.ink,background:"rgba(255,255,255,.78)",borderRadius:999,padding:"4px 13px"}}>{d.period}</span>;
  if (theme.header==="bubble") return (
    <div style={{textAlign:"center",position:"relative",zIndex:2,marginBottom:16}}>
      <div style={{fontFamily:theme.fontDisplay,fontWeight:700,fontSize:42,color:"#fff",
        WebkitTextStroke:`2.5px ${theme.accent}`,lineHeight:.92}}>{theme.headerText}</div>
      <div style={{fontFamily:theme.fontDisplay,fontWeight:700,fontSize:18,color:"#fff",
        background:theme.accent,borderRadius:12,padding:"4px 16px",display:"inline-block",marginTop:8}}>{d.studentName}</div>
      <div>{mo}</div>
    </div>);
  // header==="script": Pacifico/Caveat name in accent; header==="plain": Poppins clean. (implement both)
}

export const cards: Layout = {
  id:"cards", name:"Cards", maxEntriesPerPage:4,
  render:(d,theme,{isFirst,isLast})=>(
    <div style={{background:theme.bg,color:theme.ink,fontFamily:theme.fontBody,
      borderRadius:22,padding:"22px 17px 26px",position:"relative",overflow:"hidden"}}>
      <Deco kind={theme.deco}/>
      {isFirst && Header(d,theme)}
      {d.entries.map((e,i)=>{
        const c=theme.palette[i%theme.palette.length];
        const right = i%2===1;
        return (
          <div key={i} style={{position:"relative",zIndex:2,marginBottom:16}}>
            <Label theme={theme} color={c}>{e.date} — {e.subject}</Label>
            <div style={{display:"grid",gridTemplateColumns:right?"1fr 108px":"108px 1fr",gap:11,marginTop:9}}>
              {right ? (<><Narr theme={theme}>{e.narrative}</Narr><Photo theme={theme} url={e.photoUrl} color={c}/></>)
                     : (<><Photo theme={theme} url={e.photoUrl} color={c}/><Narr theme={theme}>{e.narrative}</Narr></>)}
            </div>
          </div>);
      })}
      {isLast && <Summary d={d} theme={theme}/>}
    </div>)
};
```

Helpers `Label`, `Photo`, `Narr`, `Summary` apply `theme.label`, `theme.photo`, and `theme.palette`. Implement once, reuse across layouts.

- **timeline:** vertical rail (left border) with colored dots from `palette`, `polaroid` photos slightly rotated, pill labels.
- **flags:** flag-shaped labels (CSS `clip-path: polygon(...)`), photos with rounded corners.
- **magazine:** one large photo per entry on top, full-width narrative below; bold display headings.
- **scrapbook:** polaroid photos with small "tape" rectangles, slight random rotation, notes as sticky cards.

```ts
export const LAYOUTS = [cards, timeline, flags, magazine, scrapbook];
export const LAYOUT_IDS = LAYOUTS.map(l => l.id);
export const getLayout = (id:string) => LAYOUTS.find(l=>l.id===id) ?? cards;
```

## `template/paginate.ts`

Split entries into pages so a long month spans multiple pages (like "Page 1 of 2"). Header lives on the first page, summary on the last.

```ts
import { ReportData } from "./types";
export function paginate(data: ReportData, maxPerPage: number): ReportData[] {
  if (data.entries.length === 0) return [data];
  const pages: ReportData[] = [];
  for (let i=0; i<data.entries.length; i+=maxPerPage) {
    pages.push({ ...data, entries: data.entries.slice(i, i+maxPerPage) });
  }
  return pages;
}
```

## `template/ReportRenderer.tsx`

```tsx
import { ReportData, Theme } from "./types";
import { getLayout } from "./layouts";
import { paginate } from "./paginate";

export function ReportRenderer({ data, theme, layoutId }:{ data:ReportData; theme:Theme; layoutId:string }) {
  const layout = getLayout(layoutId);
  const pages = paginate(data, layout.maxEntriesPerPage);
  return (
    <div>
      {pages.map((page,i)=>(
        <div key={i} id={`report-page-${i}`} data-report-page style={{ marginBottom: 18 }}>
          {layout.render(page, theme, { isFirst: i===0, isLast: i===pages.length-1 })}
        </div>
      ))}
    </div>
  );
}
```

Each page gets `data-report-page` so the exporter (`07`) can find and rasterize pages individually.

## Acceptance (Phase 5a/5b/5c)

- A dummy `ReportData` renders in `cards`, `timeline`, `flags` (5a), then all 20 themes look clearly distinct (5b), then 7 entries split into multiple `data-report-page` nodes (5c).
