"use client";
import { useState, useCallback } from "react";

const statusColor = (s) => s === "A+" ? "#00ff88" : s === "WATCHLIST" ? "#f5c518" : "#555";
const statusBg = (s) => s === "A+" ? "rgba(0,255,136,0.07)" : s === "WATCHLIST" ? "rgba(245,197,24,0.07)" : "rgba(255,255,255,0.02)";
const condColor = (c) => c === "TRENDING" ? "#00ff88" : c === "NEUTRAL" ? "#f5c518" : "#ff4444";
const dirColor = (d) => d === "LONG" ? "#00ff88" : "#ff4444";

function loadHistory() {
  try { return JSON.parse(localStorage.getItem("aplusHistory") || "[]"); } catch { return []; }
}
function saveHistory(h) {
  try { localStorage.setItem("aplusHistory", JSON.stringify(h.slice(0, 100))); } catch {}
}

function MarketBadge({ market }) {
  return (
    <div style={{ background:"rgba(255,255,255,0.03)", border:`1px solid ${condColor(market.condition)}33`, borderRadius:12, padding:"14px 18px", marginBottom:16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <div style={{ fontSize:10, color:"#555", letterSpacing:2, marginBottom:4 }}>MARKET REGIME</div>
          <div style={{ fontSize:22, fontWeight:700, color:condColor(market.condition), letterSpacing:1 }}>{market.condition}</div>
          <div style={{ fontSize:11, color:"#666", marginTop:2 }}>Bias: {market.bias}</div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:10, color:"#555", letterSpacing:2, marginBottom:4 }}>ALLOWED</div>
          <div style={{ fontSize:38, fontWeight:800, color:condColor(market.condition), lineHeight:1 }}>{market.allowed}</div>
          <div style={{ fontSize:10, color:"#444" }}>trades</div>
        </div>
      </div>
    </div>
  );
}

