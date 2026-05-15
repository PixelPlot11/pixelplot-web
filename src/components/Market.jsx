// src/components/Market.jsx
import { useState, useEffect } from "react";
import { CROPS, getLevelData, getSellBonus } from "../lib/gameData";
import { CONFIG } from "../lib/config";

const BACKEND = CONFIG.BACKEND_URL || "http://localhost:3001";

export default function Market({ wallet, profile, inventory, buySeeds, buyingSeeds }) {
  const [qty, setQty]           = useState({});
  const [livePrices, setLivePrices] = useState(null);
  const [priceError, setPriceError] = useState(false);

  // Fetch live prices from backend every time Market tab mounts
  useEffect(() => {
    setPriceError(false);
    fetch(`${BACKEND}/api/prices`)
      .then(r => r.json())
      .then(d => setLivePrices(d.prices || null))
      .catch(() => setPriceError(true));
  }, []);

  // Merge live prices with static CROPS metadata (emoji, color, growTime, etc.)
  const crops = Object.fromEntries(
    Object.entries(CROPS).map(([key, c]) => [key, {
      ...c,
      seedCost:  livePrices?.[key]?.seedCost  ?? c.seedCost,
      sellPrice: livePrices?.[key]?.sellPrice ?? c.sellPrice,
    }])
  );

  const exp       = profile?.exp ?? 0;
  const { cur }   = getLevelData(exp);
  const level     = cur.level;
  const sellBonus = getSellBonus(level);

  const getQty = (key) => qty[key] || 1;
  const setQ   = (key, val) => setQty(prev => ({ ...prev, [key]: Math.max(1, Math.min(100, val)) }));

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>

      {/* Info */}
      <div style={{ background:"#110e07", border:"1px solid #2a1e0a", borderRadius:"10px", padding:"12px" }}>
        <div style={{ fontSize:"11px", color:"#8a7050", lineHeight:2 }}>
          Buy seeds using <span style={{color:"#f0c060"}}>$PLOT tokens</span> via smart contract.
          Set quantity per crop before buying to save gas — one tx per crop type.
        </div>
        {!wallet && (
          <div style={{ fontSize:"10px", color:"#e04040", marginTop:"8px" }}>⚠️ Connect wallet to buy seeds</div>
        )}
        {priceError && (
          <div style={{ fontSize:"9px", color:"#f0c060", marginTop:"6px" }}>⚠️ Showing cached prices — backend unreachable</div>
        )}
      </div>

      {/* Crop cards */}
      {Object.entries(crops).map(([key, c]) => {
        const locked   = c.unlockLevel > level;
        const inStock  = inventory[key] || 0;
        const q        = getQty(key);
        const total    = c.seedCost * q;
        const isBuying = buyingSeeds === key;

        return (
          <div key={key} style={{
            background:"#110e07", border:`1px solid ${locked?"#1a1206":"#2a1e0a"}`,
            borderRadius:"10px", padding:"14px",
            opacity: locked ? 0.4 : 1,
          }}>
            {/* Top row — crop info */}
            <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"12px" }}>
              <div style={{ fontSize:"34px", flexShrink:0 }}>{locked ? "🔒" : c.emoji}</div>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ fontSize:"13px", color:c.color, fontWeight:700 }}>{c.name}</div>
                  <div style={{ fontSize:"9px",
                    color:inStock>0?"#4caf50":"#5a4020",
                    background:inStock>0?"#0a1a0a":"transparent",
                    border:`1px solid ${inStock>0?"#2a4020":"transparent"}`,
                    padding:"2px 8px", borderRadius:"20px",
                  }}>
                    {inStock} in stock
                  </div>
                </div>
                <div style={{ fontSize:"9px", color:"#5a4020", marginTop:"5px", lineHeight:2 }}>
                  <span>Seed: <span style={{color:"#f0c060"}}>{c.seedCost} $PLOT</span></span>
                  {"  ·  "}
                  <span>Sell: <span style={{color:"#4caf50"}}>{Math.floor(c.sellPrice * sellBonus)} $PLOT</span></span>
                  {"  ·  "}
                  <span>EXP: <span style={{color:"#9c7adb"}}>{c.exp}</span></span>
                  {"  ·  "}
                  <span>Grow: <span style={{color:"#e8d5a3"}}>{c.growTime}s</span></span>
                </div>
                {locked && (
                  <div style={{ fontSize:"9px", color:"#e04040", marginTop:"4px" }}>
                    🔒 Unlock at Level {c.unlockLevel}
                  </div>
                )}
              </div>
            </div>

            {/* Buy row */}
            {!locked && wallet && (
              <div style={{
                display:"flex", alignItems:"center", gap:"10px",
                background:"#0d0a06", borderRadius:"8px", padding:"10px 12px",
                border:"1px solid #1a1206",
              }}>
                {/* Qty stepper */}
                <div style={{ display:"flex", alignItems:"center", gap:"0" }}>
                  <button onClick={() => setQ(key, q - 1)} style={{
                    width:"32px", height:"32px", background:"#1a1206",
                    border:"1px solid #2a1e0a", borderRadius:"6px 0 0 6px",
                    color:"#f0c060", cursor:"pointer", fontSize:"16px",
                    display:"flex", alignItems:"center", justifyContent:"center",
                  }}>−</button>
                  <input
                    type="number"
                    value={q}
                    min={1} max={100}
                    onChange={e => setQ(key, parseInt(e.target.value) || 1)}
                    style={{
                      width:"48px", height:"32px", textAlign:"center",
                      background:"#1a1206", border:"1px solid #2a1e0a",
                      borderLeft:"none", borderRight:"none",
                      color:"#e8d5a3", fontFamily:"inherit", fontSize:"12px",
                      fontWeight:700,
                    }}
                  />
                  <button onClick={() => setQ(key, q + 1)} style={{
                    width:"32px", height:"32px", background:"#1a1206",
                    border:"1px solid #2a1e0a", borderRadius:"0 6px 6px 0",
                    color:"#f0c060", cursor:"pointer", fontSize:"16px",
                    display:"flex", alignItems:"center", justifyContent:"center",
                  }}>+</button>
                </div>

                {/* Quick qty buttons */}
                <div style={{ display:"flex", gap:"4px" }}>
                  {[5, 10, 50].map(n => (
                    <button key={n} onClick={() => setQ(key, n)} style={{
                      padding:"4px 8px", fontSize:"9px",
                      background: q===n ? "#2a1f0a" : "transparent",
                      border:`1px solid ${q===n?"#f0c060":"#2a1e0a"}`,
                      borderRadius:"6px", color:q===n?"#f0c060":"#5a4020",
                      cursor:"pointer", fontFamily:"inherit",
                    }}>{n}</button>
                  ))}
                </div>

                {/* Total cost */}
                <div style={{ fontSize:"10px", color:"#5a4020", flexShrink:0 }}>
                  = <span style={{ color:"#f0c060", fontWeight:700, fontSize:"12px" }}>{total}</span>
                  <span style={{ color:"#4a3a20" }}> $PLOT</span>
                </div>

                {/* Buy button */}
                <button
                  onClick={() => buySeeds(key, q)}
                  disabled={!!buyingSeeds}
                  style={{
                    marginLeft:"auto", padding:"8px 16px",
                    background: isBuying ? "#0d0a06" : "#1a2d0a",
                    border:`1px solid ${isBuying ? "#2a1e0a" : "#4caf50"}`,
                    borderRadius:"20px",
                    color: isBuying ? "#3a2a10" : "#4caf50",
                    cursor: buyingSeeds ? "not-allowed" : "pointer",
                    fontFamily:"inherit", fontSize:"11px", fontWeight:700,
                    display:"flex", alignItems:"center", gap:"6px",
                    flexShrink:0,
                  }}
                >
                  {isBuying
                    ? <><span style={{animation:"spin 0.8s linear infinite",display:"inline-block"}}>⟳</span> Buying…</>
                    : "🛒 Buy"}
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* Contract info */}
      <div style={{ background:"#110e07", border:"1px solid #2a1e0a", borderRadius:"10px", padding:"12px" }}>
        <div style={{ fontSize:"8px", letterSpacing:"3px", color:"#5a4020", marginBottom:"8px" }}>CONTRACT</div>
        <div style={{ fontSize:"9px", color:"#5a4020", fontFamily:"monospace", lineHeight:2 }}>
          <div>$PLOT:{" "}
            <a href={`https://sepolia.basescan.org/address/${CONFIG.PLOT_TOKEN_ADDRESS}`}
              target="_blank" rel="noreferrer" style={{color:"#4a90d9"}}>
              {CONFIG.PLOT_TOKEN_ADDRESS?.slice(0,10)}…
            </a>
          </div>
          <div>Game:{" "}
            <a href={`https://sepolia.basescan.org/address/${CONFIG.GAME_CONTRACT_ADDRESS}`}
              target="_blank" rel="noreferrer" style={{color:"#4a90d9"}}>
              {CONFIG.GAME_CONTRACT_ADDRESS?.slice(0,10)}…
            </a>
          </div>
          <div>Network: <span style={{color:"#4caf50"}}>Base Sepolia Testnet</span></div>
        </div>
      </div>
    </div>
  );
}
