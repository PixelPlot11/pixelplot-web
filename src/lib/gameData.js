// src/lib/gameData.js

export const CROPS = {
  wheat:      { id:0, name:"Wheat",      emoji:"🌾", unlockLevel:1, seedCost:5,  sellPrice:15,  growTime:10,  eP:5,  eW:3,  eH:3,  exp:8,   color:"#c8a800", stages:["🌱","🌿","🌾"] },
  carrot:     { id:1, name:"Carrot",     emoji:"🥕", unlockLevel:1, seedCost:8,  sellPrice:25,  growTime:18,  eP:8,  eW:5,  eH:5,  exp:15,  color:"#e06020", stages:["🌱","🌿","🥕"] },
  corn:       { id:2, name:"Corn",       emoji:"🌽", unlockLevel:2, seedCost:12, sellPrice:45,  growTime:30,  eP:12, eW:8,  eH:8,  exp:28,  color:"#e0b800", stages:["🌱","🌿","🌽"] },
  tomato:     { id:3, name:"Tomato",     emoji:"🍅", unlockLevel:3, seedCost:10, sellPrice:38,  growTime:25,  eP:10, eW:7,  eH:7,  exp:22,  color:"#d83040", stages:["🌱","🌿","🍅"] },
  pumpkin:    { id:4, name:"Pumpkin",    emoji:"🎃", unlockLevel:4, seedCost:20, sellPrice:75,  growTime:50,  eP:20, eW:14, eH:14, exp:50,  color:"#d86820", stages:["🌱","🌿","🎃"] },
  strawberry: { id:5, name:"Strawberry", emoji:"🍓", unlockLevel:5, seedCost:25, sellPrice:90,  growTime:60,  eP:25, eW:18, eH:18, exp:65,  color:"#e03050", stages:["🌱","🌿","🍓"] },
  blueberry:  { id:6, name:"Blueberry",  emoji:"🫐", unlockLevel:7, seedCost:40, sellPrice:150, growTime:90,  eP:40, eW:28, eH:28, exp:110, color:"#5060d0", stages:["🌱","🌿","🫐"] },
  goldenroot: { id:7, name:"GoldenRoot", emoji:"✨", unlockLevel:9, seedCost:80, sellPrice:300, growTime:180, eP:80, eW:55, eH:55, exp:250, color:"#f0c030", stages:["🌱","🌿","✨"] },
};

export const LEVELS = [
  { level:1,  expReq:0,    plots:4,  title:"Seedling",     bonus:"Starter crops unlocked" },
  { level:2,  expReq:50,   plots:5,  title:"Sprout",       bonus:"Corn unlocked" },
  { level:3,  expReq:150,  plots:6,  title:"Grower",       bonus:"Tomato unlocked" },
  { level:4,  expReq:320,  plots:7,  title:"Cultivator",   bonus:"Pumpkin unlocked" },
  { level:5,  expReq:600,  plots:8,  title:"Farmer",       bonus:"Strawberry unlocked" },
  { level:6,  expReq:1000, plots:9,  title:"Harvester",    bonus:"+10% sell bonus" },
  { level:7,  expReq:1600, plots:10, title:"Agronomist",   bonus:"Blueberry unlocked" },
  { level:8,  expReq:2400, plots:11, title:"Landmaster",   bonus:"+20% sell bonus" },
  { level:9,  expReq:3500, plots:12, title:"Arcane Farmer",bonus:"GoldenRoot unlocked" },
  { level:10, expReq:5000, plots:12, title:"Legend",       bonus:"+35% sell bonus & max plots" },
];

export const MAX_ENERGY    = 1000;
export const REGEN_PER_SEC = MAX_ENERGY / (12 * 60 * 60);
export const GRID_SIZE     = 12;
export const PRESET_AVATARS = ["🧑‍🌾","👨‍🌾","👩‍🌾","🧙","🧝","🧚","🐲","🦊","🐺","🌻","🍄","⚡"];

export function getLevelData(exp) {
  let cur = LEVELS[0], next = LEVELS[1];
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (exp >= LEVELS[i].expReq) {
      cur  = LEVELS[i];
      next = LEVELS[i + 1] || null;
      break;
    }
  }
  return { cur, next };
}

export function getSellBonus(level) {
  if (level >= 10) return 1.35;
  if (level >= 8)  return 1.20;
  if (level >= 6)  return 1.10;
  return 1.0;
}

export function shortAddr(addr) {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "";
}

export function mkPlot() {
  return { crop: null, progress: 0, ready: false, watered: false };
}

export function mkGrid() {
  return Array(GRID_SIZE).fill(null).map(mkPlot);
}