function TickerCard({ t, expanded, onToggle }) {
  return (
    <div onClick={onToggle} style={{ background:statusBg(t.status), border:`1px solid ${statusColor(t.status)}22`, borderLeft:`3px solid ${statusColor(t.status)}`, borderRadius:10, padding:"12px 14px", marginBottom:8, cursor:"pointer" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:15, fontWeight:700, color:"#fff" }}>{t.symbol}</span>
          <span style={{ fontSize:10, fontWeight:700, color:statusColor(t.status), border:`1px solid ${statusColor(t.status)}44`, borderRadius:4, padding:"2px 6px", letterSpacing:1 }}>{t.status}</span>
          <span style={{ fontSize:10, color:dirColor(t.trendDir), fontWeight:600 }}>{t.trendDir}</span>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:15, fontWeight:700, color:"#fff" }}>${t.price}</div>
          <div style={{ fontSize:10, color:statusColor(t.status) }}>{t.prob}%</div>
        </div>
      </div>
      <div style={{ marginTop:8, background:"rgba(255,255,255,0.05)", borderRadius:3, height:3 }}>
        <div style={{ width:`${t.score}%`, height:"100%", borderRadius:3, background:`linear-gradient(90deg,${statusColor(t.status)},${statusColor(t.status)}66)` }} />
      </div>
      <div style={{ fontSize:10, color:"#444", marginTop:3 }}>Score: {t.score}/100</div>

      {expanded && t.status !== "NO TRADE" && (
        <div style={{ marginTop:12, borderTop:"1px solid rgba(255,255,255,0.06)", paddingTop:12 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:6, marginBottom:12 }}>
            {[{label:"ENTRY",val:`$${t.entry}`,color:"#fff"},{label:"STOP",val:`$${t.sl}`,color:"#ff4444"},{label:"TP1",val:`$${t.tp1}`,color:"#00ff88"},{label:"TP2",val:`$${t.tp2}`,color:"#00ffcc"}].map(({label,val,color})=>(
              <div key={label} style={{ background:"rgba(255,255,255,0.04)", borderRadius:6, padding:"6px 4px", textAlign:"center" }}>
                <div style={{ fontSize:8, color:"#444", letterSpacing:1 }}>{label}</div>
                <div style={{ fontSize:12, fontWeight:700, color }}>{val}</div>
              </div>
            ))}
          </div>

          <div style={{ background:"rgba(0,200,255,0.06)", border:"1px solid rgba(0,200,255,0.15)", borderRadius:6, padding:"7px 10px", marginBottom:10 }}>
            <div style={{ fontSize:9, color:"#0af", letterSpacing:1, marginBottom:2 }}>OPTION</div>
            <div style={{ fontSize:13, fontWeight:600, color:"#cef" }}>{t.option}</div>
          </div>

          <div style={{ marginBottom:10 }}>
            <div style={{ fontSize:9, color:"#444", letterSpacing:1, marginBottom:6 }}>INDICATORS</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
              {[
                {label:`VWAP $${t.vwap}`,ok:t.aboveVWAP},
                {label:`EMA9 $${t.ema9}`,ok:t.trendDir==="LONG"?t.price>t.ema9:t.price<t.ema9},
                {label:`EMA20 $${t.ema20}`,ok:t.emaAligned},
                {label:`ATR $${t.atr}`,ok:true},
                {label:`RSI ${t.rsi}`,ok:t.rsi>60||t.rsi<40},
                {label:`RVOL ${t.rvol}x`,ok:t.rvol>=1.5},
                {label:"VOL SPIKE",ok:t.volSpike},
                {label:`15m ${t.trend15m}`,ok:(t.trendDir==="LONG"&&t.trend15m==="BULLISH")||(t.trendDir==="SHORT"&&t.trend15m==="BEARISH")},
              ].map(({label,ok})=>(
                <span key={label} style={{ fontSize:10, padding:"3px 6px", borderRadius:4, background:ok?"rgba(0,255,136,0.1)":"rgba(255,68,68,0.1)", color:ok?"#00ff88":"#ff6666", border:`1px solid ${ok?"#00ff8833":"#ff444433"}` }}>{ok?"✓":"✗"} {label}</span>
              ))}
            </div>
          </div>

          <div style={{ background:"rgba(255,200,0,0.06)", border:"1px solid rgba(255,200,0,0.15)", borderRadius:6, padding:"7px 10px", marginBottom:8 }}>
            <div style={{ fontSize:9, color:"#fc0", letterSpacing:1, marginBottom:2 }}>1M TRIGGER</div>
            <div style={{ fontSize:11, color:"#ffe" }}>{t.trigger1m}</div>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            <div style={{ background:"rgba(255,255,255,0.03)", borderRadius:6, padding:"7px 10px" }}>
              <div style={{ fontSize:9, color:"#444", letterSpacing:1, marginBottom:2 }}>ROOM</div>
              <div style={{ fontSize:14, fontWeight:700, color:t.room>=2?"#00ff88":"#ff4444" }}>{t.room}R</div>
            </div>
            <div style={{ background:"rgba(255,68,68,0.05)", border:"1px solid rgba(255,68,68,0.15)", borderRadius:6, padding:"7px 10px" }}>
              <div style={{ fontSize:9, color:"#f44", letterSpacing:1, marginBottom:2 }}>WHY FAIL</div>
              <div style={{ fontSize:10, color:"#faa" }}>{t.whyFail}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HistoryPage({ onBack }) {
  const [history, setHistory] = useState(loadHistory());
  const clear = () => { localStorage.removeItem("aplusHistory"); setHistory([]); };
  return (
    <div style={{ maxWidth:480, margin:"0 auto", padding:"16px 12px", fontFamily:"'SF Mono','Fira Code','Courier New',monospace" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
        <button onClick={onBack} style={{ background:"none", border:"1px solid #333", borderRadius:6, color:"#aaa", padding:"6px 12px", fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>← Back</button>
        <span style={{ fontSize:14, fontWeight:600, color:"#fff" }}>Scan History</span>
        <button onClick={clear} style={{ background:"none", border:"1px solid #ff444444", borderRadius:6, color:"#f44", padding:"6px 12px", fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>Clear</button>
      </div>
      {history.length === 0 ? (
        <div style={{ textAlign:"center", color:"#444", marginTop:60, fontSize:13 }}>No history yet</div>
      ) : history.map((h,i) => (
        <div key={i} style={{ background:"rgba(255,255,255,0.03)", border:"1px solid #1a1a1a", borderRadius:8, padding:"10px 12px", marginBottom:8 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
            <span style={{ fontSize:10, color:"#444" }}>{h.time}</span>
            <span style={{ fontSize:10, color:condColor(h.marketCondition) }}>{h.marketCondition} · {h.allowedTrades} allowed</span>
          </div>
          {h.trades?.map((t,j) => (
            <div key={j} style={{ display:"flex", justifyContent:"space-between", fontSize:11, padding:"3px 0", borderTop:j>0?"1px solid #111":"none" }}>
              <span style={{ color:"#aaa", width:50 }}>{t.symbol}</span>
              <span style={{ color:statusColor(t.status), width:70 }}>{t.status}</span>
              <span style={{ color:dirColor(t.trendDir), width:40 }}>{t.trendDir}</span>
              <span style={{ color:"#fff", width:55 }}>${t.entry}</span>
              <span style={{ color:"#666" }}>{t.prob}%</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const [page, setPage] = useState("scanner");
  const [scanning, setScanning] = useState(false);
  const [data, setData] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [error, setError] = useState(null);

  const runScan = useCallback(async () => {
    setScanning(true); setError(null); setExpanded(null);
    try {
      const res = await fetch("/api/scan");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      const aplusTrades = (json.tickers||[]).filter(t=>t.status==="A+");
      if (aplusTrades.length > 0) {
        const now = new Date();
        saveHistory([{ time:now.toLocaleString(), marketCondition:json.market.condition, allowedTrades:json.market.allowed, trades:aplusTrades.map(t=>({symbol:t.symbol,status:t.status,trendDir:t.trendDir,entry:t.entry,prob:t.prob})) }, ...loadHistory()]);
      }
    } catch(e) { setError(e.message); }
    finally { setScanning(false); }
  }, []);

  if (page === "history") return <HistoryPage onBack={() => setPage("scanner")} />;

  const market = data?.market;
  const tickers = data?.tickers || [];
  const aplusCount = tickers.filter(t=>t.status==="A+").length;
  const scannedAt = data?.scannedAt ? new Date(data.scannedAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}) : null;

  return (
    <div style={{ minHeight:"100vh", background:"#0a0a0a", color:"#fff", fontFamily:"'SF Mono','Fira Code','Courier New',monospace", maxWidth:480, margin:"0 auto" }}>
      <div style={{ padding:"16px 16px 12px", borderBottom:"1px solid #111", marginBottom:16 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <div style={{ fontSize:18, fontWeight:800, letterSpacing:2, color:"#00ff88" }}>A+ SCANNER</div>
            <div style={{ fontSize:10, color:"#333", letterSpacing:1 }}>IBKR OPTIONS · DAILY · LIVE</div>
          </div>
          <button onClick={()=>setPage("history")} style={{ background:"none", border:"1px solid #222", borderRadius:6, color:"#555", padding:"6px 10px", fontSize:11, cursor:"pointer", fontFamily:"inherit", letterSpacing:1 }}>HISTORY</button>
        </div>
        {scannedAt && <div style={{ fontSize:10, color:"#2a2a2a", marginTop:6 }}>Last scan: {scannedAt}</div>}
      </div>

      <div style={{ padding:"0 12px 80px" }}>
        <button onClick={runScan} disabled={scanning} style={{ width:"100%", padding:"16px", background:scanning?"rgba(0,255,136,0.04)":"rgba(0,255,136,0.1)", border:`1px solid ${scanning?"#00ff8822":"#00ff88"}`, borderRadius:10, color:scanning?"#00ff8844":"#00ff88", fontSize:15, fontWeight:700, letterSpacing:3, cursor:scanning?"not-allowed":"pointer", marginBottom:16, fontFamily:"inherit" }}>
          {scanning ? "SCANNING..." : "▶ SCAN NOW"}
        </button>

        {scanning && (
          <div style={{ background:"#111", borderRadius:3, height:3, marginBottom:16, overflow:"hidden" }}>
            <div style={{ height:"100%", background:"#00ff88", borderRadius:3, animation:"load 8s linear forwards" }} />
          </div>
        )}

        {error && <div style={{ background:"rgba(255,68,68,0.08)", border:"1px solid #ff444433", borderRadius:8, padding:"12px 14px", marginBottom:16, color:"#ff6666", fontSize:12 }}>⚠ {error}</div>}

        {market && (
          <>
            <MarketBadge market={market} />
            {market.condition === "CHOPPY" && (
              <div style={{ textAlign:"center", padding:"24px 16px", background:"rgba(255,68,68,0.05)", border:"1px solid #ff444422", borderRadius:10, marginBottom:16 }}>
                <div style={{ fontSize:22, fontWeight:800, color:"#ff4444", letterSpacing:2 }}>NO TRADE TODAY</div>
                <div style={{ fontSize:12, color:"#555", marginTop:6 }}>Market choppy. Wait for clarity.</div>
              </div>
            )}
            {market.condition !== "CHOPPY" && aplusCount > 0 && (
              <div style={{ background:"rgba(0,255,136,0.05)", border:"1px solid #00ff8822", borderRadius:8, padding:"10px 14px", marginBottom:14, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontSize:12, color:"#00ff88", fontWeight:600 }}>{aplusCount} A+ SETUP{aplusCount>1?"S":""}</span>
                <span style={{ fontSize:11, color:"#444" }}>Max {market.allowed} trades</span>
              </div>
            )}
            {market.condition !== "CHOPPY" && aplusCount === 0 && (
              <div style={{ textAlign:"center", padding:"14px", background:"rgba(255,255,255,0.02)", border:"1px solid #1a1a1a", borderRadius:8, marginBottom:14 }}>
                <div style={{ fontSize:12, color:"#555" }}>No A+ setups — monitor Watchlist only</div>
              </div>
            )}
            {tickers.map(t => (
              <TickerCard key={t.symbol} t={t} expanded={expanded===t.symbol} onToggle={()=>setExpanded(expanded===t.symbol?null:t.symbol)} />
            ))}
          </>
        )}

        {!data && !scanning && !error && (
          <div style={{ textAlign:"center", color:"#222", marginTop:60, fontSize:13, letterSpacing:1 }}>Press SCAN NOW to start</div>
        )}
      </div>
      <style>{`@keyframes load{from{width:0%}to{width:95%}}`}</style>
    </div>
  );
}