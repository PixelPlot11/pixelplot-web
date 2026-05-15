// src/components/AdminPanel.jsx
// Admin-only panel for updating crop prices and daily cap
// Only shows if connected wallet has ADMIN_ROLE

import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { CROPS } from "../lib/gameData";
import { CONFIG } from "../lib/config";

const ADMIN_ABI = [
  "function updateCrop(uint8 cropId, uint256 seedCost, uint256 sellPrice, bool active) external",
  "function updateDailyWithdrawCap(uint256 newCap) external",
  "function dailyWithdrawCap() view returns (uint256)",
  "function dailyWithdrawnAmount() view returns (uint256)",
  "function contractBalance() view returns (uint256)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function pause() external",
  "function unpause() external",
  "function paused() view returns (bool)",
];

const ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"));

function Panel({ title, children }) {
  return (
    <div style={{ background:"#110e07", border:"1px solid #2a1e0a", borderRadius:"10px", padding:"14px", marginBottom:"10px" }}>
      <div style={{ fontSize:"8px", letterSpacing:"3px", color:"#f0c060", marginBottom:"12px" }}>⚙️ {title}</div>
      {children}
    </div>
  );
}

function Input({ label, value, onChange, placeholder, suffix }) {
  return (
    <div style={{ marginBottom:"8px" }}>
      <div style={{ fontSize:"9px", color:"#5a4020", marginBottom:"4px" }}>{label}</div>
      <div style={{ display:"flex", gap:"6px", alignItems:"center" }}>
        <input value={value} onChange={e=>onChange(e.target.value)}
          placeholder={placeholder}
          style={{ flex:1, padding:"8px 10px", background:"#0d0a06",
            border:"1px solid #2a1e0a", borderRadius:"6px",
            color:"#e8d5a3", fontFamily:"inherit", fontSize:"11px" }}
        />
        {suffix && <span style={{ fontSize:"9px", color:"#5a4020", flexShrink:0 }}>{suffix}</span>}
      </div>
    </div>
  );
}

