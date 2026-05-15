// src/App.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import { ethers } from "ethers";
import { useWallet }    from "./hooks/useWallet";
import { useSupabase }  from "./hooks/useSupabase";
import { useContracts } from "./hooks/useContracts";
import Farm        from "./components/Farm";
import Footer      from "./components/Footer";
import Docs        from "./components/Docs";
import AdminPanel  from "./components/AdminPanel";
import Market      from "./components/Market";
import Profile     from "./components/Profile";
import Leaderboard from "./components/Leaderboard";
import Levels      from "./components/Levels";
import { getLevelData, shortAddr } from "./lib/gameData";
import WalletModal from "./components/WalletModal";

const TABS = [
  { id:"FARM",        icon:"🌾" },
  { id:"MARKET",      icon:"🛒" },
  { id:"LEVELS",      icon:"⭐" },
  { id:"LEADERBOARD", icon:"🏆" },
  { id:"PROFILE",     icon:"👤" },
  { id:"DOCS",        icon:"📋" },
  { id:"ADMIN",       icon:"⚙️" },
];

export default function App() {
  const [tab, setTab]           = useState("FARM");
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [log, setLog]     = useState(["🌍 PixelPlot — Connect wallet to start!"]);

  const showToast = useCallback((msg, color = "#f0c060") => {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 2500);
  }, []);

  const addLog = useCallback((msg) => {
    setLog(prev => [msg, ...prev].slice(0, 7));
  }, []);

  // ── Hooks ──
  const {
    wallet, plotBalance, gameBalance,
    connecting, connect, disconnect, refreshBalances, addGameBalance,
    connectMetaMask, connectWalletConnect,
  } = useWallet();

  const {
    profile, leaderboard, lbLoading, savingProfile,
    loadProfile, refreshProfile, saveProfile,
    updateProfileLocal, loadLeaderboard, clearProfile,
  } = useSupabase();

  const {
    inventory, buyingSeeds, withdrawing,
    loadInventory, buySeeds, harvestOffChain,
    withdrawEarnings, spendSeed, spendSeedOnBackend,
  } = useContracts(wallet, showToast, addLog, refreshBalances);

  // ── Connect wallet ──
  const handleConnect = () => setShowWalletModal(true);

  const doConnect = async (type) => {
    setShowWalletModal(false);
    const w = type === "wc" ? await connectWalletConnect() : await connectMetaMask();
    if (!w) return;
    showToast(`✅ Connected: ${shortAddr(w.address)}`, "#4caf50");
    addLog(`🔗 Wallet connected: ${shortAddr(w.address)}`);
    await loadProfile(w.address);
    await loadInventory(w);
  };

  const handleDisconnect = () => {
    disconnect();
    clearProfile();
    showToast("Disconnected", "#5a4020");
  };

  // ── Level up watcher ──
  const prevLevelRef = useRef(1);
  useEffect(() => {
    if (!profile) return;
    const { cur } = getLevelData(profile.exp || 0);
    if (cur.level > prevLevelRef.current) {
      showToast(`🎉 LEVEL UP! Lv.${cur.level} — ${cur.title}`, "#f0c060");
      addLog(`🎉 LEVEL UP! Now Lv.${cur.level} — ${cur.title}`);
      prevLevelRef.current = cur.level;
    }
  }, [profile?.exp]);

  // ── Load leaderboard when tab opens ──
  useEffect(() => {
    if (tab === "LEADERBOARD") loadLeaderboard();
  }, [tab]);

  // ── Re-fetch inventory after plant (for rollback cases) ──
  const handleAfterPlant = useCallback(async () => {
    if (wallet) await loadInventory(wallet);
  }, [wallet, loadInventory]);

  // ── Harvest callback ──
  // After harvest, refresh profile from Supabase to get accurate pending_earnings
  const handleHarvest = useCallback(async (cropKey, earned, expGain, pendingEarnings) => {
    // Optimistic update first for instant UI feedback
    updateProfileLocal({
      exp:              (profile?.exp || 0) + expGain,
      total_harvested:  (profile?.total_harvested || 0) + 1,
      total_earned:     (profile?.total_earned || 0) + earned,
      pending_earnings: pendingEarnings,
    });
    // Then refresh from Supabase for accuracy
    if (wallet) await refreshProfile(wallet.address);
  }, [wallet, profile, updateProfileLocal, refreshProfile]);


  // Derived
  const exp = profile?.exp ?? 0;
  const { cur: levelData, next: nextLevel } = getLevelData(exp);
  const level   = levelData.level;
  const expPct  = nextLevel
    ? ((exp - levelData.expReq) / (nextLevel.expReq - levelData.expReq)) * 100
    : 100;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0d0a06",
      fontFamily: "'Courier New', monospace",
      color: "#e8d5a3",
      display: "flex",
      flexDirection: "column",
    }}>

      {/* Wallet Modal */}
      {showWalletModal && (
        <WalletModal
          connecting={connecting}
          onMetaMask={() => doConnect("metamask")}
          onWalletConnect={() => doConnect("wc")}
          onClose={() => setShowWalletModal(false)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position:"fixed", top:"12px", left:"50%", transform:"translateX(-50%)",
          background:"#1a1206", border:`1px solid ${toast.color}`,
          borderRadius:"20px", padding:"8px 20px", fontSize:"12px",
          color:toast.color, zIndex:999, whiteSpace:"nowrap",
          boxShadow:`0 4px 20px ${toast.color}40`, pointerEvents:"none",
          animation:"slideDown 0.2s ease",
        }}>{toast.msg}</div>
      )}

      {/* ── HEADER ── */}
      <div style={{ background:"#110e07", borderBottom:"1px solid #2a1e0a", padding:"10px 14px 8px" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: wallet ? "10px" : "0" }}>
          <div>
            <div style={{ fontSize:"8px", letterSpacing:"4px", color:"#5a4020" }}>BASE SEPOLIA</div>
            <div style={{ fontSize:"20px", fontWeight:900, color:"#f0c060", letterSpacing:"2px", textShadow:"0 0 16px #f0c06060" }}>
              🌾 PIXELPLOT
            </div>
          </div>

          {!wallet ? (
            <button onClick={handleConnect} disabled={connecting} style={{
              padding:"10px 16px", background:"#2a1f0a", border:"2px solid #f0c060",
              borderRadius:"20px", color:"#f0c060", cursor:"pointer",
              fontFamily:"inherit", fontSize:"11px", fontWeight:700,
              display:"flex", alignItems:"center", gap:"6px",
            }}>
              {connecting
                ? <><span style={{animation:"spin 0.8s linear infinite",display:"inline-block"}}>⟳</span> Connecting…</>
                : "🔗 Connect Wallet"}
            </button>
          ) : (
            <div style={{ display:"flex", gap:"10px", alignItems:"center" }}>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:"10px", color:"#f0c060", fontWeight:700 }}>
                  {profile?.avatar} {profile?.username || shortAddr(wallet.address)}
                </div>
                <div style={{ fontSize:"8px", color:"#5a4020" }}>Lv.{level} {levelData.title}</div>
              </div>
              <button onClick={handleDisconnect} style={{
                padding:"5px 10px", background:"transparent", border:"1px solid #3a2a10",
                borderRadius:"20px", color:"#5a4020", cursor:"pointer",
                fontFamily:"inherit", fontSize:"9px",
              }}>✕</button>
            </div>
          )}
        </div>

        {wallet && (
          <>
            <div style={{ display:"flex", gap:"14px", marginBottom:"8px" }}>
              {[
                { label:"$PLOT Wallet", val:parseFloat(ethers.formatEther(plotBalance)).toFixed(2), color:"#f0c060" },
                { label:"Pending",      val:profile?.pending_earnings || 0,                         color:"#4caf50" },
                { label:"Harvested",    val:profile?.total_harvested || 0,                          color:"#9c7adb" },
              ].map(s => (
                <div key={s.label} style={{ textAlign:"center" }}>
                  <div style={{ fontSize:"12px", fontWeight:900, color:s.color }}>{s.val}</div>
                  <div style={{ fontSize:"7px", color:"#5a4020" }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* EXP bar */}
            <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
              <span style={{ fontSize:"8px", color:"#5a4020", width:"50px", flexShrink:0 }}>⭐ {exp}</span>
              <div style={{ flex:1, height:"5px", background:"#1a1206", borderRadius:"3px", overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${expPct}%`, background:"#9c7adb", transition:"width 0.5s" }}/>
              </div>
              <span style={{ fontSize:"8px", color:"#3a2a10", flexShrink:0 }}>
                {nextLevel ? `Lv.${nextLevel.level}` : "MAX"}
              </span>
            </div>
          </>
        )}
      </div>
      {/* ── TABS ── */}
      <div style={{ display:"flex", background:"#110e07", borderBottom:"1px solid #2a1e0a", overflowX:"auto" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex:"0 0 auto", padding:"8px 14px", fontSize:"9px", letterSpacing:"1px",
            background:"transparent", border:"none",
            borderBottom:`2px solid ${tab===t.id?"#f0c060":"transparent"}`,
            color:tab===t.id?"#f0c060":"#5a4020",
            cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap",
          }}>{t.icon} {t.id}</button>
        ))}
      </div>

      {/* ── CONTENT ── */}
      <div style={{ flex:1, overflowY:"auto", padding:"12px", paddingBottom:tab==="FARM"?"80px":"12px" }}>

        {/* Landing */}
        {!wallet && tab === "FARM" && (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
            justifyContent:"center", padding:"60px 24px", textAlign:"center", gap:"16px" }}>
            <div style={{ fontSize:"52px" }}>🌾</div>
            <div style={{ fontSize:"18px", fontWeight:900, color:"#f0c060" }}>PIXELPLOT</div>
            <div style={{ fontSize:"11px", color:"#5a4020", lineHeight:2, maxWidth:"280px" }}>
              A Web3 farming game on Base. Buy seeds with $PLOT, grow crops,
              earn tokens, and climb the leaderboard.
            </div>
            <button onClick={handleConnect} disabled={connecting} style={{
              padding:"14px 28px", background:"#2a1f0a", border:"2px solid #f0c060",
              borderRadius:"24px", color:"#f0c060", cursor:"pointer",
              fontFamily:"inherit", fontSize:"13px", fontWeight:700,
            }}>
              {connecting ? "Connecting…" : "🔗 Connect Wallet to Play"}
            </button>
          </div>
        )}

        {tab === "FARM" && wallet && (
          <>
            <Farm
              wallet={wallet}
              profile={profile}
              inventory={inventory}
              showToast={showToast}
              addLog={addLog}
              spendSeed={spendSeed}
              spendSeedOnBackend={spendSeedOnBackend}
              onHarvest={handleHarvest}
              harvestOffChain={harvestOffChain}
              onAfterPlant={handleAfterPlant}
            />
            <div style={{ background:"#110e07", border:"1px solid #2a1e0a", borderRadius:"10px", padding:"12px", marginTop:"10px" }}>
              <div style={{ fontSize:"8px", letterSpacing:"3px", color:"#5a4020", marginBottom:"8px" }}>ACTIVITY LOG</div>
              {log.map((l, i) => (
                <div key={i} style={{ fontSize:"10px", padding:"4px 0",
                  color:i===0?"#e8d5a3":"#4a3a20", borderBottom:"1px solid #1a1206" }}>{l}</div>
              ))}
            </div>
          </>
        )}

        {tab === "MARKET" && (
          <Market wallet={wallet} profile={profile} inventory={inventory}
            buySeeds={buySeeds} buyingSeeds={buyingSeeds} />
        )}

        {tab === "LEVELS" && <Levels profile={profile} />}

        {tab === "LEADERBOARD" && (
          <Leaderboard wallet={wallet} leaderboard={leaderboard}
            lbLoading={lbLoading} loadLeaderboard={loadLeaderboard} />
        )}

        {tab === "DOCS" && <Docs />}

        {tab === "ADMIN" && <AdminPanel wallet={wallet} />}

        {tab === "PROFILE" && (
          <Profile
            wallet={wallet} profile={profile} inventory={inventory}
            plotBalance={plotBalance} gameBalance={gameBalance}
            saveProfile={saveProfile} savingProfile={savingProfile}
            withdrawEarnings={() => withdrawEarnings()} withdrawing={withdrawing}
          />
        )}
      </div>

      <Footer />

      <style>{`
        @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes spin     { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes slideDown{ from{opacity:0;transform:translateX(-50%) translateY(-10px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-thumb { background:#2a1e0a; border-radius:2px; }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}