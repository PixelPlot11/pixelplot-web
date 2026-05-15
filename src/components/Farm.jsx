// src/components/Farm.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import { CROPS, MAX_ENERGY, REGEN_PER_SEC, getLevelData, getSellBonus, mkGrid, mkPlot } from "../lib/gameData";

const ACTIONS = [
  { id:"plant",   icon:"🌱", label:"Plant",   color:"#4caf50" },
  { id:"water",   icon:"💧", label:"Water",   color:"#4a90d9" },
  { id:"harvest", icon:"🌾", label:"Harvest", color:"#f0c060" },
  { id:"remove",  icon:"🗑️", label:"Remove",  color:"#e05050" },
];

// Save/load grid per wallet in localStorage
function saveGrid(walletAddress, grid) {
  try {
    // Convert grid for storage — progress as-is, timestamps for grow calc
    const toSave = grid.map(p => ({
      ...p,
      savedAt: p.crop && !p.ready ? Date.now() : null,
    }));
    localStorage.setItem(`pixelplot_grid_${walletAddress}`, JSON.stringify(toSave));
  } catch {}
}

function loadGrid(walletAddress) {
  try {
    const raw = localStorage.getItem(`pixelplot_grid_${walletAddress}`);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    const now   = Date.now();

    // Re-calculate progress based on elapsed time since save
    return saved.map(p => {
      if (!p.crop) return mkPlot();
      if (p.ready) return { ...p, savedAt: null };

      const c          = CROPS[p.crop];
      if (!c) return mkPlot();

      const elapsed    = p.savedAt ? Math.floor((now - p.savedAt) / 1000) : 0;
      const eff        = p.watered ? c.growTime * 0.7 : c.growTime;
      const newProgress = Math.min((p.progress || 0) + elapsed, eff);
      const ready      = newProgress >= eff;

      return { crop:p.crop, progress:newProgress, ready, watered:p.watered || false, savedAt:null };
    });
  } catch {
    return null;
  }
}

function saveEnergy(walletAddress, energy) {
  try {
    localStorage.setItem(`pixelplot_energy_${walletAddress}`, JSON.stringify({
      value: energy,
      savedAt: Date.now(),
    }));
  } catch {}
}

function loadEnergy(walletAddress) {
  try {
    const raw = localStorage.getItem(`pixelplot_energy_${walletAddress}`);
    if (!raw) return MAX_ENERGY;
    const { value, savedAt } = JSON.parse(raw);
    const elapsed   = Math.floor((Date.now() - savedAt) / 1000);
    const regened   = elapsed * REGEN_PER_SEC;
    return Math.min(MAX_ENERGY, value + regened);
  } catch {
    return MAX_ENERGY;
  }
}

