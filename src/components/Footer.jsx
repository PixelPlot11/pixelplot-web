// src/components/Footer.jsx
// Social links + docs links

const LINKS = {
    twitter:     "https://x.com/pixelplot",       // ganti dengan link X lo
    github:      "https://github.com/pixelplot",  // ganti dengan repo lo
    tokenomics:  "#tokenomics",                   // ganti dengan link doc
    whitepaper:  "#whitepaper",                   // ganti dengan link doc
    basescan_token: "https://basescan.org/address/0x7ef06DD6737F33C86a6f67f91CdF80CeCc101BA3",
    basescan_game:  "https://basescan.org/address/0x61D509A6966077FedfF1142a05a8045f82506061",
  };
  
  export default function Footer() {
    const link = (href, label, icon) => (
      <a href={href} target="_blank" rel="noreferrer" style={{
        display:"flex", alignItems:"center", gap:"5px",
        fontSize:"9px", color:"#5a4020", letterSpacing:"1px",
        textDecoration:"none", padding:"5px 10px",
        border:"1px solid #2a1e0a", borderRadius:"20px",
        transition:"all 0.15s", whiteSpace:"nowrap",
      }}
        onMouseEnter={e=>{ e.currentTarget.style.color="#f0c060"; e.currentTarget.style.borderColor="#f0c060"; }}
        onMouseLeave={e=>{ e.currentTarget.style.color="#5a4020"; e.currentTarget.style.borderColor="#2a1e0a"; }}
      >
        <span>{icon}</span> {label}
      </a>
    );
  
    return (
      <div style={{
        background:"#110e07", borderTop:"1px solid #2a1e0a",
        padding:"12px 16px",
      }}>
        {/* Links row */}
        <div style={{ display:"flex", flexWrap:"wrap", gap:"6px", justifyContent:"center", marginBottom:"10px" }}>
          {link(LINKS.twitter,    "Twitter / X",   "𝕏")}
          {link(LINKS.github,     "GitHub",        "⌥")}
          {link(LINKS.tokenomics, "Tokenomics",    "📊")}
          {link(LINKS.whitepaper, "Whitepaper",    "📄")}
          {link(LINKS.basescan_token, "$PLOT Contract", "🔗")}
          {link(LINKS.basescan_game,  "Game Contract",  "🔗")}
        </div>
  
        {/* Disclaimer */}
        <div style={{ fontSize:"8px", color:"#3a2a10", textAlign:"center", lineHeight:1.8 }}>
          PixelPlot is a Web3 farming game on Base Mainnet. $PLOT tokens have real value.
          <br/>
          Smart contracts are open source and verified on BaseScan. DYOR.
        </div>
      </div>
    );
  }