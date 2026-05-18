// src/components/Leaderboard.jsx
import { useEffect } from "react";
import { getLevelData, shortAddr } from "../lib/gameData";

export default function Leaderboard({ wallet, leaderboard, lbLoading, loadLeaderboard }) {
  useEffect(() => { loadLeaderboard(); }, []);

  const medals = ["🥇","🥈","🥉"];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
      <div style={{ background:"#110e07", border:"1px solid #2a1e0a", borderRadius:"10px", padding:"12px",
        display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ fontSize:"11px", color:"#8a7050" }}>Top farmers · Base Mainnet</div>
        <button onClick={loadLeaderboard} style={{
          padding:"5px 12px", background:"transparent", border:"1px solid #2a1e0a",
          borderRadius:"20px", color:"#5a4020", cursor:"pointer", fontFamily:"inherit", fontSize:"9px",
        }}>↻ Refresh</button>
      </div>

      {lbLoading ? (
        <div style={{ textAlign:"center", padding:"40px", color:"#5a4020", fontSize:"24px" }}>⟳</div>
      ) : leaderboard.length === 0 ? (
        <div style={{ background:"#110e07", border:"1px solid #2a1e0a", borderRadius:"10px",
          padding:"40px", textAlign:"center" }}>
          <div style={{ fontSize:"11px", color:"#5a4020" }}>No players yet. Be the first!</div>
        </div>
      ) : (
        leaderboard.map((p, i) => {
          const { cur: lv } = getLevelData(p.exp);
          const isMe = wallet && p.wallet === wallet.address.toLowerCase();
          return (
            <div key={p.wallet} style={{
              padding:"12px 14px", borderRadius:"10px",
              background: isMe ? "#2a1f0a" : "#110e07",
              border:`1px solid ${isMe?"#f0c060":"#2a1e0a"}`,
              display:"flex", alignItems:"center", gap:"12px",
            }}>
              <div style={{ fontSize:"18px", width:"24px", textAlign:"center", flexShrink:0 }}>
                {i < 3 ? medals[i] : `${i+1}`}
              </div>
              <div style={{
                width:"40px", height:"40px", borderRadius:"50%",
                background:"#1a1206", border:"1px solid #3a2a10",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:p.avatar?.startsWith("http")?"0":"22px", overflow:"hidden", flexShrink:0,
              }}>
                {p.avatar?.startsWith("http")
                  ? <img src={p.avatar} alt="av" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                  : p.avatar || "🧑‍🌾"}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:"12px", color:isMe?"#f0c060":"#e8d5a3", fontWeight:700,
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {p.username || shortAddr(p.wallet)} {isMe && <span style={{color:"#f0c060"}}>(you)</span>}
                </div>
                <div style={{ fontSize:"9px", color:"#5a4020", marginTop:"2px" }}>
                  Lv.{lv.level} {lv.title} · {p.total_harvested} harvests
                </div>
              </div>
              <div style={{ textAlign:"right", flexShrink:0 }}>
                <div style={{ fontSize:"12px", color:"#9c7adb", fontWeight:700 }}>{p.exp} xp</div>
                <div style={{ fontSize:"9px", color:"#4caf50" }}>{p.total_earned} $</div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