export default function Farm({
  wallet, profile, inventory,
  showToast, addLog, spendSeed, spendSeedOnBackend,
  onHarvest, harvestOffChain, onAfterPlant,
}) {
  const walletAddr = wallet?.address?.toLowerCase() || "";

  // Init grid from localStorage
  const [grid, setGrid]     = useState(() => {
    if (!walletAddr) return mkGrid();
    return loadGrid(walletAddr) || mkGrid();
  });

  // Init energy from localStorage
  const [energy, setEnergy] = useState(() => {
    if (!walletAddr) return MAX_ENERGY;
    return loadEnergy(walletAddr);
  });

  const [action, setAction]             = useState("plant");
  const [planting, setPlanting]           = useState(false); // lock to prevent double-plant
  const [selectedCrop, setSelectedCrop] = useState("wheat");
  const [showPicker, setShowPicker]     = useState(false);
  const energyRef = useRef(energy);
  useEffect(() => { energyRef.current = energy; }, [energy]);

  // When wallet changes, reload saved state for that wallet
  useEffect(() => {
    if (!walletAddr) return;
    const savedGrid   = loadGrid(walletAddr);
    const savedEnergy = loadEnergy(walletAddr);
    setGrid(savedGrid || mkGrid());
    setEnergy(savedEnergy);
  }, [walletAddr]);

  // Persist grid to localStorage whenever it changes
  useEffect(() => {
    if (!walletAddr) return;
    saveGrid(walletAddr, grid);
  }, [grid, walletAddr]);

  // Persist energy every 5 seconds
  useEffect(() => {
    if (!walletAddr) return;
    const iv = setInterval(() => {
      saveEnergy(walletAddr, energyRef.current);
    }, 5000);
    return () => {
      // Save on unmount too
      saveEnergy(walletAddr, energyRef.current);
      clearInterval(iv);
    };
  }, [walletAddr]);

  const exp         = profile?.exp ?? 0;
  const { cur: lv } = getLevelData(exp);
  const level       = lv.level;
  const activePlots = lv.plots;
  const sellBonus   = getSellBonus(level);
  const readyCount  = grid.slice(0, activePlots).filter(p => p.ready).length;
  const energyPct   = (energy / MAX_ENERGY) * 100;
  const energyColor = energyPct > 60 ? "#4caf50" : energyPct > 25 ? "#f0c060" : "#e04040";

  // Energy regen tick
  useEffect(() => {
    const iv = setInterval(() => {
      setEnergy(e => Math.min(MAX_ENERGY, e + REGEN_PER_SEC));
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  // Crop grow tick
  useEffect(() => {
    const iv = setInterval(() => {
      setGrid(prev => prev.map((p, i) => {
        if (i >= activePlots || !p.crop || p.ready) return p;
        const eff = p.watered ? CROPS[p.crop].growTime * 0.7 : CROPS[p.crop].growTime;
        const np  = Math.min(p.progress + 1, eff);
        return { ...p, progress: np, ready: np >= eff };
      }));
    }, 1000);
    return () => clearInterval(iv);
  }, [activePlots]);

  const spendEnergy = useCallback((amt) => {
    if (energyRef.current < amt) return false;
    setEnergy(e => e - amt);
    return true;
  }, []);

  const handlePlot = async (i) => {
    if (!wallet) { showToast("Connect wallet to play!", "#e04040"); return; }
    if (i >= activePlots) { showToast("🔒 Level up to unlock!", "#e04040"); return; }
    const p = grid[i];

    if (action === "plant") {
      if (planting) return; // prevent rapid clicks
      if (p.crop) { showToast("⚠️ Plot occupied!"); return; }
      if ((inventory[selectedCrop] || 0) < 1) { showToast("🛒 No seeds! Buy from Market.", "#e04040"); return; }
      const c = CROPS[selectedCrop];
      if (c.unlockLevel > level) { showToast("🔒 Crop not unlocked!"); return; }
      if (!spendEnergy(c.eP)) { showToast(`⚡ Need ${c.eP} energy!`, "#e04040"); return; }

      // Lock immediately to prevent double-plant
      setPlanting(true);

      // Optimistic: update UI instantly
      spendSeed(selectedCrop);
      setGrid(g => {
        const n = [...g];
        n[i] = { crop:selectedCrop, progress:0, ready:false, watered:false };
        return n;
      });
      addLog(`🌱 Planted ${c.name} [−${c.eP}⚡]`);

      // Sync to backend then unlock
      const ok = await spendSeedOnBackend(selectedCrop);
      if (!ok) {
        // Backend rejected (no seeds) — rollback
        spendSeed(selectedCrop); // this won't work well, so reload
        showToast("❌ Seed sync failed, refreshing...", "#e04040");
        if (onAfterPlant) onAfterPlant(); // reload inventory
      }
      setPlanting(false);
    }
    else if (action === "water") {
      if (!p.crop || p.watered || p.ready) { showToast("⚠️ Can't water here!"); return; }
      const c = CROPS[p.crop];
      if (!spendEnergy(c.eW)) { showToast(`⚡ Need ${c.eW} energy!`, "#e04040"); return; }
      setGrid(g => { const n=[...g]; n[i]={...n[i],watered:true}; return n; });
      addLog(`💧 Watered ${c.name} [−${c.eW}⚡ +30% speed]`);
    }
    else if (action === "harvest") {
      if (!p.crop || !p.ready) { showToast("⏳ Not ready yet!"); return; }
      const c    = CROPS[p.crop];
      const crop = p.crop;
      if (!spendEnergy(c.eH)) { showToast(`⚡ Need ${c.eH} energy!`, "#e04040"); return; }
      // Remove plot immediately (optimistic UI)
      setGrid(g => { const n=[...g]; n[i]=mkPlot(); return n; });
      // Call backend — FREE, no gas, no wallet popup!
      const result = await harvestOffChain(crop);
      if (result) {
        addLog(`🌾 Harvested ${c.name}! +${result.earned} $PLOT +${result.expGain}xp`);
        showToast(`+${result.earned} $PLOT  +${result.expGain} EXP ⚡free`, "#4caf50");
        onHarvest(crop, result.earned, result.expGain, result.pendingEarnings);
      }
    }
    else if (action === "remove") {
      if (!p.crop) return;
      setGrid(g => { const n=[...g]; n[i]=mkPlot(); return n; });
      addLog(`🗑️ Removed plot ${i}`);
    }
  };

  const getPlotDisplay = (p, i) => {
    const locked = i >= activePlots;
    if (locked)  return { emoji:"🔒", bg:"#0d0a06", border:"#1a1206", ratio:0, locked:true };
    if (!p.crop) return { emoji:null, bg:"#1a1206", border:"#2a1e0a", ratio:0 };
    const c     = CROPS[p.crop];
    const eff   = p.watered ? c.growTime * 0.7 : c.growTime;
    const ratio = p.progress / eff;
    const stage = p.ready ? c.stages[2] : ratio > 0.5 ? c.stages[1] : c.stages[0];
    return {
      emoji:  stage,
      bg:     p.ready ? "#1a3d1a" : p.watered ? "#1a2a3d" : "#1e2d10",
      border: p.ready ? "#4caf50" : p.watered ? "#4a90d9" : "#3a5020",
      ratio, ready: p.ready, watered: p.watered,
    };
  };

  const selectedC = CROPS[selectedCrop];

  return (
    <div className="farm-wrap" style={{ display:"flex", flexDirection:"column", gap:"10px" }}>

      {/* Seed picker modal */}
      {showPicker && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", zIndex:50,
          display:"flex", alignItems:"flex-end" }} onClick={() => setShowPicker(false)}>
          <div style={{ width:"100%", background:"#110e07", border:"1px solid #2a1e0a",
            borderRadius:"16px 16px 0 0", padding:"16px 16px 32px" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:"8px", letterSpacing:"3px", color:"#5a4020", marginBottom:"12px" }}>
              SELECT SEED
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:"8px" }}>
              {Object.entries(CROPS).map(([key, c]) => {
                const locked  = c.unlockLevel > level;
                const inStock = (inventory[key] || 0) > 0;
                return (
                  <button key={key}
                    onClick={() => { if (!locked) { setSelectedCrop(key); setShowPicker(false); } }}
                    style={{ padding:"12px", textAlign:"left",
                      background:selectedCrop===key&&!locked?"#2a1f0a":"#0d0a06",
                      border:`1px solid ${selectedCrop===key&&!locked?c.color:inStock?"#2a3a10":"#2a1e0a"}`,
                      borderRadius:"8px", cursor:locked?"default":"pointer",
                      opacity:locked?0.35:1, fontFamily:"inherit" }}>
                    <div style={{ fontSize:"18px", marginBottom:"4px" }}>{locked ? "🔒" : c.emoji}</div>
                    <div style={{ fontSize:"10px", color:locked?"#3a2a10":c.color, fontWeight:700 }}>
                      {c.name}
                    </div>
                    <div style={{ fontSize:"9px", marginTop:"3px",
                      color:inStock?"#4caf50":"#e04040" }}>
                      {locked ? `Lv.${c.unlockLevel}` : inStock ? `${inventory[key]} seeds` : "0 — buy in Market"}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Energy bar */}
      <div style={{ background:"#110e07", border:"1px solid #2a1e0a", borderRadius:"10px", padding:"10px 14px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
          <span style={{ fontSize:"9px", color:energyColor, width:"68px", flexShrink:0 }}>
            ⚡ {Math.floor(energy)}
          </span>
          <div style={{ flex:1, height:"6px", background:"#1a1206", borderRadius:"3px", overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${energyPct}%`,
              background:energyColor, transition:"width 0.5s" }}/>
          </div>
          <span style={{ fontSize:"8px", color:"#3a2a10", flexShrink:0 }}>1000</span>
          {readyCount > 0 && (
            <span style={{ fontSize:"9px", color:"#4caf50", animation:"pulse 1s infinite",
              flexShrink:0, marginLeft:"4px" }}>
              ★ {readyCount} READY
            </span>
          )}
        </div>
      </div>

      {/* Selected seed info */}
      {action === "plant" && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
          background:"#110e07", border:`1px solid ${selectedC.color}40`,
          borderRadius:"10px", padding:"10px 14px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
            <div style={{ fontSize:"22px" }}>{selectedC.emoji}</div>
            <div>
              <div style={{ fontSize:"11px", color:selectedC.color, fontWeight:700 }}>
                {selectedC.name}
              </div>
              <div style={{ fontSize:"9px", marginTop:"2px",
                color:(inventory[selectedCrop]||0)>0?"#4caf50":"#e04040" }}>
                {inventory[selectedCrop]||0} seeds · {selectedC.eP}⚡ per plant
              </div>
            </div>
          </div>
          <button onClick={() => setShowPicker(true)} style={{
            padding:"6px 12px", fontSize:"10px", background:"#2a1f0a",
            border:"1px solid #f0c060", borderRadius:"20px", color:"#f0c060",
            cursor:"pointer", fontFamily:"inherit",
          }}>Change ▾</button>
        </div>
      )}

      {/* Farm grid */}
      <div style={{ background:"#110e07", border:"1px solid #2a1e0a", borderRadius:"10px", padding:"12px" }}>
        <div style={{ fontSize:"8px", letterSpacing:"3px", color:"#5a4020", marginBottom:"10px",
          display:"flex", justifyContent:"space-between" }}>
          <span>YOUR FARM — {activePlots} PLOTS · LV.{level}</span>
          {getSellBonus(level) > 1 && (
            <span style={{color:"#4caf50"}}>
              +{Math.round((getSellBonus(level)-1)*100)}% sell bonus
            </span>
          )}
        </div>
        <div className="farm-grid">
          {grid.map((p, i) => {
            const d = getPlotDisplay(p, i);
            return (
              <div key={i} onClick={() => handlePlot(i)} style={{
                background:d.bg, border:`2px solid ${d.border}`,
                borderRadius:"8px", aspectRatio:"1",
                display:"flex", flexDirection:"column",
                alignItems:"center", justifyContent:"center",
                position:"relative", overflow:"hidden",
                cursor:d.locked?"default":"pointer",
                opacity:d.locked?0.25:1,
                boxShadow:d.ready?"0 0 14px #4caf5060":"none",
                transition:"transform 0.1s",
              }}
                onMouseEnter={e=>{ if(!d.locked) e.currentTarget.style.transform="scale(1.06)"; }}
                onMouseLeave={e=>{ e.currentTarget.style.transform="scale(1)"; }}
              >
                {p.crop && !p.ready && (
                  <div style={{ position:"absolute", bottom:0, left:0, height:"3px",
                    width:`${d.ratio*100}%`,
                    background:p.watered?"#4a90d9":"#4caf50",
                    transition:"width 0.8s" }}/>
                )}
                <div style={{ fontSize:"24px" }}>{d.emoji || "▪"}</div>
                {d.ready && (
                  <div style={{ fontSize:"7px", color:"#4caf50",
                    letterSpacing:"1px", animation:"pulse 1s infinite" }}>READY</div>
                )}
                {p.watered && !p.ready && (
                  <div style={{ position:"absolute", top:"3px", right:"4px", fontSize:"9px" }}>💧</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom action bar */}
      <div style={{
        position:"fixed", bottom:0, left:0, right:0,
        background:"#110e07", borderTop:"1px solid #2a1e0a",
        padding:"10px 12px", display:"flex", gap:"8px", zIndex:40,
      }}>
        {ACTIONS.map(a => (
          <button key={a.id}
            onClick={() => { setAction(a.id); if (a.id==="plant") setShowPicker(true); }}
            style={{
              flex:1, padding:"10px 4px",
              background:action===a.id?`${a.color}20`:"transparent",
              border:`1.5px solid ${action===a.id?a.color:"#2a1e0a"}`,
              borderRadius:"8px", cursor:"pointer",
              fontFamily:"inherit", fontSize:"9px",
              color:action===a.id?a.color:"#5a4020",
              display:"flex", flexDirection:"column",
              alignItems:"center", gap:"3px",
              transition:"all 0.15s",
            }}>
            <span style={{ fontSize:"16px" }}>{a.icon}</span>
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}
