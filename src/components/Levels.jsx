// src/components/Levels.jsx
import { LEVELS, CROPS, getLevelData, getSellBonus } from "../lib/gameData";

export default function Levels({ profile }) {
  const exp       = profile?.exp ?? 0;
  const { cur, next } = getLevelData(exp);
  const level     = cur.level;
  const sellBonus = getSellBonus(level);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>

      {/* Current level summary */}
      <div style={{ background:"#110e07", border:"1px solid #2a1e0a", borderRadius:"10px", padding:"14px" }}>
        <div style={{ display:"flex", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:"13px", color:"#f0c060", fontWeight:700 }}>Lv.{level} — {cur.title}</div>
            <div style={{ fontSize:"9px", color:"#5a4020", marginTop:"4px" }}>Total EXP: {exp}</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:"13px", color:"#4caf50", fontWeight:700 }}>+{Math.round((sellBonus-1)*100)}% sell</div>
            <div style={{ fontSize:"9px", color:"#5a4020", marginTop:"4px" }}>{cur.plots} plots active</div>
          </div>
        </div>
        {next && (
          <div style={{ marginTop:"10px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"4px", fontSize:"9px", color:"#5a4020" }}>
              <span>Progress to Lv.{next.level}</span>
              <span>{exp - cur.expReq} / {next.expReq - cur.expReq} EXP</span>
            </div>
            <div style={{ height:"6px", background:"#1a1206", borderRadius:"3px", overflow:"hidden" }}>
              <div style={{ height:"100%", background:"#9c7adb", borderRadius:"3px",
                width:`${((exp - cur.expReq) / (next.expReq - cur.expReq)) * 100}%`,
                transition:"width 0.5s" }}/>
            </div>
          </div>
        )}
      </div>

      {/* Level list */}
      {LEVELS.map(lv => {
        const reached = exp >= lv.expReq;
        const isCur   = lv.level === level;
        return (
          <div key={lv.level} style={{
            padding:"12px 14px", borderRadius:"10px",
            background: isCur?"#2a1f0a": reached?"#161206":"#110e07",
            border:`1px solid ${isCur?"#f0c060":reached?"#3a3010":"#2a1e0a"}`,
            display:"flex", alignItems:"center", gap:"12px",
          }}>
            <div style={{
              width:"38px", height:"38px", borderRadius:"50%", flexShrink:0,
              background: isCur?"#f0c060": reached?"#3a3010":"#1a1206",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:"14px", fontWeight:900,
              color: isCur?"#0d0a06": reached?"#8a8030":"#3a2a10",
            }}>{lv.level}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:"12px", color:isCur?"#f0c060":reached?"#8a8050":"#4a3a20", fontWeight:700 }}>
                {lv.title} {isCur && "← YOU"}
              </div>
              <div style={{ fontSize:"9px", color:"#4a3a20", marginTop:"3px", lineHeight:1.7 }}>
                {lv.bonus} · {lv.plots} plots · {lv.expReq} EXP
              </div>
            </div>
            <div style={{ flexShrink:0, fontSize:"12px" }}>
              {reached && !isCur
                ? "✅"
                : !reached
                ? <span style={{fontSize:"9px",color:"#3a2a10"}}>{lv.expReq-exp} xp</span>
                : null}
            </div>
          </div>
        );
      })}

      {/* Crop unlock table */}
      <div style={{ background:"#110e07", border:"1px solid #2a1e0a", borderRadius:"10px", padding:"14px" }}>
        <div style={{ fontSize:"8px", letterSpacing:"3px", color:"#5a4020", marginBottom:"12px" }}>CROP UNLOCK TABLE</div>
        {Object.entries(CROPS).map(([key, c]) => {
          const unlocked = c.unlockLevel <= level;
          return (
            <div key={key} style={{
              display:"flex", alignItems:"center", gap:"10px",
              padding:"8px 0", borderBottom:"1px solid #1a1206",
              opacity: unlocked ? 1 : 0.4,
            }}>
              <div style={{ fontSize:"20px", width:"28px", textAlign:"center" }}>
                {unlocked ? c.emoji : "🔒"}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:"10px", color:unlocked?c.color:"#3a2a10" }}>
                  {c.name} <span style={{color:"#3a2a10",fontSize:"8px"}}>Lv.{c.unlockLevel}</span>
                </div>
                <div style={{ fontSize:"9px", color:"#4a3a20", marginTop:"2px" }}>
                  Profit +{c.sellPrice-c.seedCost}$ · {c.exp}xp · Grow {c.growTime}s
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
