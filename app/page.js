"use client";
import { useState, useCallback, useMemo } from "react";

const accentFor = (s) => s === "A+" ? "#80ff80" : s === "WATCHLIST" ? "#ffd770" : "rgba(255,255,255,0.3)";
const condColor = (c) => c === "TRENDING" ? "#80ff80" : c === "NEUTRAL" ? "#ffd770" : "#ff8080";

function loadHistory() { try { return JSON.parse(localStorage.getItem("aplusHistory") || "[]"); } catch { return []; } }
function saveHistory(h) { try { localStorage.setItem("aplusHistory", JSON.stringify(h.slice(0, 100))); } catch {} }
function loadTrades() { try { return JSON.parse(localStorage.getItem("aplusTrades") || "[]"); } catch { return []; } }
function saveTrades(t) { try { localStorage.setItem("aplusTrades", JSON.stringify(t.slice(0, 500))); } catch {} }

function Orbs() {
  return (
    <>
      <div style={{ position:"absolute", top:-100, right:-100, width:300, height:300, borderRadius:"50%", background:"radial-gradient(circle, rgba(120,80,255,0.4), transparent 70%)", filter:"blur(60px)", pointerEvents:"none" }}/>
      <div style={{ position:"absolute", top:300, left:-150, width:400, height:400, borderRadius:"50%", background:"radial-gradient(circle, rgba(0,200,255,0.25), transparent 70%)", filter:"blur(80px)", pointerEvents:"none" }}/>
      <div style={{ position:"absolute", bottom:-100, right:-50, width:350, height:350, borderRadius:"50%", background:"radial-gradient(circle, rgba(255,80,180,0.18), transparent 70%)", filter:"blur(70px)", pointerEvents:"none" }}/>
    </>
  );
}

function calcStats(trades) {
  const closed = trades.filter(t => t.result && t.result !== "OPEN");
  const wins = closed.filter(t => t.result === "WIN_TP1" || t.result === "WIN_TP2");
  const losses = closed.filter(t => t.result === "LOSS");
  const totalR = closed.reduce((sum, t) => {
    if (t.result === "WIN_TP1") return sum + 1;
    if (t.result === "WIN_TP2") return sum + 2;
    if (t.result === "LOSS") return sum - 1;
    if (t.result === "MANUAL" && t.manualR) return sum + Number(t.manualR);
    return sum;
  }, 0);
  const winRate = closed.length > 0 ? (wins.length / closed.length * 100) : 0;
  const avgR = closed.length > 0 ? (totalR / closed.length) : 0;
  const aplusClosed = closed.filter(t => t.status === "A+");
  const aplusWins = aplusClosed.filter(t => t.result === "WIN_TP1" || t.result === "WIN_TP2");
  const watchClosed = closed.filter(t => t.status === "WATCHLIST");
  const watchWins = watchClosed.filter(t => t.result === "WIN_TP1" || t.result === "WIN_TP2");
  const longClosed = closed.filter(t => t.trendDir === "LONG");
  const longWins = longClosed.filter(t => t.result === "WIN_TP1" || t.result === "WIN_TP2");
  const shortClosed = closed.filter(t => t.trendDir === "SHORT");
  const shortWins = shortClosed.filter(t => t.result === "WIN_TP1" || t.result === "WIN_TP2");
  const byTicker = {};
  closed.forEach(t => {
    if (!byTicker[t.symbol]) byTicker[t.symbol] = { wins: 0, total: 0, r: 0 };
    byTicker[t.symbol].total++;
    if (t.result === "WIN_TP1") { byTicker[t.symbol].wins++; byTicker[t.symbol].r += 1; }
    else if (t.result === "WIN_TP2") { byTicker[t.symbol].wins++; byTicker[t.symbol].r += 2; }
    else if (t.result === "LOSS") byTicker[t.symbol].r -= 1;
    else if (t.result === "MANUAL" && t.manualR) byTicker[t.symbol].r += Number(t.manualR);
  });
  const byRegime = {};
  closed.forEach(t => {
    const r = t.regime || "UNKNOWN";
    if (!byRegime[r]) byRegime[r] = { wins: 0, total: 0 };
    byRegime[r].total++;
    if (t.result === "WIN_TP1" || t.result === "WIN_TP2") byRegime[r].wins++;
  });
  return {
    total: closed.length, wins: wins.length, losses: losses.length,
    open: trades.filter(t => t.result === "OPEN").length,
    winRate, avgR, totalR,
    aplus: { total: aplusClosed.length, wins: aplusWins.length, rate: aplusClosed.length > 0 ? (aplusWins.length / aplusClosed.length * 100) : 0 },
    watch: { total: watchClosed.length, wins: watchWins.length, rate: watchClosed.length > 0 ? (watchWins.length / watchClosed.length * 100) : 0 },
    long: { total: longClosed.length, wins: longWins.length, rate: longClosed.length > 0 ? (longWins.length / longClosed.length * 100) : 0 },
    short: { total: shortClosed.length, wins: shortWins.length, rate: shortClosed.length > 0 ? (shortWins.length / shortClosed.length * 100) : 0 },
    byTicker, byRegime,
  };
}

