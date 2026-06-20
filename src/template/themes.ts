import type { Theme } from "./types";

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

export const THEME_IDS = THEMES.map((t) => t.id);
export function getTheme(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
