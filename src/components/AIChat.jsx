import { useState, useRef, useEffect, useCallback } from "react";
import { parseCommand } from "../lib/aiCommands";
import { CONFIG } from "../lib/config";

export default function AIChat({ executeCommand, gameState }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hey! I'm your AI farming assistant. Type 'help' to see what I can do.", color: "#e8d5a3" }
  ]);
  const [input, setInput] = useState("");
  const [executing, setExecuting] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const addMessage = useCallback((role, text, color) => {
    setMessages(prev => [...prev, { role, text, color }]);
  }, []);

  const sendCommand = useCallback(async (msg) => {
    if (!msg || executing) return;

    addMessage("user", msg, "#f0c060");
    setExecuting(true);

    try {
      // Parse locally first for fallback
      const parsed = parseCommand(msg);

      // Try AI backend
      let aiResponse = null;
      try {
        const res = await fetch(`${CONFIG.BACKEND_URL}/api/ai-chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userAddress: gameState.walletAddress,
            message: msg,
            gameState: {
              level: gameState.level,
              energy: Math.floor(gameState.energy),
              activePlots: gameState.activePlots,
              inventory: gameState.inventory,
              gridSummary: gameState.gridSummary,
              exp: gameState.exp,
              pendingEarnings: gameState.pendingEarnings,
            },
          }),
        });

        if (res.ok) {
          aiResponse = await res.json();
        }
      } catch (fetchErr) {
        console.warn("AI backend unavailable, using local parser:", fetchErr.message);
      }

      // Use AI response if available, otherwise use local parser
      if (aiResponse) {
        addMessage("assistant", aiResponse.reply, "#e8d5a3");

        // Execute action if AI returned one
        if (aiResponse.action) {
          const results = await executeCommand(aiResponse.action, (progress) => {
            addMessage("assistant", progress, "#4a90d9");
          });
          if (results && results.length > 0) {
            for (const r of results) {
              addMessage("assistant", r.text, r.color);
            }
          }
        }
      } else {
        // Fallback: use local parser + executor
        const results = await executeCommand(parsed, (progress) => {
          addMessage("assistant", progress, "#4a90d9");
        });
        if (results && results.length > 0) {
          for (const r of results) {
            addMessage("assistant", r.text, r.color);
          }
        }
      }
    } catch (err) {
      addMessage("assistant", `Error: ${err.message}`, "#e04040");
    } finally {
      setExecuting(false);
    }
  }, [executing, gameState, executeCommand, addMessage]);

  const handleSend = useCallback(() => {
    const msg = input.trim();
    if (!msg || executing) return;
    setInput("");
    sendCommand(msg);
  }, [input, executing, sendCommand]);

  const quickCmd = useCallback((cmd) => {
    sendCommand(cmd);
  }, [sendCommand]);

  return (
    <>
      {/* Chat panel — above action bar */}
      {open && (
        <div style={{
          position: "fixed",
          bottom: "52px",
          left: 0,
          right: 0,
          zIndex: 45,
          display: "flex",
          justifyContent: "center",
          pointerEvents: "none",
        }}>
          <div style={{
            width: "100%",
            maxWidth: "480px",
            height: "45vh",
            minHeight: "280px",
            background: "#0d0a06",
            border: "1px solid #2a1e0a",
            borderRadius: "10px 10px 0 0",
            display: "flex",
            flexDirection: "column",
            pointerEvents: "auto",
            margin: "0 8px",
          }}>
          {/* Header */}
          <div style={{
            padding: "8px 12px",
            borderBottom: "1px solid #2a1e0a",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <span style={{ fontSize: "9px", letterSpacing: "2px", color: "#f0c060", fontWeight: 700 }}>
              PIXELPLOT AI
            </span>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: "none",
                border: "none",
                color: "#5a4020",
                cursor: "pointer",
                fontSize: "12px",
                fontFamily: "inherit",
                padding: "2px 4px",
              }}
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: "auto",
            padding: "8px 12px",
          }}>
            {messages.map((msg, i) => (
              <div key={i} style={{
                fontSize: "10px",
                fontFamily: "'Courier New', monospace",
                lineHeight: 1.7,
                color: msg.color || "#e8d5a3",
                padding: "2px 0",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}>
                {msg.role === "user" && (
                  <span style={{ color: "#f0c060", fontWeight: 700 }}>{"> "}</span>
                )}
                {msg.text}
              </div>
            ))}
            {executing && (
              <div style={{ fontSize: "10px", color: "#4a90d9", padding: "2px 0" }}>
                ⟳ Working...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input row */}
          <div style={{
            padding: "6px 8px",
            borderTop: "1px solid #2a1e0a",
            display: "flex",
            gap: "6px",
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSend()}
              placeholder="Type a command..."
              disabled={executing}
              style={{
                flex: 1,
                background: "#110e06",
                border: "1px solid #2a1e0a",
                borderRadius: "6px",
                padding: "6px 10px",
                color: "#e8d5a3",
                fontSize: "10px",
                fontFamily: "'Courier New', monospace",
                outline: "none",
              }}
            />
            <button
              onClick={handleSend}
              disabled={executing || !input.trim()}
              style={{
                background: executing || !input.trim() ? "#1a1206" : "#2a1f0a",
                border: "1px solid #f0c060",
                borderRadius: "6px",
                padding: "6px 12px",
                color: "#f0c060",
                fontSize: "9px",
                fontWeight: 700,
                cursor: executing || !input.trim() ? "default" : "pointer",
                fontFamily: "inherit",
                opacity: executing || !input.trim() ? 0.4 : 1,
              }}
            >
              Send
            </button>
          </div>

          {/* Quick action chips */}
          <div style={{
            padding: "4px 8px 8px",
            display: "flex",
            gap: "6px",
            justifyContent: "center",
            flexWrap: "wrap",
          }}>
            {[
              { label: "Status", cmd: "status" },
              { label: "Water All", cmd: "water all" },
              { label: "Harvest", cmd: "harvest all" },
              { label: "Plant Best", cmd: "plant best" },
              { label: "Help", cmd: "help" },
            ].map(chip => (
              <button
                key={chip.cmd}
                onClick={() => quickCmd(chip.cmd)}
                disabled={executing}
                style={{
                  background: "#2a1f0a",
                  border: "1px solid #f0c060",
                  borderRadius: "20px",
                  padding: "4px 10px",
                  color: "#f0c060",
                  fontSize: "8px",
                  fontWeight: 700,
                  cursor: executing ? "default" : "pointer",
                  fontFamily: "inherit",
                  opacity: executing ? 0.4 : 1,
                }}
              >
                {chip.label}
              </button>
            ))}
          </div>
          </div>
        </div>
      )}

      {/* Toggle button — fixed bottom-right, always on top */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: "fixed",
          bottom: "52px",
          right: "12px",
          zIndex: 46,
          background: "#110e07",
          border: "1px solid #f0c060",
          borderRadius: "8px 8px 0 0",
          padding: "6px 14px",
          color: "#f0c060",
          fontSize: "10px",
          fontWeight: 700,
          cursor: "pointer",
          fontFamily: "inherit",
          letterSpacing: "1px",
        }}
      >
        {open ? "▼ AI" : "🤖 AI"}
      </button>
    </>
  );
}
