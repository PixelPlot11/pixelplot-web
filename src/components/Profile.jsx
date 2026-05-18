// src/components/Profile.jsx
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { getLevelData, getSellBonus, shortAddr, PRESET_AVATARS, CROPS } from "../lib/gameData";
import { CONFIG } from "../lib/config";

export default function Profile({
  wallet, profile, inventory,
  plotBalance, gameBalance,
  saveProfile, savingProfile,
  withdrawEarnings, withdrawing,
}) {
  const [editing, setEditing]         = useState(false);
  const [draftName, setDraftName]     = useState("");
  const [draftAvatar, setDraftAvatar] = useState("");
  const [nfts, setNfts]               = useState([]);

  const exp             = profile?.exp ?? 0;
  const { cur, next }   = getLevelData(exp);
  const level           = cur.level;
  const sellBonus       = getSellBonus(level);
  const totalSeeds      = Object.values(inventory).reduce((a, b) => a + b, 0);
  const plotBal          = typeof plotBalance === "bigint" ? plotBalance : 0n;
  const plotBalFormatted = parseFloat(ethers.formatEther(plotBal)).toFixed(4);
  const pendingEarnings  = profile?.pending_earnings || 0;
  const hasBalance       = pendingEarnings > 0;

  // Fetch NFTs
  useEffect(() => {
    if (!wallet || !CONFIG.ALCHEMY_KEY) return;
    async function fetchNFTs() {
      try {
        const url  = `https://base-mainnet.g.alchemy.com/nft/v3/${CONFIG.ALCHEMY_KEY}/getNFTsForOwner?owner=${wallet.address}&withMetadata=true&pageSize=12`;
        const res  = await fetch(url);
        const json = await res.json();
        const imgs = (json.ownedNfts || [])
          .filter(n => n.image?.thumbnailUrl)
          .map(n => ({ img: n.image.thumbnailUrl, name: n.name || "NFT" }))
          .slice(0, 12);
        setNfts(imgs);
      } catch { setNfts([]); }
    }
    fetchNFTs();
  }, [wallet]);

  const handleSave = async () => {
    if (!wallet || !profile) return;
    await saveProfile(wallet.address, draftName || profile.username, draftAvatar || profile.avatar);
    setEditing(false);
  };

  if (!wallet) {
    return (
      <div style={{ background:"#110e07", border:"1px solid #2a1e0a", borderRadius:"10px",
        padding:"40px", textAlign:"center" }}>
        <div style={{ fontSize:"32px", marginBottom:"12px" }}>👤</div>
        <div style={{ fontSize:"11px", color:"#5a4020" }}>Connect wallet to view profile</div>
      </div>
    );
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>

      {/* ── WITHDRAW PANEL — top priority ── */}
      <div style={{
        background: hasBalance ? "#0d2010" : "#110e07",
        border:`2px solid ${hasBalance ? "#4caf50" : "#2a1e0a"}`,
        borderRadius:"10px", padding:"14px",
        boxShadow: hasBalance ? "0 0 20px #4caf5030" : "none",
      }}>
        <div style={{ fontSize:"8px", letterSpacing:"3px", color:"#5a4020", marginBottom:"12px" }}>
          💰 HARVEST EARNINGS
        </div>

        {/* Balance cards */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px", marginBottom:"14px" }}>
          <div style={{ padding:"12px", background:"#0a0a0a", borderRadius:"8px",
            border:`1px solid ${hasBalance?"#4caf50":"#1a1206"}` }}>
            <div style={{ fontSize:"8px", color:"#5a4020", marginBottom:"6px", letterSpacing:"1px" }}>
              PENDING EARNINGS
            </div>
            <div style={{ fontSize:"18px", fontWeight:900, color:hasBalance?"#4caf50":"#3a2a10" }}>
              {pendingEarnings}
            </div>
            <div style={{ fontSize:"9px", color:"#4a3a20", marginTop:"2px" }}>$PLOT (claimable)</div>
          </div>
          <div style={{ padding:"12px", background:"#0a0a0a", borderRadius:"8px", border:"1px solid #1a1206" }}>
            <div style={{ fontSize:"8px", color:"#5a4020", marginBottom:"6px", letterSpacing:"1px" }}>
              WALLET BALANCE
            </div>
            <div style={{ fontSize:"18px", fontWeight:900, color:"#f0c060" }}>
              {plotBalFormatted}
            </div>
            <div style={{ fontSize:"9px", color:"#4a3a20", marginTop:"2px" }}>$PLOT</div>
          </div>
        </div>

        <div style={{ fontSize:"9px", color:"#5a4020", lineHeight:1.8, marginBottom:"12px" }}>
          Harvest crops to earn $PLOT in-game balance. Withdraw to your wallet anytime.{" "}
          <span style={{color:"#3a2a10"}}>Max 10,000 per tx · 1h cooldown.</span>
        </div>

        <button
          onClick={() => withdrawEarnings()}
          disabled={withdrawing || !hasBalance}
          style={{
            width:"100%", padding:"13px",
            background: hasBalance ? "#1a4020" : "#0d0a06",
            border:`2px solid ${hasBalance ? "#4caf50" : "#1a1206"}`,
            borderRadius:"10px",
            color: hasBalance ? "#4caf50" : "#3a2a10",
            cursor: hasBalance && !withdrawing ? "pointer" : "default",
            fontFamily:"inherit", fontSize:"12px", fontWeight:700,
            display:"flex", alignItems:"center", justifyContent:"center", gap:"8px",
            transition:"all 0.2s",
          }}
        >
          {withdrawing
            ? <><span style={{animation:"spin 0.8s linear infinite",display:"inline-block"}}>⟳</span> Withdrawing…</>
            : hasBalance
            ? `💸 Withdraw ${pendingEarnings} $PLOT to Wallet (1 tx)`
            : "No earnings to withdraw yet"}
        </button>
      </div>

      {/* ── STATS ── */}
      <div style={{ background:"#110e07", border:"1px solid #2a1e0a", borderRadius:"10px", padding:"14px" }}>
        <div style={{ fontSize:"8px", letterSpacing:"3px", color:"#5a4020", marginBottom:"10px" }}>STATS</div>
        {[
          ["Level",           `${level} — ${cur.title}`,                       "#f0c060"],
          ["EXP",             `${exp}${next ? ` / ${next.expReq}` : " (MAX)"}`, "#9c7adb"],
          ["Total Harvested", profile?.total_harvested ?? 0,                   "#4caf50"],
          ["Total Earned",    `${profile?.total_earned ?? 0} $PLOT`,           "#4caf50"],
          ["Seeds in Bag",    totalSeeds,                                       "#4a90d9"],
          ["Sell Bonus",      `+${Math.round((sellBonus - 1) * 100)}%`,        "#ff8c42"],
          ["Active Plots",    cur.plots,                                        "#e8d5a3"],
        ].map(([k, v, col]) => (
          <div key={k} style={{ display:"flex", justifyContent:"space-between",
            padding:"8px 0", borderBottom:"1px solid #1a1206", fontSize:"11px" }}>
            <span style={{color:"#5a4020"}}>{k}</span>
            <span style={{color:col, fontWeight:700}}>{v}</span>
          </div>
        ))}
      </div>

      {/* ── IDENTITY ── */}
      <div style={{ background:"#110e07", border:"1px solid #2a1e0a", borderRadius:"10px", padding:"14px" }}>
        <div style={{ fontSize:"8px", letterSpacing:"3px", color:"#5a4020", marginBottom:"12px" }}>IDENTITY</div>

        <div style={{ display:"flex", alignItems:"center", gap:"14px", marginBottom:"14px" }}>
          <div style={{
            width:"64px", height:"64px", borderRadius:"50%",
            background:"#1a1206", border:"2px solid #3a2a10",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:"28px", overflow:"hidden", flexShrink:0,
          }}>
            {(draftAvatar || profile?.avatar)?.startsWith("http") ? (
              <img src={draftAvatar || profile?.avatar} alt="av"
                style={{width:"100%",height:"100%",objectFit:"cover"}}/>
            ) : (
              <span>{draftAvatar || profile?.avatar || "🧑‍🌾"}</span>
            )}
          </div>
          <div style={{ flex:1 }}>
            {editing ? (
              <input
                value={draftName}
                onChange={e => setDraftName(e.target.value)}
                placeholder="Enter username"
                style={{ width:"100%", padding:"8px 10px", background:"#1a1206",
                  border:"1px solid #f0c060", borderRadius:"8px", color:"#e8d5a3",
                  fontFamily:"inherit", fontSize:"12px", boxSizing:"border-box" }}
              />
            ) : (
              <>
                <div style={{ fontSize:"15px", color:"#f0c060", fontWeight:700 }}>{profile?.username}</div>
                <div style={{ fontSize:"9px", color:"#5a4020", marginTop:"2px" }}>{shortAddr(wallet.address)}</div>
                <div style={{ fontSize:"9px", color:"#9c7adb", marginTop:"2px" }}>Lv.{level} — {cur.title}</div>
              </>
            )}
          </div>
        </div>

        {editing ? (
          <>
            {nfts.length > 0 && (
              <>
                <div style={{ fontSize:"8px", letterSpacing:"2px", color:"#5a4020", marginBottom:"8px" }}>YOUR NFTS</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"6px", marginBottom:"12px" }}>
                  {nfts.map((n, i) => (
                    <div key={i} onClick={() => setDraftAvatar(n.img)} style={{
                      aspectRatio:"1", borderRadius:"8px", overflow:"hidden", cursor:"pointer",
                      border:`2px solid ${draftAvatar===n.img?"#f0c060":"#2a1e0a"}`,
                    }}>
                      <img src={n.img} alt={n.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                    </div>
                  ))}
                </div>
              </>
            )}
            <div style={{ fontSize:"8px", letterSpacing:"2px", color:"#5a4020", marginBottom:"8px" }}>PRESET AVATARS</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:"6px", marginBottom:"14px" }}>
              {PRESET_AVATARS.map(a => (
                <button key={a} onClick={() => setDraftAvatar(a)} style={{
                  fontSize:"20px", padding:"6px 8px",
                  background:draftAvatar===a?"#2a1f0a":"transparent",
                  border:`1px solid ${draftAvatar===a?"#f0c060":"#2a1e0a"}`,
                  borderRadius:"8px", cursor:"pointer",
                }}>{a}</button>
              ))}
            </div>
            <div style={{ display:"flex", gap:"8px" }}>
              <button onClick={handleSave} disabled={savingProfile} style={{
                flex:1, padding:"10px", background:"#1a3d1a", border:"1px solid #4caf50",
                borderRadius:"20px", color:"#4caf50", cursor:"pointer",
                fontFamily:"inherit", fontSize:"11px",
              }}>{savingProfile ? "Saving…" : "✅ Save Profile"}</button>
              <button onClick={() => { setEditing(false); setDraftName(""); setDraftAvatar(""); }} style={{
                padding:"10px 16px", background:"transparent", border:"1px solid #3a2a10",
                borderRadius:"20px", color:"#5a4020", cursor:"pointer",
                fontFamily:"inherit", fontSize:"11px",
              }}>Cancel</button>
            </div>
          </>
        ) : (
          <button onClick={() => { setEditing(true); setDraftName(profile?.username || ""); setDraftAvatar(profile?.avatar || ""); }} style={{
            width:"100%", padding:"10px", background:"#2a1f0a", border:"1px solid #f0c060",
            borderRadius:"20px", color:"#f0c060", cursor:"pointer",
            fontFamily:"inherit", fontSize:"11px",
          }}>✏️ Edit Profile</button>
        )}
      </div>

      {/* ── SEED INVENTORY ── */}
      <div style={{ background:"#110e07", border:"1px solid #2a1e0a", borderRadius:"10px", padding:"14px" }}>
        <div style={{ fontSize:"8px", letterSpacing:"3px", color:"#5a4020", marginBottom:"10px" }}>
          SEED INVENTORY <span style={{color:"#4a90d9"}}>({totalSeeds} total)</span>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:"6px" }}>
          {Object.entries(CROPS).map(([key, c]) => {
            const qty = inventory[key] || 0;
            return (
              <div key={key} style={{ padding:"8px", borderRadius:"6px", background:"#0d0a06",
                border:`1px solid ${qty > 0 ? c.color+"40" : "#1a1206"}` }}>
                <div style={{ fontSize:"10px", color: qty > 0 ? c.color : "#3a2a10" }}>
                  {c.emoji} {c.name}
                </div>
                <div style={{ fontSize:"14px", fontWeight:700,
                  color:qty > 0 ? "#e8d5a3" : "#3a2a10", marginTop:"3px" }}>
                  {qty} <span style={{fontSize:"9px", color:"#4a3a20"}}>seeds</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}