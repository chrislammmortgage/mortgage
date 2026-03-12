import { useState, useMemo, useCallback } from "react";
import { BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

/* ═══ MORTGAGEONE BRAND ═══ */
const C = {
  charcoal: "#404040", cyan: "#02b2da", lime: "#c0f000",
  dark: "#222", mid: "#555", muted: "#888", bg: "#f5f5f5",
  white: "#fff", border: "#ddd", green: "#2D7D46",
  warn: "#D4880F", red: "#C0392B",
};
const PAL = [C.cyan, "#7BC142", "#E67E22", "#9B59B6"];

/* ═══ M1 LOGO SVG ═══ */
function M1Logo() {
  return (
    <svg width="38" height="22" viewBox="0 0 38 22" fill="none">
      <path d="M3 20L7.5 2H10L16 16L22 2h2.5L28 20" stroke={C.charcoal} strokeWidth="2.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="32" y1="2" x2="32" y2="20" stroke={C.cyan} strokeWidth="3.5" strokeLinecap="round"/>
    </svg>
  );
}

/* ═══ BRANCH FEE SCHEDULE ═══ */
const BRANCH_FEES = {
  "Processing": 1195, "Underwriting": 1295, "Admin Fee": 250,
  "Appraisal": 550, "Credit Report": 75, "Flood Cert": 12,
  "Tax Service": 85, "Recording": 125, "Notary": 175, "Wire Fee": 35,
};

/* ═══ FIRST AMERICAN TITLE TIERS (Region 4 CA) ═══ */
const TITLE_TIERS = [
  { max: 250000, o: 375, l: 275, e: 385 },
  { max: 300000, o: 425, l: 295, e: 415 },
  { max: 350000, o: 475, l: 315, e: 445 },
  { max: 400000, o: 525, l: 335, e: 465 },
  { max: 500000, o: 575, l: 355, e: 495 },
  { max: 600000, o: 625, l: 375, e: 525 },
  { max: 750000, o: 695, l: 405, e: 565 },
  { max: 1000000, o: 795, l: 445, e: 625 },
  { max: 1500000, o: 995, l: 525, e: 725 },
  { max: Infinity, o: 1295, l: 645, e: 895 },
];

function titleLookup(amt) {
  const t = TITLE_TIERS.find(x => amt <= x.max);
  return { owners: t.o, lender: t.l, escrow: t.e, total: t.o + t.l + t.e };
}
function branchTotal() {
  return Object.values(BRANCH_FEES).reduce((a, b) => a + b, 0);
}
function calcClosing(amt) {
  const b = branchTotal();
  const t = titleLookup(amt);
  return { branch: b, title: t, total: b + t.total };
}

/* ═══ MATH ENGINE ═══ */
function pmt(principal, rate, months) {
  if (rate === 0) return principal / months;
  const r = rate / 12;
  return principal * (r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

function amortSchedule(principal, rate, months) {
  const schedule = [];
  let balance = principal;
  const monthly = pmt(principal, rate, months);
  const r = rate / 12;
  let totalInt = 0;
  for (let i = 1; i <= months; i++) {
    const intPmt = balance * r;
    const prinPmt = monthly - intPmt;
    balance = Math.max(0, balance - prinPmt);
    totalInt += intPmt;
    if (i % 12 === 0 || i === 1 || i === months) {
      schedule.push({ month: i, year: Math.ceil(i / 12), balance, totalInterest: totalInt, equity: principal - balance });
    }
  }
  return schedule;
}

function estimatePMI(loan, value, score = 740) {
  const ltv = loan / value;
  if (ltv <= 0.80) return 0;
  let r = 0.005;
  if (score >= 760) r = ltv > 0.95 ? 0.0044 : 0.0025;
  else if (score >= 740) r = ltv > 0.95 ? 0.0065 : 0.0035;
  else if (score >= 720) r = ltv > 0.95 ? 0.0085 : 0.005;
  else r = ltv > 0.95 ? 0.013 : 0.009;
  return (loan * r) / 12;
}

function rentVsOwn(price, down, rate, yrs, rent, rentInc = 0.03, appr = 0.035) {
  const loan = price - down;
  const mp = pmt(loan, rate, yrs * 12);
  const data = [];
  let cRent = 0, cOwn = 0, curRent = rent, hv = price;
  for (let y = 1; y <= yrs; y++) {
    const annRent = curRent * 12;
    const annOwn = mp * 12 + hv * 0.012 + 1800 + hv * 0.01;
    cRent += annRent; cOwn += annOwn;
    hv *= (1 + appr);
    const am = amortSchedule(loan, rate, yrs * 12);
    const ye = am.find(s => s.year === y);
    const eq = ye ? hv - ye.balance : hv - loan;
    data.push({ year: y, cRent: Math.round(cRent), cOwn: Math.round(cOwn), hv: Math.round(hv), equity: Math.round(eq), gap: Math.round(eq - (cRent - cOwn)) });
    curRent *= (1 + rentInc);
  }
  return data;
}

function costOfWaiting(price, rate, months, appr = 0.04, rateInc = 0.0025) {
  const futurePrice = price * Math.pow(1 + appr, months / 12);
  const futureRate = rate + (rateInc * months / 12);
  const dp = 0.05;
  const curLoan = price * (1 - dp), futLoan = futurePrice * (1 - dp);
  const curPmt = pmt(curLoan, rate, 360), futPmt = pmt(futLoan, futureRate, 360);
  return {
    price, futurePrice, cDown: price * dp, fDown: futurePrice * dp,
    rate, futureRate, curPmt, futPmt,
    cTotal: curPmt * 360, fTotal: futPmt * 360,
    addDown: futurePrice * dp - price * dp,
    addMo: futPmt - curPmt, addLife: futPmt * 360 - curPmt * 360,
  };
}

/* ═══ FORMATTERS ═══ */
const fmt = n => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
const fmtD = n => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

/* ═══ UI COMPONENTS ═══ */
function Inp({ label, value, onChange, pre, suf }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{label}</label>
      <div style={{ display: "flex", alignItems: "center", border: `1px solid ${C.border}`, borderRadius: 5, background: C.white }}>
        {pre && <span style={{ padding: "7px 0 7px 8px", color: C.muted, fontSize: 13, fontWeight: 600 }}>{pre}</span>}
        <input type="text" value={value} onChange={e => onChange(e.target.value)}
          style={{ flex: 1, border: "none", outline: "none", padding: pre ? "7px 8px 7px 3px" : "7px 8px", fontSize: 13, width: "100%", fontFamily: "inherit" }} />
        {suf && <span style={{ padding: "7px 8px 7px 0", color: C.muted, fontSize: 11 }}>{suf}</span>}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div style={{ padding: "12px 14px", background: accent ? C.charcoal : C.white, borderRadius: 8, border: accent ? "none" : `1px solid ${C.border}` }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: accent ? "rgba(255,255,255,0.5)" : C.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: accent ? C.cyan : C.charcoal }}>{value}</div>
    </div>
  );
}

/* ═══ COMPUTE SCENARIO ═══ */
function compute(s) {
  const loan = parseFloat(s.loanAmount) || 0;
  const rate = (parseFloat(s.rate) || 0) / 100;
  const term = (parseFloat(s.term) || 30) * 12;
  const propVal = parseFloat(s.propertyValue) || 0;
  const tax = (parseFloat(s.taxes) || 0) / 12;
  const ins = (parseFloat(s.insurance) || 0) / 12;
  const hoa = parseFloat(s.hoa) || 0;

  const cc = s.autoFees ? calcClosing(loan) : { total: parseFloat(s.closingCosts) || 0 };
  const closing = cc.total;

  let totalLoan = loan, fundingFee = 0, ufmip = 0, monthlyMip = 0, monthlyPmi = 0;

  if (s.loanType === "FHA" || s.loanType === "FHA Streamline") {
    ufmip = loan * 0.0175;
    totalLoan = loan + ufmip;
    monthlyMip = (loan * 0.0055) / 12;
  } else if (s.loanType === "VA" || s.loanType === "VA IRRRL") {
    fundingFee = s.vaExempt ? 0 : (s.loanType === "VA IRRRL" ? loan * 0.005 : loan * 0.0215);
    totalLoan = loan + fundingFee;
  } else if (s.loanType === "Conventional") {
    monthlyPmi = estimatePMI(loan, propVal);
  }

  const pi = pmt(totalLoan, rate, term);
  const totalPayment = pi + tax + ins + hoa + monthlyMip + monthlyPmi;
  const totalInterest = (pi * term) - totalLoan;
  const totalCost = pi * term + closing;
  const ltv = propVal > 0 ? (loan / propVal) * 100 : 0;

  let recoup = null;
  if ((s.loanType === "FHA Streamline" || s.loanType === "VA IRRRL") && s.currentPI) {
    const oldPI = parseFloat(s.currentPI) || 0;
    const savings = oldPI - pi;
    if (savings > 0) {
      const costs = closing + fundingFee + ufmip;
      recoup = { savings, months: Math.ceil(costs / savings), costs, pass: Math.ceil(costs / savings) <= 36 };
    }
  }

  return {
    ...s, totalLoan, pi, tax, ins, hoa, monthlyMip, monthlyPmi,
    fundingFee, ufmip, totalPayment, totalInterest, totalCost, ltv,
    term, rate, closing, recoup,
    closingDetail: s.autoFees ? cc : null,
    amort: amortSchedule(totalLoan, rate, term),
  };
}

/* ═══ MAIN APP ═══ */
export default function App() {
  const [tab, setTab] = useState("compare");
  const [cnt, setCnt] = useState(2);
  const [client, setClient] = useState("");

  const [scenarios, setScenarios] = useState([
    { loanType: "Conventional", loanAmount: "400000", rate: "6.250", term: "30", propertyValue: "500000", taxes: "6000", insurance: "1800", closingCosts: "", hoa: "0", autoFees: true },
    { loanType: "VA IRRRL", loanAmount: "320000", rate: "5.750", term: "30", propertyValue: "425000", taxes: "3800", insurance: "2100", closingCosts: "", hoa: "0", autoFees: true, vaExempt: true, currentRate: "7.000", currentPI: "2129" },
    { loanType: "FHA Streamline", loanAmount: "380000", rate: "5.875", term: "30", propertyValue: "420000", taxes: "5040", insurance: "1800", closingCosts: "", hoa: "0", autoFees: true, currentRate: "7.125", currentPI: "2560" },
    { loanType: "Conventional", loanAmount: "400000", rate: "5.500", term: "15", propertyValue: "500000", taxes: "6000", insurance: "1800", closingCosts: "", hoa: "0", autoFees: true },
  ]);

  const [rvo, setRvo] = useState({ price: "450000", down: "22500", rate: "6.25", yrs: "30", rent: "2200", ri: "3", ap: "3.5" });
  const [cow, setCow] = useState({ price: "450000", rate: "6.25", months: "12", ap: "4", ri: "0.25" });

  const TYPES = ["Conventional", "FHA", "VA", "FHA Streamline", "VA IRRRL"];
  const update = useCallback((i, val) => setScenarios(p => { const n = [...p]; n[i] = val; return n; }), []);
  const results = useMemo(() => scenarios.slice(0, cnt).map(compute), [scenarios, cnt]);

  const rvoData = useMemo(() => rentVsOwn(
    parseFloat(rvo.price) || 0, parseFloat(rvo.down) || 0,
    (parseFloat(rvo.rate) || 0) / 100, parseInt(rvo.yrs) || 30,
    parseFloat(rvo.rent) || 0, (parseFloat(rvo.ri) || 3) / 100,
    (parseFloat(rvo.ap) || 3.5) / 100
  ), [rvo]);

  const cowData = useMemo(() => costOfWaiting(
    parseFloat(cow.price) || 0, (parseFloat(cow.rate) || 0) / 100,
    parseInt(cow.months) || 12, (parseFloat(cow.ap) || 4) / 100,
    (parseFloat(cow.ri) || 0.25) / 100
  ), [cow]);

  const TABS = [
    { id: "compare", label: "Loan Comparison" },
    { id: "fees", label: "Fee Breakdown" },
    { id: "amort", label: "Amortization" },
    { id: "rvo", label: "Rent vs. Own" },
    { id: "cow", label: "Cost of Waiting" },
  ];

  const tabStyle = (active) => ({
    padding: "10px 16px", border: "none", cursor: "pointer",
    borderBottom: active ? `3px solid ${C.cyan}` : "3px solid transparent",
    background: "transparent", fontFamily: "inherit",
    color: active ? C.charcoal : C.muted, fontWeight: active ? 700 : 500, fontSize: 12,
  });

  return (
    <div style={{ fontFamily: "'DM Sans', -apple-system, sans-serif", background: C.bg, minHeight: "100vh", color: C.dark }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* HEADER */}
      <div style={{ background: C.charcoal, padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <M1Logo />
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.white, letterSpacing: "0.03em" }}>
              MORTGAGE<span style={{ color: C.cyan }}>ONE</span>{" "}
              <span style={{ fontSize: 11, fontWeight: 400, color: "rgba(255,255,255,0.45)" }}>ADVISOR</span>
            </div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)" }}>Chris Lamm | Branch Manager | NMLS# 209221</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input placeholder="Client Name" value={client} onChange={e => setClient(e.target.value)}
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 5, padding: "5px 10px", color: C.white, fontSize: 12, fontFamily: "inherit", width: 140 }} />
          <div style={{ display: "flex", gap: 3 }}>
            {[2, 3, 4].map(n => (
              <button key={n} onClick={() => setCnt(n)} style={{
                width: 28, height: 28, borderRadius: 5, cursor: "pointer", fontFamily: "inherit",
                border: cnt === n ? `2px solid ${C.cyan}` : "1px solid rgba(255,255,255,0.15)",
                background: cnt === n ? "rgba(2,178,218,0.15)" : "transparent",
                color: cnt === n ? C.cyan : "rgba(255,255,255,0.4)", fontWeight: 700, fontSize: 12,
              }}>{n}</button>
            ))}
          </div>
        </div>
      </div>

      {/* TABS */}
      <div style={{ background: C.white, borderBottom: `1px solid ${C.border}`, display: "flex", paddingLeft: 12, overflowX: "auto" }}>
        {TABS.map(t => <button key={t.id} onClick={() => setTab(t.id)} style={tabStyle(tab === t.id)}>{t.label}</button>)}
      </div>

      {client && (
        <div style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: "8px 20px", fontSize: 12, color: C.muted }}>
          Prepared for <strong style={{ color: C.charcoal }}>{client}</strong> — {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </div>
      )}

      <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>

        {/* ═══ COMPARE TAB ═══ */}
        {tab === "compare" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${cnt}, 1fr)`, gap: 12, marginBottom: 20 }}>
              {Array.from({ length: cnt }).map((_, i) => {
                const s = scenarios[i]; const color = PAL[i];
                const set = (field, val) => update(i, { ...s, [field]: val });
                return (
                  <div key={i} style={{ padding: 14, background: C.white, borderRadius: 8, border: `1px solid ${C.border}`, borderTop: `3px solid ${color}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color, textTransform: "uppercase" }}>Option {String.fromCharCode(65 + i)}</span>
                      <select value={s.loanType} onChange={e => set("loanType", e.target.value)}
                        style={{ fontSize: 11, border: `1px solid ${C.border}`, borderRadius: 4, padding: "3px 6px", fontFamily: "inherit" }}>
                        {TYPES.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 10px" }}>
                      <Inp label="Loan Amount" pre="$" value={s.loanAmount} onChange={v => set("loanAmount", v)} />
                      <Inp label="Rate" suf="%" value={s.rate} onChange={v => set("rate", v)} />
                      <Inp label="Term (Yrs)" value={s.term} onChange={v => set("term", v)} />
                      <Inp label="Property Value" pre="$" value={s.propertyValue} onChange={v => set("propertyValue", v)} />
                      <Inp label="Annual Taxes" pre="$" value={s.taxes} onChange={v => set("taxes", v)} />
                      <Inp label="Annual Insurance" pre="$" value={s.insurance} onChange={v => set("insurance", v)} />
                    </div>
                    <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.muted, marginTop: 6, cursor: "pointer" }}>
                      <input type="checkbox" checked={s.autoFees !== false} onChange={e => set("autoFees", e.target.checked)} />
                      Auto-calc fees (Branch + First American)
                    </label>
                    {!s.autoFees && <Inp label="Manual Closing Costs" pre="$" value={s.closingCosts} onChange={v => set("closingCosts", v)} />}
                    {(s.loanType === "VA" || s.loanType === "VA IRRRL") && (
                      <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, marginTop: 6, cursor: "pointer" }}>
                        <input type="checkbox" checked={s.vaExempt || false} onChange={e => set("vaExempt", e.target.checked)} />
                        VA Disability Exempt
                      </label>
                    )}
                    {(s.loanType === "FHA Streamline" || s.loanType === "VA IRRRL") && (
                      <div style={{ marginTop: 8, borderTop: `1px solid ${C.border}`, paddingTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 10px" }}>
                        <Inp label="Current Rate" suf="%" value={s.currentRate || ""} onChange={v => set("currentRate", v)} />
                        <Inp label="Current P&I" pre="$" value={s.currentPI || ""} onChange={v => set("currentPI", v)} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* COMPARISON TABLE */}
            <div style={{ background: C.white, borderRadius: 8, border: `1px solid ${C.border}`, overflow: "hidden" }}>
              <div style={{ background: C.charcoal, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.white }}>SIDE-BY-SIDE COMPARISON</span>
                <span style={{ fontSize: 10, color: C.lime }}>Fees: Branch Schedule + First American Title (CA Region 4)</span>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "#f5f5f5" }}>
                      <th style={{ padding: "8px 14px", textAlign: "left", fontWeight: 600, color: C.muted, fontSize: 10, textTransform: "uppercase", borderBottom: `1px solid ${C.border}` }}>Metric</th>
                      {results.map((r, i) => (
                        <th key={i} style={{ padding: "8px 14px", textAlign: "right", fontWeight: 700, color: PAL[i], fontSize: 11, textTransform: "uppercase", borderBottom: `1px solid ${C.border}` }}>
                          Opt {String.fromCharCode(65 + i)} — {r.loanType}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: "Base Loan", fn: r => fmt(parseFloat(r.loanAmount) || 0) },
                      { label: "Total Loan (financed)", fn: r => fmt(r.totalLoan) },
                      { label: "Interest Rate", fn: r => `${(r.rate * 100).toFixed(3)}%` },
                      { label: "LTV", fn: r => `${r.ltv.toFixed(1)}%` },
                      { label: "Principal & Interest", fn: r => fmtD(r.pi), hl: true },
                      { label: "Taxes", fn: r => fmtD(r.tax) },
                      { label: "Insurance", fn: r => fmtD(r.ins) },
                      { label: "Monthly MIP", fn: r => r.monthlyMip > 0 ? fmtD(r.monthlyMip) : "—" },
                      { label: "Monthly PMI", fn: r => r.monthlyPmi > 0 ? fmtD(r.monthlyPmi) : "—" },
                      { label: "TOTAL PAYMENT", fn: r => fmtD(r.totalPayment), hl: true, bold: true },
                      { label: "VA Funding Fee", fn: r => r.fundingFee > 0 ? fmt(r.fundingFee) : (r.vaExempt ? "$0 (Exempt)" : "—") },
                      { label: "UFMIP (Financed)", fn: r => r.ufmip > 0 ? fmt(r.ufmip) : "—" },
                      { label: "Closing Costs", fn: r => fmt(r.closing) },
                      { label: "Total Interest", fn: r => fmt(r.totalInterest) },
                      { label: "Total Cost of Loan", fn: r => fmt(r.totalCost), hl: true },
                    ].map((row, ri) => {
                      const minTotal = row.bold ? Math.min(...results.map(x => x.totalPayment)) : null;
                      return (
                        <tr key={ri} style={{ background: row.hl ? "#faf9f6" : ri % 2 === 0 ? C.white : "#fafafa" }}>
                          <td style={{ padding: "7px 14px", fontWeight: row.bold ? 700 : 500, color: row.bold ? C.charcoal : C.dark, borderBottom: `1px solid ${C.border}` }}>{row.label}</td>
                          {results.map((r, i) => {
                            const lowest = row.bold && r.totalPayment === minTotal;
                            return (
                              <td key={i} style={{ padding: "7px 14px", textAlign: "right", fontWeight: row.bold ? 700 : 400, color: lowest ? C.green : (row.bold ? C.charcoal : C.dark), borderBottom: `1px solid ${C.border}`, fontSize: row.bold ? 13 : 12 }}>
                                {row.fn(r)}{lowest && <span style={{ fontSize: 9, color: C.green, marginLeft: 5 }}>✓ LOWEST</span>}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* RECOUPMENT */}
              {results.some(r => r.recoup) && (
                <div style={{ padding: 16, borderTop: `1px solid ${C.border}`, background: "#faf9f6" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.charcoal, textTransform: "uppercase", marginBottom: 10 }}>Recoupment Analysis</div>
                  <div style={{ display: "grid", gridTemplateColumns: `repeat(${results.filter(r => r.recoup).length}, 1fr)`, gap: 12 }}>
                    {results.map((r, i) => r.recoup ? (
                      <div key={i} style={{ padding: 12, background: C.white, borderRadius: 6, border: `1px solid ${r.recoup.pass ? "#2D7D4633" : "#C0392B33"}` }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: PAL[i], marginBottom: 6 }}>Opt {String.fromCharCode(65 + i)} — {r.loanType}</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 11 }}>
                          <div><span style={{ color: C.muted }}>Saves:</span> <strong>{fmtD(r.recoup.savings)}/mo</strong></div>
                          <div><span style={{ color: C.muted }}>Costs:</span> <strong>{fmt(r.recoup.costs)}</strong></div>
                          <div><span style={{ color: C.muted }}>Recoup:</span> <strong>{r.recoup.months} months</strong></div>
                          <div>
                            <span style={{ padding: "1px 6px", borderRadius: 3, fontSize: 10, fontWeight: 700, background: r.recoup.pass ? "#2D7D4618" : "#C0392B18", color: r.recoup.pass ? C.green : C.red }}>
                              {r.recoup.pass ? "✓ PASS ≤36mo" : "✗ FAIL >36mo"}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : null)}
                  </div>
                </div>
              )}
            </div>

            {/* BAR CHART */}
            <div style={{ background: C.white, borderRadius: 8, border: `1px solid ${C.border}`, padding: 16, marginTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.charcoal, marginBottom: 12, textTransform: "uppercase" }}>Monthly Payment Comparison</div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={results.map((r, i) => ({
                  name: `Opt ${String.fromCharCode(65 + i)}`,
                  "P&I": Math.round(r.pi), Tax: Math.round(r.tax),
                  Ins: Math.round(r.ins), "MI/PMI": Math.round(r.monthlyMip + r.monthlyPmi),
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: C.muted }} />
                  <YAxis tick={{ fontSize: 10, fill: C.muted }} tickFormatter={v => `$${(v / 1000).toFixed(1)}k`} />
                  <Tooltip formatter={v => fmt(v)} contentStyle={{ fontSize: 11, borderRadius: 6 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="P&I" stackId="a" fill={C.cyan} />
                  <Bar dataKey="Tax" stackId="a" fill={C.lime} />
                  <Bar dataKey="Ins" stackId="a" fill="#E67E22" />
                  <Bar dataKey="MI/PMI" stackId="a" fill="#9B59B6" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {/* ═══ FEE BREAKDOWN TAB ═══ */}
        {tab === "fees" && (
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${cnt}, 1fr)`, gap: 12 }}>
            {results.map((r, i) => (
              <div key={i} style={{ background: C.white, borderRadius: 8, border: `1px solid ${C.border}`, overflow: "hidden" }}>
                <div style={{ background: PAL[i], padding: "12px 14px", color: C.white }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>Option {String.fromCharCode(65 + i)} — {r.loanType}</div>
                  <div style={{ fontSize: 10, opacity: 0.7 }}>{(r.rate * 100).toFixed(3)}% | {r.term / 12}yr | {fmt(parseFloat(r.loanAmount) || 0)}</div>
                </div>
                <div style={{ padding: 14 }}>
                  {r.closingDetail ? (
                    <>
                      <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", marginBottom: 6, borderBottom: `1px solid ${C.border}`, paddingBottom: 4 }}>Branch Fees</div>
                      {Object.entries(BRANCH_FEES).map(([k, v]) => v > 0 ? (
                        <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: 11 }}>
                          <span style={{ color: C.muted }}>{k}</span><span style={{ fontWeight: 500 }}>{fmt(v)}</span>
                        </div>
                      ) : null)}
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 11, fontWeight: 700, borderTop: `1px solid ${C.border}`, marginTop: 4 }}>
                        <span>Subtotal</span><span>{fmt(r.closingDetail.branch)}</span>
                      </div>

                      <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", marginBottom: 6, marginTop: 14, borderBottom: `1px solid ${C.border}`, paddingBottom: 4 }}>
                        Title & Escrow — First American (Region 4)
                      </div>
                      {[["Owner's Title Policy", r.closingDetail.title.owners], ["Lender's Title Policy", r.closingDetail.title.lender], ["Escrow / Settlement", r.closingDetail.title.escrow]].map(([label, val]) => (
                        <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: 11 }}>
                          <span style={{ color: C.muted }}>{label}</span><span>{fmt(val)}</span>
                        </div>
                      ))}
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 11, fontWeight: 700, borderTop: `1px solid ${C.border}`, marginTop: 4 }}>
                        <span>Subtotal</span><span>{fmt(r.closingDetail.title.total)}</span>
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: 11, color: C.muted }}>Manual entry: {fmt(r.closing)}</div>
                  )}

                  {(r.fundingFee > 0 || r.vaExempt) && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", marginBottom: 4, borderBottom: `1px solid ${C.border}`, paddingBottom: 4 }}>VA Funding Fee</div>
                      <div style={{ fontSize: 11 }}>
                        {r.vaExempt ? <span style={{ color: C.green, fontWeight: 600 }}>$0 — Disability Exempt</span> : <span>{fmt(r.fundingFee)} ({r.loanType === "VA IRRRL" ? "0.50%" : "2.15%"})</span>}
                      </div>
                    </div>
                  )}

                  {r.ufmip > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", marginBottom: 4, borderBottom: `1px solid ${C.border}`, paddingBottom: 4 }}>FHA UFMIP (Financed)</div>
                      <div style={{ fontSize: 11 }}>{fmt(r.ufmip)} (1.75% of base loan)</div>
                    </div>
                  )}

                  <div style={{ background: C.charcoal, borderRadius: 6, padding: 12, marginTop: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>TOTAL CLOSING</span>
                      <span style={{ fontSize: 18, fontWeight: 700, color: C.cyan }}>{fmt(r.closing + r.fundingFee + r.ufmip)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>TOTAL MONTHLY</span>
                      <span style={{ fontSize: 18, fontWeight: 700, color: C.lime }}>{fmtD(r.totalPayment)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ═══ AMORTIZATION TAB ═══ */}
        {tab === "amort" && (
          <div style={{ background: C.white, borderRadius: 8, border: `1px solid ${C.border}`, padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.charcoal, marginBottom: 16, textTransform: "uppercase" }}>Loan Balance Over Time</div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="year" type="number" domain={[1, Math.max(...results.map(r => r.term / 12))]} tick={{ fontSize: 10, fill: C.muted }} />
                <YAxis tick={{ fontSize: 10, fill: C.muted }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={v => fmt(v)} contentStyle={{ fontSize: 11, borderRadius: 6 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                {results.map((r, i) => (
                  <Area key={i} data={r.amort} dataKey="balance" name={`Opt ${String.fromCharCode(65 + i)} — ${r.loanType}`}
                    stroke={PAL[i]} fill={PAL[i]} fillOpacity={0.06} strokeWidth={2.5} dot={false} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${cnt}, 1fr)`, gap: 12, marginTop: 20 }}>
              {results.map((r, i) => (
                <div key={i} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: PAL[i], marginBottom: 4 }}>Opt {String.fromCharCode(65 + i)} — {r.loanType}</div>
                  <ResponsiveContainer width="100%" height={150}>
                    <PieChart>
                      <Pie data={[{ name: "Principal", value: Math.round(r.totalLoan) }, { name: "Interest", value: Math.round(r.totalInterest) }]}
                        cx="50%" cy="50%" innerRadius={38} outerRadius={60} paddingAngle={2} dataKey="value">
                        <Cell fill={PAL[i]} /><Cell fill={`${PAL[i]}33`} />
                      </Pie>
                      <Tooltip formatter={v => fmt(v)} contentStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ fontSize: 10, color: C.muted }}>
                    Principal: {fmt(r.totalLoan)} | Interest: {fmt(r.totalInterest)} | Ratio: {((r.totalInterest / (r.totalLoan + r.totalInterest)) * 100).toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ RENT VS OWN TAB ═══ */}
        {tab === "rvo" && (
          <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 16 }}>
            <div style={{ background: C.white, borderRadius: 8, border: `1px solid ${C.border}`, padding: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.charcoal, marginBottom: 10, textTransform: "uppercase" }}>Assumptions</div>
              <Inp label="Purchase Price" pre="$" value={rvo.price} onChange={v => setRvo(p => ({ ...p, price: v }))} />
              <Inp label="Down Payment" pre="$" value={rvo.down} onChange={v => setRvo(p => ({ ...p, down: v }))} />
              <Inp label="Rate" suf="%" value={rvo.rate} onChange={v => setRvo(p => ({ ...p, rate: v }))} />
              <Inp label="Monthly Rent" pre="$" value={rvo.rent} onChange={v => setRvo(p => ({ ...p, rent: v }))} />
              <Inp label="Rent Increase/yr" suf="%" value={rvo.ri} onChange={v => setRvo(p => ({ ...p, ri: v }))} />
              <Inp label="Appreciation/yr" suf="%" value={rvo.ap} onChange={v => setRvo(p => ({ ...p, ap: v }))} />
            </div>
            <div>
              {rvoData.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
                  <Stat label="5-Year Wealth Gap" value={fmt(rvoData[4]?.gap || 0)} accent />
                  <Stat label="10-Year Wealth Gap" value={fmt(rvoData[9]?.gap || 0)} />
                  <Stat label="Yr 10 Home Value" value={fmt(rvoData[9]?.hv || 0)} />
                  <Stat label="Yr 10 Equity" value={fmt(rvoData[9]?.equity || 0)} />
                </div>
              )}
              <div style={{ background: C.white, borderRadius: 8, border: `1px solid ${C.border}`, padding: 16 }}>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={rvoData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="year" tick={{ fontSize: 10, fill: C.muted }} />
                    <YAxis tick={{ fontSize: 10, fill: C.muted }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={v => fmt(v)} contentStyle={{ fontSize: 11, borderRadius: 6 }} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Line type="monotone" dataKey="cRent" name="Cumulative Rent" stroke={C.red} strokeWidth={2.5} dot={false} />
                    <Line type="monotone" dataKey="cOwn" name="Cumulative Own" stroke={C.cyan} strokeWidth={2.5} dot={false} />
                    <Line type="monotone" dataKey="equity" name="Equity" stroke={C.green} strokeWidth={2.5} dot={false} strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ═══ COST OF WAITING TAB ═══ */}
        {tab === "cow" && (
          <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 16 }}>
            <div style={{ background: C.white, borderRadius: 8, border: `1px solid ${C.border}`, padding: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.charcoal, marginBottom: 10, textTransform: "uppercase" }}>Assumptions</div>
              <Inp label="Current Price" pre="$" value={cow.price} onChange={v => setCow(p => ({ ...p, price: v }))} />
              <Inp label="Current Rate" suf="%" value={cow.rate} onChange={v => setCow(p => ({ ...p, rate: v }))} />
              <Inp label="Wait (Months)" value={cow.months} onChange={v => setCow(p => ({ ...p, months: v }))} />
              <Inp label="Price Appreciation/yr" suf="%" value={cow.ap} onChange={v => setCow(p => ({ ...p, ap: v }))} />
              <Inp label="Rate Increase/yr" suf="%" value={cow.ri} onChange={v => setCow(p => ({ ...p, ri: v }))} />
            </div>
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}>
                <Stat label="Additional Down Payment" value={fmt(cowData.addDown)} accent />
                <Stat label="Higher Monthly Payment" value={`+${fmtD(cowData.addMo)}/mo`} />
                <Stat label="Additional Lifetime Cost" value={fmt(cowData.addLife)} />
              </div>
              <div style={{ background: C.white, borderRadius: 8, border: `1px solid ${C.border}`, overflow: "hidden" }}>
                <div style={{ background: C.charcoal, padding: "12px 16px", fontSize: 12, fontWeight: 700, color: C.white }}>
                  WHAT WAITING {cow.months} MONTHS REALLY COSTS
                </div>
                <div style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                  <div style={{ borderRight: `2px solid ${C.border}`, paddingRight: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.green, marginBottom: 12, textTransform: "uppercase" }}>Buy Now</div>
                    {[["Price", fmt(cowData.price)], ["Down (5%)", fmt(cowData.cDown)], ["Rate", `${(cowData.rate * 100).toFixed(3)}%`], ["P&I/mo", fmtD(cowData.curPmt)], ["Total (30yr)", fmt(cowData.cTotal)]].map(([l, v]) => (
                      <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}`, fontSize: 12 }}>
                        <span style={{ color: C.muted }}>{l}</span><span style={{ fontWeight: 600 }}>{v}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ paddingLeft: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.warn, marginBottom: 12, textTransform: "uppercase" }}>Wait {cow.months} Months</div>
                    {[
                      ["Price", fmt(cowData.futurePrice), `+${fmt(cowData.futurePrice - cowData.price)}`],
                      ["Down (5%)", fmt(cowData.fDown), `+${fmt(cowData.addDown)}`],
                      ["Rate", `${(cowData.futureRate * 100).toFixed(3)}%`, `+${((cowData.futureRate - cowData.rate) * 100).toFixed(3)}%`],
                      ["P&I/mo", fmtD(cowData.futPmt), `+${fmtD(cowData.addMo)}`],
                      ["Total (30yr)", fmt(cowData.fTotal), `+${fmt(cowData.addLife)}`],
                    ].map(([l, v, d]) => (
                      <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}`, fontSize: 12 }}>
                        <span style={{ color: C.muted }}>{l}</span>
                        <div><span style={{ fontWeight: 600 }}>{v}</span><span style={{ fontSize: 10, color: C.warn, marginLeft: 6 }}>{d}</span></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div style={{ background: C.charcoal, padding: "14px 20px", marginTop: 30, textAlign: "center" }}>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", lineHeight: 1.6 }}>
          Subject to final underwriting approval. Rates and fees subject to change without notice.<br />
          MortgageOne Inc. | NMLS# 898812 | Chris Lamm NMLS# 209221 | Equal Housing Lender
        </div>
      </div>
    </div>
  );
}