function StatsPage({ onBack }) {
  const [trades, setTrades] = useState(loadTrades());
  const [closingTrade, setClosingTrade] = useState(null);
  const [manualR, setManualR] = useState("");
  const stats = useMemo(() => calcStats(trades), [trades]);

  const updateTrade = (id, result, extraR = null) => {
    const updated = trades.map(t => t.id === id ? { ...t, result, manualR: extraR, closedAt: new Date().toISOString() } : t);
    setTrades(updated); saveTrades(updated);
    setClosingTrade(null); setManualR("");
  };
  const deleteTrade = (id) => {
    if (!confirm("Delete this trade?")) return;
    const updated = trades.filter(t => t.id !== id);
    setTrades(updated); saveTrades(updated);
  };

  const openTrades = trades.filter(t => t.result === "OPEN");
  const closedTrades = trades.filter(t => t.result && t.result !== "OPEN").sort((a,b) => new Date(b.closedAt) - new Date(a.closedAt));

  return (
    <div style={{ background:"#0a0612", minHeight:"100vh", color:"#fff", fontFamily:"'Inter','SF Pro Display',sans-serif", maxWidth:480, margin:"0 auto", position:"relative", overflow:"hidden" }}>
      <Orbs/>
      <div style={{ position:"relative", zIndex:1, padding:"24px 16px 80px" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
          <button onClick={onBack} style={{ background:"rgba(255,255,255,0.04)", backdropFilter:"blur(20px)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:12, color:"rgba(255,255,255,0.6)", padding:"8px 14px", fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>← Back</button>
          <span style={{ fontSize:13, fontWeight:600, letterSpacing:2 }}>JOURNAL</span>
          <div style={{ width:60 }}/>
        </div>

        <div style={{ background:"rgba(255,255,255,0.04)", backdropFilter:"blur(40px)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:24, padding:"22px", marginBottom:14, position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", top:0, left:0, right:0, height:1, background:"linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)" }}/>
          <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)", letterSpacing:3, marginBottom:14 }}>OVERALL PERFORMANCE</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
            <div>
              <div style={{ fontSize:9, color:"rgba(255,255,255,0.4)", letterSpacing:2, marginBottom:4 }}>WIN RATE</div>
              <div style={{ fontSize:36, fontWeight:300, color: stats.winRate >= 50 ? "#80ff80" : "#ff8080", lineHeight:1 }}>{stats.winRate.toFixed(1)}<span style={{ fontSize:18, opacity:0.5 }}>%</span></div>
            </div>
            <div>
              <div style={{ fontSize:9, color:"rgba(255,255,255,0.4)", letterSpacing:2, marginBottom:4 }}>AVG R</div>
              <div style={{ fontSize:36, fontWeight:300, color: stats.avgR >= 0 ? "#80ddff" : "#ff8080", lineHeight:1 }}>{stats.avgR >= 0 ? "+" : ""}{stats.avgR.toFixed(2)}<span style={{ fontSize:18, opacity:0.5 }}>R</span></div>
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, paddingTop:14, borderTop:"1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:18, fontWeight:500, color:"#fff" }}>{stats.total}</div>
              <div style={{ fontSize:8, color:"rgba(255,255,255,0.4)", letterSpacing:1 }}>CLOSED</div>
            </div>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:18, fontWeight:500, color:"#80ff80" }}>{stats.wins}</div>
              <div style={{ fontSize:8, color:"rgba(128,255,128,0.5)", letterSpacing:1 }}>WINS</div>
            </div>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:18, fontWeight:500, color:"#ff8080" }}>{stats.losses}</div>
              <div style={{ fontSize:8, color:"rgba(255,128,128,0.5)", letterSpacing:1 }}>LOSSES</div>
            </div>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:18, fontWeight:500, color:"#ffd770" }}>{stats.open}</div>
              <div style={{ fontSize:8, color:"rgba(255,215,112,0.6)", letterSpacing:1 }}>OPEN</div>
            </div>
          </div>
          <div style={{ marginTop:14, padding:"10px 14px", background:"rgba(255,255,255,0.03)", borderRadius:12, fontSize:11, color:"rgba(255,255,255,0.5)", textAlign:"center" }}>
            Total R · <span style={{ color: stats.totalR >= 0 ? "#80ff80" : "#ff8080", fontWeight:600 }}>{stats.totalR >= 0 ? "+" : ""}{stats.totalR.toFixed(2)}R</span>
          </div>
        </div>

        {stats.total < 30 && stats.total > 0 && (
          <div style={{ background:"rgba(255,215,112,0.06)", border:"1px solid rgba(255,215,112,0.15)", borderRadius:14, padding:"10px 14px", marginBottom:14, fontSize:11, color:"#ffe88a", lineHeight:1.5 }}>
            ⚠ Sample size · {stats.total} trades. Minimum 30 needed for reliable win rate.
          </div>
        )}

        {stats.total > 0 && (
          <div style={{ background:"rgba(255,255,255,0.03)", backdropFilter:"blur(30px)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:18, padding:"16px", marginBottom:12 }}>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)", letterSpacing:3, marginBottom:12 }}>BY STATUS</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <div style={{ background:"rgba(128,255,128,0.05)", border:"1px solid rgba(128,255,128,0.15)", borderRadius:12, padding:"10px" }}>
                <div style={{ fontSize:9, color:"rgba(128,255,128,0.7)", letterSpacing:1.5, marginBottom:4 }}>A+ ({stats.aplus.total})</div>
                <div style={{ fontSize:20, fontWeight:300, color:"#80ff80" }}>{stats.aplus.rate.toFixed(0)}<span style={{ fontSize:12, opacity:0.6 }}>%</span></div>
                <div style={{ fontSize:9, color:"rgba(255,255,255,0.4)" }}>{stats.aplus.wins} wins</div>
              </div>
              <div style={{ background:"rgba(255,215,112,0.05)", border:"1px solid rgba(255,215,112,0.15)", borderRadius:12, padding:"10px" }}>
                <div style={{ fontSize:9, color:"rgba(255,215,112,0.7)", letterSpacing:1.5, marginBottom:4 }}>WATCH ({stats.watch.total})</div>
                <div style={{ fontSize:20, fontWeight:300, color:"#ffd770" }}>{stats.watch.rate.toFixed(0)}<span style={{ fontSize:12, opacity:0.6 }}>%</span></div>
                <div style={{ fontSize:9, color:"rgba(255,255,255,0.4)" }}>{stats.watch.wins} wins</div>
              </div>
            </div>
          </div>
        )}

        {stats.total > 0 && (
          <div style={{ background:"rgba(255,255,255,0.03)", backdropFilter:"blur(30px)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:18, padding:"16px", marginBottom:12 }}>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)", letterSpacing:3, marginBottom:12 }}>BY DIRECTION</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <div style={{ background:"rgba(128,255,128,0.04)", border:"1px solid rgba(128,255,128,0.1)", borderRadius:12, padding:"10px" }}>
                <div style={{ fontSize:9, color:"rgba(128,255,128,0.7)", letterSpacing:1.5, marginBottom:4 }}>LONG ({stats.long.total})</div>
                <div style={{ fontSize:20, fontWeight:300, color:"#80ff80" }}>{stats.long.rate.toFixed(0)}<span style={{ fontSize:12, opacity:0.6 }}>%</span></div>
              </div>
              <div style={{ background:"rgba(255,128,128,0.04)", border:"1px solid rgba(255,128,128,0.1)", borderRadius:12, padding:"10px" }}>
                <div style={{ fontSize:9, color:"rgba(255,128,128,0.7)", letterSpacing:1.5, marginBottom:4 }}>SHORT ({stats.short.total})</div>
                <div style={{ fontSize:20, fontWeight:300, color:"#ff8080" }}>{stats.short.rate.toFixed(0)}<span style={{ fontSize:12, opacity:0.6 }}>%</span></div>
              </div>
            </div>
          </div>
        )}

        {Object.keys(stats.byTicker).length > 0 && (
          <div style={{ background:"rgba(255,255,255,0.03)", backdropFilter:"blur(30px)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:18, padding:"16px", marginBottom:12 }}>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)", letterSpacing:3, marginBottom:12 }}>BY TICKER</div>
            {Object.entries(stats.byTicker).sort((a,b) => b[1].r - a[1].r).map(([sym, d]) => {
              const rate = d.total > 0 ? (d.wins / d.total * 100) : 0;
              return (
                <div key={sym} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderTop:"1px solid rgba(255,255,255,0.04)" }}>
                  <span style={{ fontSize:13, fontWeight:600, width:60 }}>{sym}</span>
                  <span style={{ fontSize:11, color:"rgba(255,255,255,0.5)", width:60, textAlign:"center" }}>{d.wins}/{d.total}</span>
                  <span style={{ fontSize:11, color: rate >= 50 ? "#80ff80" : "#ff8080", width:50, textAlign:"center" }}>{rate.toFixed(0)}%</span>
                  <span style={{ fontSize:11, color: d.r >= 0 ? "#80ddff" : "#ff8080", width:60, textAlign:"right", fontWeight:500 }}>{d.r >= 0 ? "+" : ""}{d.r.toFixed(1)}R</span>
                </div>
              );
            })}
          </div>
        )}

        {Object.keys(stats.byRegime).length > 0 && (
          <div style={{ background:"rgba(255,255,255,0.03)", backdropFilter:"blur(30px)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:18, padding:"16px", marginBottom:18 }}>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)", letterSpacing:3, marginBottom:12 }}>BY MARKET REGIME</div>
            {Object.entries(stats.byRegime).map(([reg, d]) => {
              const rate = d.total > 0 ? (d.wins / d.total * 100) : 0;
              return (
                <div key={reg} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderTop:"1px solid rgba(255,255,255,0.04)" }}>
                  <span style={{ fontSize:12, fontWeight:500, color:condColor(reg) }}>{reg}</span>
                  <span style={{ fontSize:11, color:"rgba(255,255,255,0.5)" }}>{d.wins}/{d.total}</span>
                  <span style={{ fontSize:11, color: rate >= 50 ? "#80ff80" : "#ff8080" }}>{rate.toFixed(0)}%</span>
                </div>
              );
            })}
          </div>
        )}

        {openTrades.length > 0 && (
          <div style={{ marginBottom:18 }}>
            <div style={{ fontSize:11, color:"#ffd770", letterSpacing:3, marginBottom:10 }}>● OPEN TRADES ({openTrades.length})</div>
            {openTrades.map(t => (
              <div key={t.id} style={{ background:"rgba(255,215,112,0.05)", backdropFilter:"blur(20px)", border:"1px solid rgba(255,215,112,0.15)", borderRadius:16, padding:"14px", marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                  <div>
                    <span style={{ fontSize:15, fontWeight:600 }}>{t.symbol}</span>
                    <span style={{ fontSize:9, color:accentFor(t.status), marginLeft:8, background:`${accentFor(t.status)}15`, padding:"2px 6px", borderRadius:4 }}>{t.status}</span>
                    <span style={{ fontSize:9, color:t.trendDir==="LONG"?"#80ff80":"#ff8080", marginLeft:6 }}>{t.trendDir}</span>
                  </div>
                  <span style={{ fontSize:9, color:"rgba(255,255,255,0.4)" }}>{new Date(t.openedAt).toLocaleString()}</span>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6, marginBottom:10, fontSize:10 }}>
                  <div><div style={{ color:"rgba(255,255,255,0.4)" }}>Entry</div><div style={{ color:"#fff", fontWeight:500 }}>${t.entry}</div></div>
                  <div><div style={{ color:"rgba(255,128,128,0.6)" }}>Stop</div><div style={{ color:"#ff8080", fontWeight:500 }}>${t.sl}</div></div>
                  <div><div style={{ color:"rgba(128,255,128,0.6)" }}>TP1</div><div style={{ color:"#80ff80", fontWeight:500 }}>${t.tp1}</div></div>
                  <div><div style={{ color:"rgba(128,221,255,0.6)" }}>TP2</div><div style={{ color:"#80ddff", fontWeight:500 }}>${t.tp2}</div></div>
                </div>
                {closingTrade !== t.id ? (
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:6 }}>
                    <button onClick={() => updateTrade(t.id, "WIN_TP1")} style={{ background:"rgba(128,255,128,0.1)", border:"1px solid rgba(128,255,128,0.3)", borderRadius:8, color:"#80ff80", padding:"8px 4px", fontSize:10, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>TP1</button>
                    <button onClick={() => updateTrade(t.id, "WIN_TP2")} style={{ background:"rgba(128,221,255,0.1)", border:"1px solid rgba(128,221,255,0.3)", borderRadius:8, color:"#80ddff", padding:"8px 4px", fontSize:10, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>TP2</button>
                    <button onClick={() => updateTrade(t.id, "LOSS")} style={{ background:"rgba(255,128,128,0.1)", border:"1px solid rgba(255,128,128,0.3)", borderRadius:8, color:"#ff8080", padding:"8px 4px", fontSize:10, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>LOSS</button>
                    <button onClick={() => setClosingTrade(t.id)} style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:8, color:"rgba(255,255,255,0.7)", padding:"8px 4px", fontSize:10, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>MANUAL</button>
                  </div>
                ) : (
                  <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                    <input type="number" step="0.1" value={manualR} onChange={e => setManualR(e.target.value)} placeholder="R (e.g. 0.5 or -0.3)" style={{ flex:1, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:8, color:"#fff", padding:"8px 10px", fontSize:11, fontFamily:"inherit" }}/>
                    <button onClick={() => manualR && updateTrade(t.id, "MANUAL", manualR)} style={{ background:"rgba(128,255,128,0.15)", border:"1px solid rgba(128,255,128,0.3)", borderRadius:8, color:"#80ff80", padding:"8px 14px", fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>OK</button>
                    <button onClick={() => { setClosingTrade(null); setManualR(""); }} style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, color:"rgba(255,255,255,0.5)", padding:"8px 10px", fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>✕</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {closedTrades.length > 0 && (
          <div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)", letterSpacing:3, marginBottom:10 }}>CLOSED TRADES</div>
            {closedTrades.map(t => {
              const rValue = t.result === "WIN_TP1" ? 1 : t.result === "WIN_TP2" ? 2 : t.result === "LOSS" ? -1 : Number(t.manualR || 0);
              const isWin = rValue > 0;
              const resultLabel = t.result === "WIN_TP1" ? "TP1" : t.result === "WIN_TP2" ? "TP2" : t.result === "LOSS" ? "STOP" : "MANUAL";
              return (
                <div key={t.id} style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.05)", borderRadius:12, padding:"10px 14px", marginBottom:6, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:13, fontWeight:600 }}>{t.symbol}</span>
                      <span style={{ fontSize:9, color:accentFor(t.status), background:`${accentFor(t.status)}15`, padding:"1px 5px", borderRadius:3 }}>{t.status}</span>
                      <span style={{ fontSize:9, color:t.trendDir==="LONG"?"#80ff80":"#ff8080" }}>{t.trendDir}</span>
                    </div>
                    <div style={{ fontSize:9, color:"rgba(255,255,255,0.3)", marginTop:2 }}>{new Date(t.closedAt).toLocaleDateString()} · ${t.entry} → {resultLabel}</div>
                  </div>
                  <div style={{ textAlign:"right", marginRight:8 }}>
                    <div style={{ fontSize:14, fontWeight:600, color: isWin ? "#80ff80" : "#ff8080" }}>{isWin ? "+" : ""}{rValue.toFixed(1)}R</div>
                  </div>
                  <button onClick={() => deleteTrade(t.id)} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.2)", cursor:"pointer", fontSize:14, padding:4 }}>×</button>
                </div>
              );
            })}
          </div>
        )}

        {trades.length === 0 && (
          <div style={{ textAlign:"center", color:"rgba(255,255,255,0.3)", marginTop:60, fontSize:13, fontStyle:"italic", lineHeight:1.6 }}>
            No trades yet<br/><span style={{ fontSize:11, opacity:0.7 }}>Take A+ or Watchlist setups<br/>to start tracking performance</span>
          </div>
        )}
      </div>
    </div>
  );
}

function HistoryPage({ onBack }) {
  const [history, setHistory] = useState(loadHistory());
  const clear = () => { if (confirm("Clear all history?")) { localStorage.removeItem("aplusHistory"); setHistory([]); } };
  return (
    <div style={{ background:"#0a0612", minHeight:"100vh", color:"#fff", fontFamily:"'Inter','SF Pro Display',sans-serif", maxWidth:480, margin:"0 auto", position:"relative", overflow:"hidden" }}>
      <Orbs/>
      <div style={{ position:"relative", zIndex:1, padding:"24px 16px" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
          <button onClick={onBack} style={{ background:"rgba(255,255,255,0.04)", backdropFilter:"blur(20px)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:12, color:"rgba(255,255,255,0.6)", padding:"8px 14px", fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>← Back</button>
          <span style={{ fontSize:13, fontWeight:600, letterSpacing:2 }}>SCAN HISTORY</span>
          <button onClick={clear} style={{ background:"rgba(255,128,128,0.08)", border:"1px solid rgba(255,128,128,0.2)", borderRadius:12, color:"#ff8080", padding:"8px 14px", fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>Clear</button>
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

function TickerCard({ t, expanded, onToggle, onTakeTrade, marketRegime, alreadyTaken }) {
  const isAplus = t.status === "A+";
  const isWatch = t.status === "WATCHLIST";
  const accent = accentFor(t.status);
  const canTrade = isAplus || isWatch;

  const handleTake = (e) => { e.stopPropagation(); onTakeTrade(t, marketRegime); };

  return (
    <div onClick={onToggle} style={{
      background:"rgba(255,255,255,0.03)", backdropFilter:"blur(30px)", WebkitBackdropFilter:"blur(30px)",
      border:"1px solid rgba(255,255,255,0.06)", borderRadius:20, padding:"16px 18px", marginBottom:10, cursor:"pointer",
      boxShadow: isAplus ? "0 0 30px rgba(128,255,128,0.08)" : isWatch ? "0 0 20px rgba(255,215,112,0.05)" : "none",
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
            {[["Entry",`$${t.entry}`,"#fff"],["Stop",`$${t.sl}`,"#ff8080"],["TP1",`$${t.tp1}`,"#80ff80"],["TP2",`$${t.tp2}`,"#80ddff"]].map(([l,v,col])=>(
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
          <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:8, marginBottom:12 }}>
            <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.05)", borderRadius:14, padding:"10px", textAlign:"center" }}>
              <div style={{ fontSize:8, color:"rgba(255,255,255,0.4)", letterSpacing:2, marginBottom:4 }}>ROOM</div>
              <div style={{ fontSize:22, fontWeight:300, color:t.room>=2?"#80ff80":"#ff8080" }}>{t.room}R</div>
            </div>
            <div style={{ background:"rgba(255,128,128,0.04)", border:"1px solid rgba(255,128,128,0.1)", borderRadius:14, padding:"10px 14px" }}>
              <div style={{ fontSize:8, color:"rgba(255,128,128,0.7)", letterSpacing:2, marginBottom:4 }}>RISK FACTOR</div>
              <div style={{ fontSize:10, color:"rgba(255,168,168,0.9)", lineHeight:1.5 }}>{t.whyFail}</div>
            </div>
          </div>
          {canTrade && (
            alreadyTaken ? (
              <div style={{ background:"rgba(255,215,112,0.08)", border:"1px solid rgba(255,215,112,0.2)", borderRadius:14, padding:"12px", textAlign:"center", color:"#ffd770", fontSize:12, fontWeight:500 }}>● TRADE OPEN · See Journal</div>
            ) : (
              <button onClick={handleTake} style={{
                width:"100%", padding:"14px",
                background:`linear-gradient(135deg, ${accent}25, ${accent}15)`,
                border:`1px solid ${accent}55`, borderRadius:14, color:accent,
                fontSize:13, fontWeight:600, letterSpacing:2, cursor:"pointer", fontFamily:"inherit",
                boxShadow:`0 4px 20px ${accent}25`,
              }}>+ TAKE THIS TRADE</button>
            )
          )}
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
  const [trades, setTrades] = useState(loadTrades());
  const [toast, setToast] = useState(null);

  const takenSymbols = useMemo(() => new Set(trades.filter(t => t.result === "OPEN").map(t => t.symbol)), [trades]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const takeTrade = (t, regime) => {
    const newTrade = {
      id: `${t.symbol}-${Date.now()}`, symbol: t.symbol, status: t.status, trendDir: t.trendDir,
      entry: t.entry, sl: t.sl, tp1: t.tp1, tp2: t.tp2,
      prob: t.prob, score: t.score, regime: regime,
      openedAt: new Date().toISOString(), result: "OPEN",
    };
    const updated = [newTrade, ...loadTrades()];
    saveTrades(updated); setTrades(updated);
    showToast(`✓ ${t.symbol} added to Journal`);
  };

  const runScan = useCallback(async () => {
    setScanning(true); setError(null); setExpanded(null); setProgress(0);
    const interval = setInterval(() => setProgress(p => Math.min(p + 2, 92)), 150);
    try {
      const res = await fetch("/api/scan");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json); setProgress(100);
      const aplusTrades = (json.tickers||[]).filter(t=>t.status==="A+");
      if (aplusTrades.length > 0) {
        const now = new Date();
        saveHistory([{ time:now.toLocaleString(), marketCondition:json.market.condition, allowedTrades:json.market.allowed, trades:aplusTrades.map(t=>({symbol:t.symbol,status:t.status,trendDir:t.trendDir,entry:t.entry,prob:t.prob})) }, ...loadHistory()]);
      }
    } catch(e) { setError(e.message); }
    finally { clearInterval(interval); setScanning(false); }
  }, []);

  if (page === "history") return <HistoryPage onBack={() => setPage("scanner")} />;
  if (page === "stats") return <StatsPage onBack={() => { setTrades(loadTrades()); setPage("scanner"); }} />;

  const market = data?.market;
  const tickers = data?.tickers || [];
  const aplusCount = tickers.filter(t=>t.status==="A+").length;
  const scannedAt = data?.scannedAt ? new Date(data.scannedAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}) : null;
  const openCount = trades.filter(t => t.result === "OPEN").length;

  return (
    <div style={{ background:"#0a0612", minHeight:"100vh", color:"#fff", fontFamily:"'Inter','SF Pro Display','-apple-system',sans-serif", maxWidth:480, margin:"0 auto", position:"relative", overflow:"hidden" }}>
      <Orbs/>
      <div style={{ position:"relative", zIndex:1, padding:"24px 16px 80px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
          <div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", letterSpacing:6, marginBottom:6 }}>PREMIUM</div>
            <h1 style={{ fontSize:36, fontWeight:200, letterSpacing:-1, margin:0, lineHeight:1 }}>
              A+ <span style={{ fontWeight:800, background:"linear-gradient(135deg, #c79bff, #80ddff)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Scanner</span>
            </h1>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginTop:6, letterSpacing:1 }}>Institutional-grade options intelligence</div>
            {scannedAt && <div style={{ fontSize:10, color:"rgba(255,255,255,0.25)", marginTop:4, letterSpacing:1 }}>Last scan · {scannedAt}</div>}
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            <button onClick={()=>setPage("stats")} style={{ background:openCount>0?"rgba(255,215,112,0.1)":"rgba(255,255,255,0.04)", backdropFilter:"blur(20px)", border:`1px solid ${openCount>0?"rgba(255,215,112,0.3)":"rgba(255,255,255,0.08)"}`, borderRadius:12, color:openCount>0?"#ffd770":"rgba(255,255,255,0.6)", padding:"8px 12px", fontSize:11, cursor:"pointer", fontFamily:"inherit", letterSpacing:1 }}>
              Journal {openCount > 0 && <span style={{ marginLeft:4, background:"#ffd770", color:"#0a0612", borderRadius:8, padding:"1px 5px", fontSize:9, fontWeight:700 }}>{openCount}</span>}
            </button>
            <button onClick={()=>setPage("history")} style={{ background:"rgba(255,255,255,0.04)", backdropFilter:"blur(20px)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:12, color:"rgba(255,255,255,0.6)", padding:"8px 12px", fontSize:11, cursor:"pointer", fontFamily:"inherit", letterSpacing:1 }}>History</button>
          </div>
        </div>

        <button onClick={runScan} disabled={scanning} style={{
          width:"100%", padding:"18px", marginBottom:14,
          background:"linear-gradient(135deg, rgba(199,155,255,0.2), rgba(128,221,255,0.15))",
          backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)",
          border:"1px solid rgba(255,255,255,0.15)", borderRadius:18, color:"#fff",
          fontSize:14, fontWeight:500, letterSpacing:4, cursor:scanning?"not-allowed":"pointer", fontFamily:"inherit",
          boxShadow:"0 8px 32px rgba(199,155,255,0.15)", opacity:scanning?0.5:1,
        }}>
          {scanning ? "Scanning markets..." : "✨  Scan Markets"}
        </button>

        {scanning && (
          <div style={{ background:"rgba(255,255,255,0.04)", borderRadius:4, height:2, marginBottom:14, overflow:"hidden" }}>
            <div style={{ height:"100%", background:"linear-gradient(90deg, #c79bff, #80ddff)", width:`${progress}%`, transition:"width 0.15s ease", boxShadow:"0 0 10px rgba(199,155,255,0.5)" }}/>
          </div>
        )}

        {error && (
          <div style={{ background:"rgba(255,128,128,0.06)", backdropFilter:"blur(20px)", border:"1px solid rgba(255,128,128,0.2)", borderRadius:14, padding:"12px 16px", marginBottom:14, color:"#ff8080", fontSize:11 }}>⚠ Error · {error}</div>
        )}

        {market && (
          <>
            <div style={{ background:"rgba(255,255,255,0.04)", backdropFilter:"blur(40px)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:24, padding:"20px 22px", marginBottom:14, position:"relative", overflow:"hidden" }}>
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
              <TickerCard key={t.symbol} t={t} expanded={expanded===t.symbol} onToggle={()=>setExpanded(expanded===t.symbol?null:t.symbol)} onTakeTrade={takeTrade} marketRegime={market.condition} alreadyTaken={takenSymbols.has(t.symbol)} />
            ))}
          </>
        )}

        {!data && !scanning && !error && (
          <div style={{ textAlign:"center", color:"rgba(255,255,255,0.2)", marginTop:80, fontSize:12, letterSpacing:2, fontStyle:"italic" }}>Tap Scan Markets to begin</div>
        )}
      </div>

      {toast && (
        <div style={{ position:"fixed", bottom:30, left:"50%", transform:"translateX(-50%)", background:"rgba(128,255,128,0.15)", backdropFilter:"blur(30px)", border:"1px solid rgba(128,255,128,0.4)", borderRadius:16, padding:"12px 24px", color:"#80ff80", fontSize:13, fontWeight:500, zIndex:100, boxShadow:"0 8px 32px rgba(0,0,0,0.3)" }}>
          {toast}
        </div>
      )}
    </div>
  );
}
