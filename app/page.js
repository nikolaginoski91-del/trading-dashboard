"use client";
import { useState, useCallback } from "react";

const accentFor = (status) => status === "A+" ? "#80ff80" : status === "WATCHLIST" ? "#ffd770" : "rgba(255,255,255,0.3)";
const condColor = (c) => c === "TRENDING" ? "#80ff80" : c === "NEUTRAL" ? "#ffd770" : "#ff8080";

function loadHistory() {
  try { return JSON.parse(localStorage.getItem("aplusHistory") || "[]"); } catch { return []; }
}
function saveHistory(h) {
  try { localStorage.setItem("aplusHistory", JSON.stringify(h.slice(0, 100))); } catch {}
}

function HistoryPage({ onBack }) {
  const [history, setHistory] = useState(loadHistory());
  const clear = () => { localStorage.removeItem("aplusHistory"); setHistory([]); };
  return (
    <div style={{ background:"#0a0612", minHeight:"100vh", color:"#fff", fontFamily:"'Inter','SF Pro Display',sans-serif", maxWidth:480, margin:"0 auto", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:-100, right:-100, width:300, height:300, borderRadius:"50%", background:"radial-gradient(circle, rgba(120,80,255,0.3), transparent 70%)", filter:"blur(60px)" }}/>
      <div style={{ position:"relative", zIndex:1, padding:"24px 16px" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
          <button onClick={onBack} style={{ background:"rgba(255,255,255,0.04)", backdropFilter:"blur(20px)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:12, color:"rgba(255,255,255,0.6)", padding:"8px 14px", fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>← Back</button>
          <span style={{ fontSize:13, fontWeight:600, letterSpacing:2 }}>HISTORY</span>
          <button onClick={clear} style={{ background:"rgba(255,128,128,0.08)", backdropFilter:"blur(20px)", border:"1px solid rgba(255,128,128,0.2)", borderRadius:12, color:"#ff8080", padding:"8px 14px", fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>Clear</button>
        </div>
        {history.length === 0 ? (
          <div style={{ textAlign:"center", color:"rgba(255,255,255,0.3)", marginTop:80, fontSize:13, fontStyle:"italic" }}>No scans recorded yet</div>
        ) : history.map((h,i) => (
          <div key={i} style={{ background:"rgba(255,255,255,0.03)", backdropFilter:"blur(30px)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:18, padding:"14px 16px", marginBottom:10 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
              <span style={{ fontSize:10, color:"rgba(255,255,255,0.4)" }}>{h.time}</span>
              <span style={{ fontSize:10, color:condColor(h.marketCondition), letterSpacing:1 }}>{h.marketCondition}</span>
            </div>
            {h.trades?.map((t,j) => (
              <div key={j} style={{ display:"flex", justifyContent:"space-between", fontSize:12, padding:"5px 0", borderTop:j>0?"1px solid rgba(255,255,255,0.04)":"none" }}>
                <span style={{ width:60 }}>{t.symbol}</span>
                <span style={{ color:accentFor(t.status), width:80 }}>{t.status}</span>
                <span style={{ color:t.trendDir==="LONG"?"#80ff80":"#ff8080", width:50 }}>{t.trendDir}</span>
                <span>${t.entry}</span>
                <span style={{ color:"rgba(255,255,255,0.5)" }}>{t.prob}%</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function TickerCard({ t, expanded, onToggle }) {
  const isAplus = t.status === "A+";
  const isWatch = t.status === "WATCHLIST";
  const accent = accentFor(t.status);

  return (
    <div onClick={onToggle} style={{
      background:"rgba(255,255,255,0.03)",
      backdropFilter:"blur(30px)", WebkitBackdropFilter:"blur(30px)",
      border:"1px solid rgba(255,255,255,0.06)",
      borderRadius:20, padding:"16px 18px", marginBottom:10,
      cursor:"pointer",
      boxShadow: isAplus ? "0 0 30px rgba(128,255,128,0.08)" : isWatch ? "0 0 20px rgba(255,215,112,0.05)" : "none",
      transition:"all 0.3s ease",
    }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <div style={{ fontSize:18, fontWeight:600, letterSpacing:0.5 }}>{t.symbol}</div>
          <div style={{ display:"flex", gap:6, marginTop:4, alignItems:"center" }}>
            <span style={{ fontSize:10, fontWeight:600, color:accent, letterSpacing:1, background:`${accent}15`, padding:"2px 8px", borderRadius:20, border:`1px solid ${accent}30` }}>{t.status}</span>
            <span style={{ fontSize:10, color:t.trendDir==="LONG"?"#80ff80":"#ff8080" }}>● {t.trendDir}</span>
          </div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:20, fontWeight:300 }}>${t.price}</div>
          <div style={{ fontSize:11, color:accent, fontWeight:500 }}>{t.prob}%</div>
        </div>
      </div>
      <div style={{ marginTop:12, height:2, background:"rgba(255,255,255,0.05)", borderRadius:2, overflow:"hidden" }}>
        <div style={{ width:`${t.score}%`, height:"100%", background:`linear-gradient(90deg, ${accent}, ${accent}77)`, boxShadow:`0 0 8px ${accent}` }}/>
      </div>
      <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)", marginTop:5 }}>Score · {t.score}/100</div>

      {expanded && t.status !== "NO TRADE" && (
        <div style={{ marginTop:14, paddingTop:14, borderTop:"1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:12 }}>
            {[
              ["Entry", `$${t.entry}`, "#fff"],
              ["Stop", `$${t.sl}`, "#ff8080"],
              ["TP1", `$${t.tp1}`, "#80ff80"],
              ["TP2", `$${t.tp2}`, "#80ddff"],
            ].map(([l,v,col])=>(
              <div key={l} style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.05)", borderRadius:12, padding:"8px 4px", textAlign:"center" }}>
                <div style={{ fontSize:8, color:"rgba(255,255,255,0.4)", letterSpacing:1.5, marginBottom:3 }}>{l.toUpperCase()}</div>
                <div style={{ fontSize:13, color:col, fontWeight:600 }}>{v}</div>
              </div>
            ))}
          </div>

          <div style={{ padding:"10px 14px", background:"rgba(128,221,255,0.06)", border:"1px solid rgba(128,221,255,0.15)", borderRadius:14, marginBottom:12, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ fontSize:9, color:"rgba(128,221,255,0.7)", letterSpacing:2, marginBottom:2 }}>OPTION</div>
              <div style={{ fontSize:13, color:"#80ddff", fontWeight:500 }}>{t.option}</div>
            </div>
            <span style={{ fontSize:18 }}>✦</span>
          </div>

          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:9, color:"rgba(255,255,255,0.3)", letterSpacing:2, marginBottom:8 }}>INDICATORS</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
              {[
                [`VWAP $${t.vwap}`, t.aboveVWAP],
                [`RSI ${t.rsi}`, t.rsi>60||t.rsi<40],
                [`EMA9 $${t.ema9}`, t.trendDir==="LONG"?t.price>t.ema9:t.price<t.ema9],
                [`RVOL ${t.rvol}x`, t.rvol>=1.5],
                [`EMA20 $${t.ema20}`, t.emaAligned],
                ["Vol Spike", t.volSpike],
                [`ATR $${t.atr}`, true],
                [`15m ${t.trend15m}`, (t.trendDir==="LONG"&&t.trend15m==="BULLISH")||(t.trendDir==="SHORT"&&t.trend15m==="BEARISH")],
              ].map(([label,ok])=>(
                <div key={label} style={{ display:"flex", alignItems:"center", gap:6, background:ok?"rgba(128,255,128,0.05)":"rgba(255,128,128,0.04)", border:`1px solid ${ok?"rgba(128,255,128,0.1)":"rgba(255,128,128,0.08)"}`, borderRadius:8, padding:"6px 10px" }}>
                  <span style={{ fontSize:8, color:ok?"#80ff80":"#ff8080" }}>●</span>
                  <span style={{ fontSize:10, color:ok?"rgba(255,255,255,0.7)":"rgba(255,255,255,0.35)" }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background:"rgba(255,215,112,0.05)", border:"1px solid rgba(255,215,112,0.15)", borderRadius:14, padding:"10px 14px", marginBottom:10 }}>
            <div style={{ fontSize:9, color:"rgba(255,215,112,0.8)", letterSpacing:2, marginBottom:3 }}>1M ENTRY TRIGGER</div>
            <div style={{ fontSize:11, color:"#ffe88a", lineHeight:1.5 }}>{t.trigger1m}</div>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:8 }}>
            <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.05)", borderRadius:14, padding:"10px", textAlign:"center" }}>
              <div style={{ fontSize:8, color:"rgba(255,255,255,0.4)", letterSpacing:2, marginBottom:4 }}>ROOM</div>
              <div style={{ fontSize:22, fontWeight:300, color:t.room>=2?"#80ff80":"#ff8080" }}>{t.room}R</div>
            </div>
            <div style={{ background:"rgba(255,128,128,0.04)", border:"1px solid rgba(255,128,128,0.1)", borderRadius:14, padding:"10px 14px" }}>
              <div style={{ fontSize:8, color:"rgba(255,128,128,0.7)", letterSpacing:2, marginBottom:4 }}>RISK FACTOR</div>
              <div style={{ fontSize:10, color:"rgba(255,168,168,0.9)", lineHeight:1.5 }}>{t.whyFail}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [page, setPage] = useState("scanner");
  const [scanning, setScanning] = useState(false);
  const [data, setData] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  const runScan = useCallback(async () => {
    setScanning(true); setError(null); setExpanded(null); setProgress(0);
    const interval = setInterval(() => setProgress(p => Math.min(p + 2, 92)), 150);
    try {
      const res = await fetch("/api/scan");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setProgress(100);
      const aplusTrades = (json.tickers||[]).filter(t=>t.status==="A+");
      if (aplusTrades.length > 0) {
        const now = new Date();
        saveHistory([{ time:now.toLocaleString(), marketCondition:json.market.condition, allowedTrades:json.market.allowed, trades:aplusTrades.map(t=>({symbol:t.symbol,status:t.status,trendDir:t.trendDir,entry:t.entry,prob:t.prob})) }, ...loadHistory()]);
      }
    } catch(e) { setError(e.message); }
    finally { clearInterval(interval); setScanning(false); }
  }, []);

  if (page === "history") return <HistoryPage onBack={() => setPage("scanner")} />;

  const market = data?.market;
  const tickers = data?.tickers || [];
  const aplusCount = tickers.filter(t=>t.status==="A+").length;
  const scannedAt = data?.scannedAt ? new Date(data.scannedAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}) : null;

  return (
    <div style={{ background:"#0a0612", minHeight:"100vh", color:"#fff", fontFamily:"'Inter','SF Pro Display','-apple-system',sans-serif", maxWidth:480, margin:"0 auto", position:"relative", overflow:"hidden" }}>
      {/* Animated gradient orbs */}
      <div style={{ position:"absolute", top:-100, right:-100, width:300, height:300, borderRadius:"50%", background:"radial-gradient(circle, rgba(120,80,255,0.4), transparent 70%)", filter:"blur(60px)", pointerEvents:"none" }}/>
      <div style={{ position:"absolute", top:300, left:-150, width:400, height:400, borderRadius:"50%", background:"radial-gradient(circle, rgba(0,200,255,0.25), transparent 70%)", filter:"blur(80px)", pointerEvents:"none" }}/>
      <div style={{ position:"absolute", bottom:-100, right:-50, width:350, height:350, borderRadius:"50%", background:"radial-gradient(circle, rgba(255,80,180,0.18), transparent 70%)", filter:"blur(70px)", pointerEvents:"none" }}/>

      <div style={{ position:"relative", zIndex:1, padding:"24px 16px 80px" }}>
        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
          <div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", letterSpacing:6, marginBottom:6 }}>PREMIUM</div>
            <h1 style={{ fontSize:36, fontWeight:200, letterSpacing:-1, margin:0, lineHeight:1 }}>
              A+ <span style={{ fontWeight:800, background:"linear-gradient(135deg, #c79bff, #80ddff)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Scanner</span>
            </h1>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginTop:6, letterSpacing:1 }}>Institutional-grade options intelligence</div>
            {scannedAt && <div style={{ fontSize:10, color:"rgba(255,255,255,0.25)", marginTop:4, letterSpacing:1 }}>Last scan · {scannedAt}</div>}
          </div>
          <button onClick={()=>setPage("history")} style={{ background:"rgba(255,255,255,0.04)", backdropFilter:"blur(20px)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:12, color:"rgba(255,255,255,0.6)", padding:"10px 14px", fontSize:11, cursor:"pointer", fontFamily:"inherit", letterSpacing:1 }}>
            History
          </button>
        </div>

        {/* Scan button */}
        <button onClick={runScan} disabled={scanning} style={{
          width:"100%", padding:"18px", marginBottom:14,
          background:"linear-gradient(135deg, rgba(199,155,255,0.2), rgba(128,221,255,0.15))",
          backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)",
          border:"1px solid rgba(255,255,255,0.15)",
          borderRadius:18, color:"#fff",
          fontSize:14, fontWeight:500, letterSpacing:4,
          cursor:scanning?"not-allowed":"pointer", fontFamily:"inherit",
          boxShadow:"0 8px 32px rgba(199,155,255,0.15)",
          opacity:scanning?0.5:1, transition:"all 0.3s",
        }}>
          {scanning ? "Scanning markets..." : "✨  Scan Markets"}
        </button>

        {scanning && (
          <div style={{ background:"rgba(255,255,255,0.04)", borderRadius:4, height:2, marginBottom:14, overflow:"hidden" }}>
            <div style={{ height:"100%", background:"linear-gradient(90deg, #c79bff, #80ddff)", width:`${progress}%`, transition:"width 0.15s ease", boxShadow:"0 0 10px rgba(199,155,255,0.5)" }}/>
          </div>
        )}

        {error && (
          <div style={{ background:"rgba(255,128,128,0.06)", backdropFilter:"blur(20px)", border:"1px solid rgba(255,128,128,0.2)", borderRadius:14, padding:"12px 16px", marginBottom:14, color:"#ff8080", fontSize:11 }}>
            ⚠ Error · {error}
          </div>
        )}

        {market && (
          <>
            {/* Market regime card */}
            <div style={{ background:"rgba(255,255,255,0.04)", backdropFilter:"blur(40px)", WebkitBackdropFilter:"blur(40px)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:24, padding:"20px 22px", marginBottom:14, position:"relative", overflow:"hidden" }}>
              <div style={{ position:"absolute", top:0, left:0, right:0, height:1, background:"linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)" }}/>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)", letterSpacing:3, marginBottom:8 }}>MARKET REGIME</div>
                  <div style={{ fontSize:32, fontWeight:300, letterSpacing:-0.5 }}>{market.condition.charAt(0) + market.condition.slice(1).toLowerCase()}</div>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:6 }}>
                    <div style={{ width:6, height:6, borderRadius:"50%", background:condColor(market.condition), boxShadow:`0 0 10px ${condColor(market.condition)}` }}/>
                    <span style={{ fontSize:11, color:"rgba(255,255,255,0.6)" }}>{market.bias.charAt(0) + market.bias.slice(1).toLowerCase()} bias</span>
                  </div>
                </div>
                <div style={{ width:80, height:80, borderRadius:"50%", background:"linear-gradient(135deg, rgba(199,155,255,0.2), rgba(128,221,255,0.2))", display:"flex", alignItems:"center", justifyContent:"center", border:"1px solid rgba(255,255,255,0.1)" }}>
                  <div style={{ textAlign:"center" }}>
                    <div style={{ fontSize:32, fontWeight:300, lineHeight:1, background:"linear-gradient(135deg,#c79bff,#80ddff)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>{market.allowed}</div>
                    <div style={{ fontSize:8, color:"rgba(255,255,255,0.5)", letterSpacing:1.5 }}>TRADES</div>
                  </div>
                </div>
              </div>
            </div>

            {market.condition === "CHOPPY" && (
              <div style={{ textAlign:"center", padding:"30px 20px", background:"rgba(255,128,128,0.05)", backdropFilter:"blur(20px)", border:"1px solid rgba(255,128,128,0.15)", borderRadius:20, marginBottom:14 }}>
                <div style={{ fontSize:26, fontWeight:300, color:"#ff8080", letterSpacing:1 }}>No Trade Today</div>
                <div style={{ fontSize:12, color:"rgba(255,128,128,0.5)", marginTop:8, fontStyle:"italic" }}>Market is choppy — wait for clarity</div>
              </div>
            )}

            {market.condition !== "CHOPPY" && aplusCount > 0 && (
              <div style={{ background:"rgba(128,255,128,0.04)", backdropFilter:"blur(20px)", border:"1px solid rgba(128,255,128,0.15)", borderRadius:16, padding:"14px 18px", marginBottom:12, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ fontSize:9, color:"rgba(128,255,128,0.6)", letterSpacing:2, marginBottom:2 }}>SIGNAL DETECTED</div>
                  <div style={{ fontSize:14, color:"#80ff80", fontWeight:500 }}>{aplusCount} A+ setup{aplusCount>1?"s":""} found</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:9, color:"rgba(255,255,255,0.4)", letterSpacing:1 }}>MAX</div>
                  <div style={{ fontSize:22, fontWeight:300, color:"#80ff80" }}>{market.allowed}</div>
                </div>
              </div>
            )}

            {market.condition !== "CHOPPY" && aplusCount === 0 && (
              <div style={{ textAlign:"center", padding:"14px", background:"rgba(255,255,255,0.02)", backdropFilter:"blur(20px)", border:"1px solid rgba(255,255,255,0.05)", borderRadius:14, marginBottom:12 }}>
                <div style={{ fontSize:12, color:"rgba(255,255,255,0.4)", fontStyle:"italic" }}>No A+ setups · monitor watchlist only</div>
              </div>
            )}

            {tickers.map(t => (
              <TickerCard key={t.symbol} t={t} expanded={expanded===t.symbol} onToggle={()=>setExpanded(expanded===t.symbol?null:t.symbol)} />
            ))}
          </>
        )}

        {!data && !scanning && !error && (
          <div style={{ textAlign:"center", color:"rgba(255,255,255,0.2)", marginTop:80, fontSize:12, letterSpacing:2, fontStyle:"italic" }}>Tap Scan Markets to begin</div>
        )}
      </div>
    </div>
  );
}
