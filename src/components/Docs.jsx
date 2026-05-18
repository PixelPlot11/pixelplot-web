// src/components/Docs.jsx
import React, { useState } from "react";

// Re-import since gameData exports them
import { CROPS, LEVELS } from "../lib/gameData";

function Section({ title, children }) {
  return (
    <div style={{ background:"#110e07", border:"1px solid #2a1e0a", borderRadius:"10px", padding:"14px", marginBottom:"10px" }}>
      <div style={{ fontSize:"10px", color:"#f0c060", fontWeight:700, letterSpacing:"2px", marginBottom:"10px" }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({ label, value, color="#e8d5a3" }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:"1px solid #1a1206", fontSize:"10px" }}>
      <span style={{color:"#5a4020"}}>{label}</span>
      <span style={{color, fontWeight:700}}>{value}</span>
    </div>
  );
}

export default function Docs({ tab: activeTab }) {
  const [tab, setTab] = React.useState("tokenomics");

  const tabs = [
    { id:"tokenomics", label:"📊 Tokenomics" },
    { id:"whitepaper", label:"📄 Whitepaper" },
    { id:"contracts",  label:"🔗 Contracts"  },
  ];

  return (
    <div>
      {/* Sub tabs */}
      <div style={{ display:"flex", gap:"6px", marginBottom:"12px", overflowX:"auto" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            padding:"7px 14px", fontSize:"9px", letterSpacing:"1px",
            background:tab===t.id?"#2a1f0a":"transparent",
            border:`1px solid ${tab===t.id?"#f0c060":"#2a1e0a"}`,
            borderRadius:"20px", color:tab===t.id?"#f0c060":"#5a4020",
            cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap",
          }}>{t.label}</button>
        ))}
      </div>

      {/* TOKENOMICS */}
      {tab === "tokenomics" && (
        <div>
          <Section title="TOKEN OVERVIEW">
            <Row label="Token Name"    value="PixelPlot Token" />
            <Row label="Symbol"        value="$PLOT" color="#f0c060" />
            <Row label="Total Supply"  value="21,000,000" color="#f0c060" />
            <Row label="Chain"         value="Base (Ethereum L2)" color="#4a90d9" />
            <Row label="Decimals"      value="18" />
            <Row label="Mint"          value="Fixed — no new mint ever" color="#4caf50" />
          </Section>

          <Section title="DISTRIBUTION">
            {[
              ["LP (Uniswap V4)", "6,300,000", "30%", "#4a90d9"],
              ["Reward Pool",     "14,700,000","70%", "#4caf50"],
            ].map(([label, amount, pct, color]) => (
              <div key={label} style={{ display:"flex", alignItems:"center", gap:"10px", padding:"10px 0", borderBottom:"1px solid #1a1206" }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:"11px", color, fontWeight:700 }}>{label}</div>
                  <div style={{ fontSize:"9px", color:"#5a4020", marginTop:"2px" }}>{amount} $PLOT</div>
                </div>
                <div style={{
                  padding:"4px 10px", borderRadius:"20px",
                  background:`${color}20`, border:`1px solid ${color}60`,
                  fontSize:"10px", color, fontWeight:700,
                }}>{pct}</div>
              </div>
            ))}
            <div style={{ fontSize:"9px", color:"#3a2a10", marginTop:"10px", lineHeight:1.8 }}>
              ⚠️ No team allocation. No VC. No presale.<br/>
              LP is single-sided ETH on Uniswap V4 — no $PLOT sold at launch.<br/>
              Reward pool is locked in game contract — only released through gameplay.
            </div>
          </Section>

          <Section title="DAILY WITHDRAW CAP">
            <Row label="Global cap/day"    value="150,000 $PLOT" color="#f0c060" />
            <Row label="Per-tx max"        value="10,000 $PLOT" />
            <Row label="Per-user cooldown" value="1 hour" />
            <Row label="Reset"            value="Every 24 hours (UTC)" />
            <div style={{ fontSize:"9px", color:"#3a2a10", marginTop:"8px", lineHeight:1.8 }}>
              Daily cap protects against whale farming and token dumping.
              Cap can be raised by admin as MCap grows.
            </div>
          </Section>

          <Section title="LAUNCH">
            <Row label="Platform"    value="Uniswap V4 (Ethereum L1)" />
            <Row label="Pool type"   value="Single-sided ETH" color="#4caf50" />
            <Row label="Start MCap"  value="~$10,000" color="#f0c060" />
            <Row label="Listed via"  value="Bankr Bot" />
          </Section>

          <Section title="CROP ECONOMY">
            <div style={{ fontSize:"9px", color:"#5a4020", marginBottom:"8px", lineHeight:1.8 }}>
              Designed so low-level players lose money — you must grind levels to profit.
              At Lv1 all crops are at a loss. At Lv10 (+35% sell bonus) all crops are profitable.
            </div>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", fontSize:"9px", borderCollapse:"collapse", color:"#6a5535" }}>
                <thead>
                  <tr style={{ color:"#5a4020", borderBottom:"1px solid #2a1e0a" }}>
                    {["Crop","Lv","Cost","Sell","Net Lv1","Net Lv10","EXP"].map(h=>(
                      <th key={h} style={{ padding:"4px 6px", textAlign:"left" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(CROPS).map(([k,c]) => {
                    const netLv1  = c.sellPrice - c.seedCost;
                    const netLv10 = Math.floor(c.sellPrice * 1.35) - c.seedCost;
                    return (
                      <tr key={k} style={{ borderBottom:"1px solid #1a1206" }}>
                        <td style={{ padding:"5px 6px", color:c.color }}>{c.emoji} {c.name}</td>
                        <td style={{ padding:"5px 6px" }}>{c.unlockLevel}</td>
                        <td style={{ padding:"5px 6px" }}>{c.seedCost}</td>
                        <td style={{ padding:"5px 6px", color:"#4caf50" }}>{c.sellPrice}</td>
                        <td style={{ padding:"5px 6px", color:netLv1<0?"#e04040":"#4caf50" }}>{netLv1>0?"+":""}{netLv1}</td>
                        <td style={{ padding:"5px 6px", color:"#4caf50" }}>+{netLv10}</td>
                        <td style={{ padding:"5px 6px", color:"#9c7adb" }}>{c.exp}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Section>
        </div>
      )}

      {/* WHITEPAPER */}
      {tab === "whitepaper" && (
        <div>
          <Section title="WHAT IS PIXELPLOT?">
            <div style={{ fontSize:"10px", color:"#8a7050", lineHeight:2 }}>
              PixelPlot is a Web3 farming game built on Base. Players buy seeds using $PLOT tokens,
              grow crops, and earn $PLOT through gameplay. The game is designed around a progressive
              economy — new players must invest time (leveling up) before becoming profitable.
            </div>
          </Section>

          <Section title="CORE MECHANICS">
            {[
              ["🌱 Plant", "Buy seeds with $PLOT → plant on your farm plots. Each action costs energy."],
              ["💧 Water", "Watering crops reduces grow time by 30%. Costs energy."],
              ["🌾 Harvest", "Harvest ready crops to earn $PLOT. Earnings accumulate off-chain and can be withdrawn anytime."],
              ["⚡ Energy", "1,000 energy max, regens 1,000 per 12 hours (~1.4/min). Limits farming rate."],
              ["⭐ EXP & Levels", "Earn EXP by harvesting. Higher levels unlock new crops, more plots, and sell bonuses."],
              ["💸 Withdraw", "Accumulated earnings are signed by backend operator and claimed on-chain in one transaction."],
            ].map(([title, desc]) => (
              <div key={title} style={{ padding:"8px 0", borderBottom:"1px solid #1a1206" }}>
                <div style={{ fontSize:"10px", color:"#f0c060", marginBottom:"3px" }}>{title}</div>
                <div style={{ fontSize:"9px", color:"#5a4020", lineHeight:1.8 }}>{desc}</div>
              </div>
            ))}
          </Section>

          <Section title="LEVEL SYSTEM">
            <div style={{ fontSize:"9px", color:"#5a4020", marginBottom:"8px" }}>
              10 levels total. Each level requires significantly more EXP — forcing long-term commitment.
            </div>
            {LEVELS.map(lv => (
              <div key={lv.level} style={{ display:"flex", gap:"10px", padding:"6px 0", borderBottom:"1px solid #1a1206", fontSize:"9px" }}>
                <span style={{ color:"#f0c060", width:"16px", flexShrink:0 }}>Lv{lv.level}</span>
                <span style={{ color:"#5a4020", width:"60px", flexShrink:0 }}>{lv.expReq.toLocaleString()} xp</span>
                <span style={{ color:"#8a7050" }}>{lv.bonus}</span>
              </div>
            ))}
          </Section>

          <Section title="ARCHITECTURE">
            {[
              ["Frontend",  "React + Vite, deployed on Vercel"],
              ["Backend",   "Node.js + Express, deployed on Railway"],
              ["Database",  "Supabase (PostgreSQL) — off-chain game state"],
              ["Chain",     "Base (Ethereum L2) — cheap gas"],
              ["Contracts", "Solidity 0.8.26, OpenZeppelin v4"],
              ["Signing",   "ECDSA — harvest claims signed by operator wallet"],
            ].map(([k,v])=>(
              <Row key={k} label={k} value={v} />
            ))}
          </Section>

          <Section title="SECURITY">
            {[
              "✅ Fixed token supply — no mint function after deploy",
              "✅ Harvest claims require ECDSA signature from operator",
              "✅ Cross-verified against harvest log (anti-tamper)",
              "✅ Daily global withdraw cap (150k $PLOT/day)",
              "✅ Per-user cooldown + per-tx cap",
              "✅ Emergency withdraw requires 48h timelock",
              "✅ Smart contracts verified open source on BaseScan",
              "✅ ReentrancyGuard on all value-moving functions",
            ].map(s=>(
              <div key={s} style={{ fontSize:"9px", color:"#8a7050", padding:"5px 0", borderBottom:"1px solid #1a1206" }}>{s}</div>
            ))}
          </Section>
        </div>
      )}

      {/* CONTRACTS */}
      {tab === "contracts" && (
        <div>
          <Section title="DEPLOYED CONTRACTS (Base Mainnet)">
            <div style={{ fontSize:"9px", color:"#5a4020", marginBottom:"10px" }}>
              All contracts are verified and open source. Anyone can read the code on BaseScan.
            </div>
            {[
              {
                name: "$PLOT Token (ERC-20)",
                addr: "0x7ef06DD6737F33C86a6f67f91CdF80CeCc101BA3",
                url:  "https://basescan.org/address/0x7ef06DD6737F33C86a6f67f91CdF80CeCc101BA3#code",
                desc: "ERC-20 token used in PixelPlot game.",
              },
              {
                name: "Game Contract (PixelPlotGame.sol)",
                addr: "0x61D509A6966077FedfF1142a05a8045f82506061",
                url:  "https://basescan.org/address/0x61D509A6966077FedfF1142a05a8045f82506061#code",
                desc: "Handles seed purchase (operator-signed), earnings, and withdrawal. ECDSA verified.",
              },
            ].map(c=>(
              <div key={c.addr} style={{ padding:"12px", background:"#0d0a06", borderRadius:"8px", border:"1px solid #2a1e0a", marginBottom:"8px" }}>
                <div style={{ fontSize:"10px", color:"#f0c060", fontWeight:700, marginBottom:"6px" }}>{c.name}</div>
                <div style={{ fontSize:"9px", color:"#5a4020", fontFamily:"monospace", marginBottom:"6px", wordBreak:"break-all" }}>{c.addr}</div>
                <div style={{ fontSize:"9px", color:"#4a3a20", marginBottom:"8px", lineHeight:1.8 }}>{c.desc}</div>
                <a href={c.url} target="_blank" rel="noreferrer" style={{
                  display:"inline-flex", alignItems:"center", gap:"4px",
                  fontSize:"9px", color:"#4a90d9", textDecoration:"none",
                  padding:"4px 10px", border:"1px solid #4a90d9",
                  borderRadius:"20px", letterSpacing:"1px",
                }}>🔗 View on BaseScan</a>
              </div>
            ))}
          </Section>

          <Section title="SOURCE CODE">
            <div style={{ fontSize:"9px", color:"#5a4020", lineHeight:2, marginBottom:"10px" }}>
              PixelPlot is open source. Review the smart contracts, frontend, and backend code on GitHub.
            </div>
            <a href="https://github.com/pixelplot" target="_blank" rel="noreferrer" style={{
              display:"flex", alignItems:"center", gap:"8px",
              padding:"12px", background:"#0d0a06", borderRadius:"8px",
              border:"1px solid #2a1e0a", textDecoration:"none",
              color:"#e8d5a3", fontSize:"10px",
            }}>
              <span style={{fontSize:"20px"}}>⌥</span>
              <div>
                <div style={{fontWeight:700}}>github.com/pixelplot</div>
                <div style={{fontSize:"9px",color:"#5a4020",marginTop:"2px"}}>Smart contracts · Frontend · Backend</div>
              </div>
            </a>
          </Section>
        </div>
      )}
    </div>
  );
}