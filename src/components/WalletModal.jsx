// src/components/WalletModal.jsx
export default function WalletModal({ onMetaMask, onWalletConnect, onClose, connecting }) {
  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,0.85)",
      zIndex:100, display:"flex", alignItems:"flex-end",
    }} onClick={onClose}>
      <div style={{
        width:"100%", background:"#110e07",
        border:"1px solid #2a1e0a", borderRadius:"16px 16px 0 0",
        padding:"20px 16px 32px",
      }} onClick={e => e.stopPropagation()}>

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"16px" }}>
          <div style={{ fontSize:"11px", color:"#f0c060", fontWeight:700, letterSpacing:"2px" }}>
            CONNECT WALLET
          </div>
          <button onClick={onClose} style={{
            background:"transparent", border:"none", color:"#5a4020",
            fontSize:"16px", cursor:"pointer", padding:"4px",
          }}>✕</button>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
          {/* MetaMask */}
          <button onClick={onMetaMask} disabled={connecting} style={{
            display:"flex", alignItems:"center", gap:"14px",
            padding:"14px 16px", background:"#1a1206",
            border:"1px solid #3a2a10", borderRadius:"10px",
            cursor:"pointer", fontFamily:"inherit", width:"100%",
            transition:"border-color 0.15s",
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor="#f0c060"}
            onMouseLeave={e => e.currentTarget.style.borderColor="#3a2a10"}
          >
            <div style={{ fontSize:"28px" }}>🦊</div>
            <div style={{ textAlign:"left" }}>
              <div style={{ fontSize:"12px", color:"#e8d5a3", fontWeight:700 }}>MetaMask</div>
              <div style={{ fontSize:"9px", color:"#5a4020", marginTop:"2px" }}>
                Browser extension wallet
              </div>
            </div>
          </button>

          {/* WalletConnect */}
          <button onClick={onWalletConnect} disabled={connecting} style={{
            display:"flex", alignItems:"center", gap:"14px",
            padding:"14px 16px", background:"#1a1206",
            border:"1px solid #3a2a10", borderRadius:"10px",
            cursor:"pointer", fontFamily:"inherit", width:"100%",
            transition:"border-color 0.15s",
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor="#4a90d9"}
            onMouseLeave={e => e.currentTarget.style.borderColor="#3a2a10"}
          >
            <div style={{ fontSize:"28px" }}>📱</div>
            <div style={{ textAlign:"left" }}>
              <div style={{ fontSize:"12px", color:"#e8d5a3", fontWeight:700 }}>WalletConnect</div>
              <div style={{ fontSize:"9px", color:"#5a4020", marginTop:"2px" }}>
                Bitget, OKX, Trust, Coinbase & 300+ wallets
              </div>
            </div>
          </button>
        </div>

        <div style={{ fontSize:"9px", color:"#3a2a10", textAlign:"center", marginTop:"14px", lineHeight:1.8 }}>
          Connect to Base Sepolia Testnet.<br/>
          Make sure your wallet supports Base network.
        </div>
      </div>
    </div>
  );
}