export default function AdminPanel({ wallet }) {
  const [isAdmin, setIsAdmin]       = useState(false);
  const [checking, setChecking]     = useState(true);
  const [stats, setStats]           = useState(null);
  const [isPaused, setIsPaused]     = useState(false);
  const [txPending, setTxPending]   = useState(false);
  const [msg, setMsg]               = useState(null);

  // Crop editor state
  const [editCrop, setEditCrop]     = useState("wheat");
  const [newSeed, setNewSeed]       = useState("");
  const [newSell, setNewSell]       = useState("");

  // Daily cap state
  const [newCap, setNewCap]         = useState("");

  const showMsg = useCallback((text, color="#4caf50") => {
    setMsg({ text, color });
    setTimeout(() => setMsg(null), 4000);
  }, []);

  const loadStats = useCallback(async () => {
    if (!wallet) return;
    try {
      const game = new ethers.Contract(CONFIG.GAME_CONTRACT_ADDRESS, ADMIN_ABI, wallet.provider);
      const [cap, withdrawn, balance, paused, admin] = await Promise.all([
        game.dailyWithdrawCap(),
        game.dailyWithdrawnAmount(),
        game.contractBalance(),
        game.paused(),
        game.hasRole(ADMIN_ROLE, wallet.address),
      ]);
      setIsAdmin(admin);
      setIsPaused(paused);
      setStats({
        cap:       ethers.formatEther(cap),
        withdrawn: ethers.formatEther(withdrawn),
        balance:   ethers.formatEther(balance),
        capRaw:    cap,
      });
    } catch (e) {
      console.error("loadStats:", e);
    } finally {
      setChecking(false);
    }
  }, [wallet]);

  useEffect(() => { loadStats(); }, [loadStats]);

  // Pre-fill crop values when selection changes
  useEffect(() => {
    const c = CROPS[editCrop];
    if (c) {
      setNewSeed(c.seedCost.toString());
      setNewSell(c.sellPrice.toString());
    }
  }, [editCrop]);

  const updateCrop = async () => {
    if (!wallet || !newSeed || !newSell) return;
    const c = CROPS[editCrop];
    setTxPending(true);
    try {
      const game     = new ethers.Contract(CONFIG.GAME_CONTRACT_ADDRESS, ADMIN_ABI, wallet.signer);
      const seedWei  = ethers.parseEther(newSeed);
      const sellWei  = ethers.parseEther(newSell);
      const tx = await game.updateCrop(c.id, seedWei, sellWei, true);
      showMsg("⏳ Waiting for confirmation...", "#f0c060");
      await tx.wait();
      showMsg(`✅ ${c.name} prices updated on-chain!`);
      await loadStats();
    } catch (e) {
      showMsg(e.reason || "Transaction failed", "#e04040");
    }
    setTxPending(false);
  };

  const updateCap = async () => {
    if (!wallet || !newCap) return;
    setTxPending(true);
    try {
      const game   = new ethers.Contract(CONFIG.GAME_CONTRACT_ADDRESS, ADMIN_ABI, wallet.signer);
      const capWei = ethers.parseEther(newCap);
      const tx = await game.updateDailyWithdrawCap(capWei);
      showMsg("⏳ Waiting for confirmation...", "#f0c060");
      await tx.wait();
      showMsg(`✅ Daily cap updated to ${newCap} tokens!`);
      await loadStats();
    } catch (e) {
      showMsg(e.reason || "Transaction failed", "#e04040");
    }
    setTxPending(false);
  };

  const togglePause = async () => {
    if (!wallet) return;
    setTxPending(true);
    try {
      const game = new ethers.Contract(CONFIG.GAME_CONTRACT_ADDRESS, ADMIN_ABI, wallet.signer);
      const tx   = isPaused ? await game.unpause() : await game.pause();
      showMsg("⏳ Waiting...", "#f0c060");
      await tx.wait();
      setIsPaused(!isPaused);
      showMsg(isPaused ? "✅ Contract unpaused" : "⚠️ Contract paused!", isPaused ? "#4caf50" : "#f0c060");
    } catch (e) {
      showMsg(e.reason || "Failed", "#e04040");
    }
    setTxPending(false);
  };

  if (!wallet) return (
    <Panel title="ADMIN PANEL">
      <div style={{ fontSize:"10px", color:"#5a4020", textAlign:"center", padding:"20px" }}>
        Connect wallet to access admin panel
      </div>
    </Panel>
  );

  if (checking) return (
    <Panel title="ADMIN PANEL">
      <div style={{ fontSize:"10px", color:"#5a4020", textAlign:"center", padding:"20px" }}>
        Checking admin role...
      </div>
    </Panel>
  );

  if (!isAdmin) return (
    <Panel title="ADMIN PANEL">
      <div style={{ fontSize:"10px", color:"#e04040", textAlign:"center", padding:"20px" }}>
        🔒 Not admin wallet
      </div>
    </Panel>
  );

  const selectedCrop = CROPS[editCrop];

  return (
    <div>
      {/* Toast */}
      {msg && (
        <div style={{ padding:"10px 14px", marginBottom:"10px", background:"#0d0a06",
          border:`1px solid ${msg.color}`, borderRadius:"8px",
          fontSize:"11px", color:msg.color }}>
          {msg.text}
        </div>
      )}

      {/* Contract Stats */}
      <Panel title="CONTRACT STATUS">
        {stats && (
          <>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px", marginBottom:"10px" }}>
              {[
                { label:"Pool Balance",    val:`${parseFloat(stats.balance).toLocaleString()} $PLOT`,  color:"#4caf50" },
                { label:"Daily Cap",       val:`${parseFloat(stats.cap).toLocaleString()} tokens`,      color:"#f0c060" },
                { label:"Withdrawn Today", val:`${parseFloat(stats.withdrawn).toLocaleString()} tokens`,color:"#9c7adb" },
                { label:"Remaining Today", val:`${(parseFloat(stats.cap)-parseFloat(stats.withdrawn)).toLocaleString()} tokens`, color:"#4a90d9" },
              ].map(s => (
                <div key={s.label} style={{ padding:"10px", background:"#0d0a06", borderRadius:"8px", border:"1px solid #1a1206" }}>
                  <div style={{ fontSize:"8px", color:"#5a4020", marginBottom:"4px" }}>{s.label}</div>
                  <div style={{ fontSize:"11px", color:s.color, fontWeight:700 }}>{s.val}</div>
                </div>
              ))}
            </div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px", background:"#0d0a06", borderRadius:"8px" }}>
              <div>
                <div style={{ fontSize:"9px", color:"#5a4020" }}>Contract Status</div>
                <div style={{ fontSize:"12px", color:isPaused?"#e04040":"#4caf50", fontWeight:700, marginTop:"2px" }}>
                  {isPaused ? "⛔ PAUSED" : "✅ ACTIVE"}
                </div>
              </div>
              <button onClick={togglePause} disabled={txPending} style={{
                padding:"8px 16px",
                background: isPaused ? "#1a3d1a" : "#3d1a1a",
                border:`1px solid ${isPaused?"#4caf50":"#e04040"}`,
                borderRadius:"20px",
                color: isPaused ? "#4caf50" : "#e04040",
                cursor:"pointer", fontFamily:"inherit", fontSize:"10px",
                opacity:txPending?0.6:1,
              }}>
                {isPaused ? "▶ Unpause" : "⏸ Pause"}
              </button>
            </div>
          </>
        )}
        <button onClick={loadStats} style={{
          width:"100%", marginTop:"8px", padding:"7px",
          background:"transparent", border:"1px solid #2a1e0a",
          borderRadius:"8px", color:"#5a4020", cursor:"pointer",
          fontFamily:"inherit", fontSize:"9px",
        }}>↻ Refresh Stats</button>
      </Panel>

      {/* Update Crop Prices */}
      <Panel title="UPDATE CROP PRICES">
        <div style={{ fontSize:"9px", color:"#5a4020", marginBottom:"10px", lineHeight:1.8 }}>
          Update seed buy/sell prices on-chain. Use when MCap changes significantly.
          Values in token units (not wei) — e.g. enter 20000 for 20,000 tokens.
        </div>

        {/* Crop selector */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"4px", marginBottom:"12px" }}>
          {Object.entries(CROPS).map(([key, c]) => (
            <button key={key} onClick={()=>setEditCrop(key)} style={{
              padding:"6px 4px", fontSize:"9px", textAlign:"center",
              background:editCrop===key?"#2a1f0a":"transparent",
              border:`1px solid ${editCrop===key?c.color:"#2a1e0a"}`,
              borderRadius:"6px", cursor:"pointer", fontFamily:"inherit",
              color:editCrop===key?c.color:"#5a4020",
            }}>
              {c.emoji}<br/>
              <span style={{fontSize:"8px"}}>{c.name}</span>
            </button>
          ))}
        </div>

        {selectedCrop && (
          <div style={{ background:"#0d0a06", borderRadius:"8px", padding:"12px", marginBottom:"10px" }}>
            <div style={{ fontSize:"10px", color:selectedCrop.color, fontWeight:700, marginBottom:"8px" }}>
              {selectedCrop.emoji} {selectedCrop.name} — Current: {selectedCrop.seedCost.toLocaleString()} / {selectedCrop.sellPrice.toLocaleString()}
            </div>

            {/* Price preview */}
            {newSeed && newSell && (
              <div style={{ fontSize:"9px", color:"#5a4020", marginBottom:"8px", padding:"8px", background:"#110e07", borderRadius:"6px" }}>
                {(() => {
                  const price10k  = 10_000 / 100_000_000_000;
                  const price100k = 100_000 / 100_000_000_000;
                  const s = parseInt(newSeed) || 0;
                  const v = parseInt(newSell) || 0;
                  const lv1_10k   = (v - s) * price10k;
                  const lv10_10k  = (v * 1.35 - s) * price10k;
                  const lv1_100k  = (v - s) * price100k;
                  const lv10_100k = (v * 1.35 - s) * price100k;
                  return (
                    <>
                      <div>Preview profit per harvest:</div>
                      <div>  Lv1  @ $10k MCap: <span style={{color:lv1_10k>=0?"#4caf50":"#e04040"}}>{lv1_10k>=0?"+":""}{lv1_10k.toFixed(6)}$</span></div>
                      <div>  Lv10 @ $10k MCap: <span style={{color:"#4caf50"}}>+{lv10_10k.toFixed(6)}$</span></div>
                      <div>  Lv1  @ $100k MCap: <span style={{color:lv1_100k>=0?"#4caf50":"#e04040"}}>{lv1_100k>=0?"+":""}{lv1_100k.toFixed(5)}$</span></div>
                      <div>  Lv10 @ $100k MCap: <span style={{color:"#4caf50"}}>+{lv10_100k.toFixed(5)}$</span></div>
                    </>
                  );
                })()}
              </div>
            )}

            <Input label="New Seed Cost (tokens)" value={newSeed}
              onChange={setNewSeed} placeholder="e.g. 20000" suffix="tokens" />
            <Input label="New Sell Price (tokens)" value={newSell}
              onChange={setNewSell} placeholder="e.g. 22000" suffix="tokens" />
          </div>
        )}

        <button onClick={updateCrop} disabled={txPending || !newSeed || !newSell} style={{
          width:"100%", padding:"11px",
          background: txPending?"#0d0a06":"#1a2d0a",
          border:`1px solid ${txPending?"#2a1e0a":"#4caf50"}`,
          borderRadius:"20px", color:txPending?"#3a2a10":"#4caf50",
          cursor:txPending?"not-allowed":"pointer",
          fontFamily:"inherit", fontSize:"11px", fontWeight:700,
        }}>
          {txPending ? "⏳ Waiting..." : `🔄 Update ${selectedCrop?.name} Prices On-Chain`}
        </button>
      </Panel>

      {/* Update Daily Cap */}
      <Panel title="UPDATE DAILY WITHDRAW CAP">
        <div style={{ fontSize:"9px", color:"#5a4020", marginBottom:"10px", lineHeight:1.8 }}>
          Global daily cap across all users. Raise when MCap grows.
          Current: {stats ? parseFloat(stats.cap).toLocaleString() : "..."} tokens/day
        </div>

        {/* Preset buttons */}
        <div style={{ display:"flex", gap:"6px", flexWrap:"wrap", marginBottom:"10px" }}>
          {[
            ["500K (Launch)",    "500000"],
            ["2M (Growth)",      "2000000"],
            ["5M (Mid)",         "5000000"],
            ["10M (Moon)",       "10000000"],
          ].map(([label, val]) => (
            <button key={val} onClick={()=>setNewCap(val)} style={{
              padding:"5px 10px", fontSize:"9px",
              background: newCap===val?"#2a1f0a":"transparent",
              border:`1px solid ${newCap===val?"#f0c060":"#2a1e0a"}`,
              borderRadius:"20px", color:newCap===val?"#f0c060":"#5a4020",
              cursor:"pointer", fontFamily:"inherit",
            }}>{label}</button>
          ))}
        </div>

        <Input label="Custom cap (tokens)" value={newCap}
          onChange={setNewCap} placeholder="e.g. 500000" suffix="tokens/day" />

        {newCap && (
          <div style={{ fontSize:"9px", color:"#5a4020", marginBottom:"10px", padding:"8px", background:"#0d0a06", borderRadius:"6px" }}>
            {parseInt(newCap).toLocaleString()} tokens = ${(parseInt(newCap) * 10_000 / 100_000_000_000).toFixed(4)}/day at $10k MCap
            {" | "}${(parseInt(newCap) * 100_000 / 100_000_000_000).toFixed(4)}/day at $100k MCap
          </div>
        )}

        <button onClick={updateCap} disabled={txPending || !newCap} style={{
          width:"100%", padding:"11px",
          background: txPending?"#0d0a06":"#2a1f0a",
          border:`1px solid ${txPending?"#2a1e0a":"#f0c060"}`,
          borderRadius:"20px", color:txPending?"#3a2a10":"#f0c060",
          cursor:txPending?"not-allowed":"pointer",
          fontFamily:"inherit", fontSize:"11px", fontWeight:700,
        }}>
          {txPending ? "⏳ Waiting..." : "🔄 Update Daily Cap On-Chain"}
        </button>
      </Panel>

      <div style={{ fontSize:"8px", color:"#3a2a10", textAlign:"center", lineHeight:1.8, padding:"8px" }}>
        ⚠️ All changes are permanent on-chain transactions.<br/>
        Double check values before confirming in MetaMask.
      </div>
    </div>
  );
}