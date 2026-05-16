// src/lib/gameData.js

export const CROPS = {
  wheat: { id:0, name:"Wheat", emoji:"🌾", unlockLevel:1, seedCost:20000, sellPrice:22000, growTime:15, eP:8, eW:5, eH:5, exp:3, color:"#c8a800", stages:["🌱","🌿","🌾"] },
  carrot: { id:1, name:"Carrot", emoji:"🥕", unlockLevel:1, seedCost:35000, sellPrice:39000, growTime:25, eP:12, eW:8, eH:8, exp:6, color:"#e06020", stages:["🌱","🌿","🥕"] },
  corn: { id:2, name:"Corn", emoji:"🌽", unlockLevel:2, seedCost:60000, sellPrice:67000, growTime:45, eP:18, eW:12, eH:12, exp:14, color:"#e0b800", stages:["🌱","🌿","🌽"] },
  tomato: { id:3, name:"Tomato", emoji:"🍅", unlockLevel:3, seedCost:50000, sellPrice:56000, growTime:35, eP:15, eW:10, eH:10, exp:11, color:"#d83040", stages:["🌱","🌿","🍅"] },
  pumpkin: { id:4, name:"Pumpkin", emoji:"🎃", unlockLevel:4, seedCost:100000, sellPrice:112000, growTime:70, eP:25, eW:18, eH:18, exp:28, color:"#d86820", stages:["🌱","🌿","🎃"] },
  strawberry: { id:5, name:"Strawberry", emoji:"🍓", unlockLevel:5, seedCost:160000, sellPrice:175000, growTime:90, eP:32, eW:22, eH:22, exp:42, color:"#e03050", stages:["🌱","🌿","🍓"] },
  blueberry: { id:6, name:"Blueberry", emoji:"🫐", unlockLevel:7, seedCost:300000, sellPrice:330000, growTime:150, eP:50, eW:35, eH:35, exp:75, color:"#5060d0", stages:["🌱","🌿","🫐"] },
  goldenroot: { id:7, name:"GoldenRoot", emoji:"✨", unlockLevel:9, seedCost:600000, sellPrice:650000, growTime:300, eP:95, eW:65, eH:65, exp:160, color:"#f0c030", stages:["🌱","🌿","✨"] },
};

export const LEVELS = [
  { level:1,  expReq:0,     plots:4,  title:"Seedling",     bonus:"Starter crops unlocked" },
  { level:2,  expReq:120,   plots:5,  title:"Sprout",       bonus:"Corn unlocked + 1 plot" },
  { level:3,  expReq:350,   plots:6,  title:"Grower",       bonus:"Tomato unlocked + 1 plot" },
  { level:4,  expReq:800,   plots:7,  title:"Cultivator",   bonus:"Pumpkin unlocked + 1 plot" },
  { level:5,  expReq:1800,  plots:8,  title:"Farmer",       bonus:"Strawberry unlocked + 1 plot" },
  { level:6,  expReq:3500,  plots:9,  title:"Harvester",    bonus:"+10% sell bonus + 1 plot" },
  { level:7,  expReq:6500,  plots:10, title:"Agronomist",   bonus:"Blueberry unlocked + 1 plot" },
  { level:8,  expReq:11000, plots:11, title:"Landmaster",   bonus:"+20% sell bonus + 1 plot" },
  { level:9,  expReq:18000, plots:12, title:"Arcane Farmer",bonus:"GoldenRoot unlocked + max plots" },
  { level:10, expReq:30000, plots:12, title:"Legend",       bonus:"+35% sell bonus & Legend status" },
];

export const MAX_ENERGY    = 1000;
export const REGEN_PER_SEC = MAX_ENERGY / (12 * 60 * 60);
export const GRID_SIZE     = 20; // up to 12 base plots (Lv9) + 8 extra purchased plots
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