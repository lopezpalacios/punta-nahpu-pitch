/* ============================================================
   PUNTA NAHPU — Financial model engine
   Replicates the waterfall logic of build_modelo.py / build_comparacion.py
   All figures MXN. Validated against modelo_comparacion.xlsx.
   ============================================================ */

const MODEL = {
  // Shared constants (from the source model)
  N_CASAS: 141,
  M2_CASA: 250,
  MES_INICIO_VENTAS: 5,
  LAG_FINIQUITO: 12,            // months between 45% deposit and 55% closing
  PCT_ANTICIPO: 0.45,
  REPARTO_START_MONTH: 18,

  // Fixed costs (independent of price/absorption), incl. VAT
  DIRECT_CON_IVA: 731444774.4,        // construction + site works + 8% VAT
  FIXED_INDIRECT_SUBTOTAL: 107725136.8, // land, project, licenses, ops, marketing, contingency, etc.
  FIXED_INDIRECT_IVA: 6463508.21,
  COMMISSION_PCT: 0.08,                // sales commission on revenue
  COMMISSION_IVA: 0.06,

  // Pininfarina deal
  PF_FIXED: 18180000,                  // $1.01M USD @ 18.0
  PF_ROYALTY: 0.03,

  // Scenario definitions (the plan)
  SCENARIOS: {
    sin: {
      price: 42000,
      absorption: 2.35,
      seed: 100000000,
      pininfarina: false,
      tranches: [
        { month: 1, amount: 50000000 },
        { month: 4, amount: 25000000 },
        { month: 9, amount: 15000000 },
        { month: 14, amount: 10000000 }
      ],
      // Reference values (precomputed in source model)
      ref: { irr: 0.227, moic: 2.36, payback: 3.54, profit: 509320180.59, vgv: 1480500000, cost: 971179819.41, margin: 0.344 }
    },
    con: {
      price: 46200,
      absorption: 3.2,
      seed: 105000000,
      pininfarina: true,
      tranches: [
        { month: 1, amount: 57750000 },
        { month: 4, amount: 26250000 },
        { month: 9, amount: 12600000 },
        { month: 14, amount: 8400000 }
      ],
      ref: { irr: 0.245, moic: 2.50, payback: 3.40, profit: 577779040.59, vgv: 1628550000, cost: 1050770959.41, margin: 0.355 }
    }
  },

  // Tranche metadata for table rendering (i18n-keyed by lang)
  TRANCHE_INFO: {
    en: {
      sin: [
        { trigger: "Legal close with capital partner", use: "Site works start (perimeter, earthworks, roads) + licenses + setup" },
        { trigger: "MIA approved + construction license filed", use: "Continued infrastructure + presales launch prep (month 5)" },
        { trigger: "6 home cohorts actively under construction", use: "Sustain construction ramp-up, parallel cohorts" },
        { trigger: "Pre-closings confirmed, cushion before peak burn (month 16)", use: "Bridge the gap before closing payments flow (month 17+)" }
      ],
      con: [
        { trigger: "Legal close with capital partner", use: "Site works start + licenses + Pininfarina engagement + setup" },
        { trigger: "MIA approved + construction license filed", use: "Continued infrastructure + presales launch prep (month 5)" },
        { trigger: "6 home cohorts actively under construction", use: "Sustain construction ramp-up" },
        { trigger: "Pre-closings confirmed, cushion before peak burn (month 16)", use: "Bridge the gap before closing payments flow" }
      ]
    },
    es: {
      sin: [
        { trigger: "Cierre legal con el socio capitalista", use: "Arranque de obra (barda, terracerías, vialidades) + licencias + arranque" },
        { trigger: "MIA aprobada + licencia de construcción ingresada", use: "Continuación de infraestructura + preparación de preventa (mes 5)" },
        { trigger: "6 cohortes de casas activas en construcción", use: "Sostener el ramp-up de construcción, cohortes paralelas" },
        { trigger: "Pre-finiquitos confirmados, colchón antes del peak burn (mes 16)", use: "Cubrir el gap antes del flujo de finiquitos (mes 17+)" }
      ],
      con: [
        { trigger: "Cierre legal con el socio capitalista", use: "Arranque de obra + licencias + contratación Pininfarina + arranque" },
        { trigger: "MIA aprobada + licencia de construcción ingresada", use: "Continuación de infraestructura + preparación de preventa (mes 5)" },
        { trigger: "6 cohortes de casas activas en construcción", use: "Sostener el ramp-up de construcción" },
        { trigger: "Pre-finiquitos confirmados, colchón antes del peak burn (mes 16)", use: "Cubrir el gap antes del flujo de finiquitos" }
      ]
    }
  },

  // Market data for charts
  MARKET: {
    appreciation2024: [
      { region: "Riviera Maya", value: 14.0 },
      { region: "Mérida", value: 10.2 },
      { region: "Bajío (Qro/Gto)", value: 9.5 },
      { region: "Riviera Nayarit", value: 7.8 },
      { region: "Los Cabos", value: 6.5 },
      { region: "Valle de México", value: 4.1 }
    ],
    comparables: [
      { name: "Mayakoba / North Corridor", price: 85000, range: true },
      { name: "Playacar Fase 1", price: 62000 },
      { name: "Corasol", price: 56000 },
      { name: "Playacar Fase 2", price: 43000 },
      { name: "PUNTA NAHPU", price: 42000, highlight: true },
      { name: "Grand Coral", price: 40000 },
      { name: "Playa Magna", price: 37000 },
      { name: "Senderos de Mayakoba", price: 31000 },
      { name: "Selvamar", price: 29000 },
      { name: "El Cielo", price: 28000 }
    ]
  }
};

/* ------------------------------------------------------------
   Core computation: full project economics from raw inputs
   ------------------------------------------------------------ */
function computeProject(opts) {
  const price = opts.price;                      // MXN per m²
  const absorption = opts.absorption;            // homes / month
  const pininfarina = !!opts.pininfarina;
  const seed = opts.seed;
  const tranches = opts.tranches;

  // Revenue
  const revenue = MODEL.N_CASAS * MODEL.M2_CASA * price;

  // Costs
  const commission = MODEL.COMMISSION_PCT * revenue;
  const indirectSubtotal = MODEL.FIXED_INDIRECT_SUBTOTAL + commission;
  const indirectIva = MODEL.FIXED_INDIRECT_IVA + commission * MODEL.COMMISSION_IVA;
  const pfCost = pininfarina ? MODEL.PF_FIXED + MODEL.PF_ROYALTY * revenue : 0;
  const totalCost = MODEL.DIRECT_CON_IVA + indirectSubtotal + indirectIva + pfCost;

  // Profit
  const profit = revenue - totalCost;
  const margin = profit / revenue;

  // Sales timeline
  const salesMonths = MODEL.N_CASAS / absorption;
  const lastSaleMonth = Math.ceil(MODEL.MES_INICIO_VENTAS + salesMonths);
  const lastClosingMonth = lastSaleMonth + MODEL.LAG_FINIQUITO;

  // Distribution period: stretches if absorption is slow (min 6 years, plan behavior)
  const repartoYears = Math.max(6, Math.ceil((MODEL.MES_INICIO_VENTAS + salesMonths) / 12));

  // Waterfall: seed returned in equal annual installments + 1/3 of distributable profit
  const annualSeedReturn = seed / repartoYears;
  const annualProfit = profit / repartoYears;
  const annualDistributable = annualProfit - annualSeedReturn;
  const investorAnnual = annualSeedReturn + Math.max(0, annualDistributable) / 3;
  const investorTotal = seed > profit
    ? Math.max(0, profit)  // degenerate case: profit below seed — investor gets what exists
    : seed + (profit - seed) / 3;

  const moic = investorTotal / seed;

  // Build monthly cash flow series for the investor (J-curve visualization)
  const totalMonths = Math.max(84, MODEL.REPARTO_START_MONTH + repartoYears * 12);
  const monthly = new Array(totalMonths + 1).fill(0);
  tranches.forEach(tr => { monthly[tr.month] -= tr.amount; });
  for (let y = 0; y < repartoYears; y++) {
    const m = MODEL.REPARTO_START_MONTH + y * 12;
    if (m <= totalMonths) monthly[m] += investorTotal / repartoYears;
  }

  // Cumulative series
  const cumulative = [];
  let acc = 0;
  for (let m = 0; m <= totalMonths; m++) {
    acc += monthly[m];
    cumulative.push(acc);
  }

  // IRR — source-model convention (build_comparacion.py): annual cash flows,
  // full seed at year 0, grace year 1, equal distributions years 2..(1+repartoYears).
  // More conservative than the tranched monthly series; matches the Excel exactly.
  const annualDist = investorTotal / repartoYears;
  const annualCf = [-seed, 0].concat(new Array(repartoYears).fill(annualDist));
  const irrAnnual = irr(annualCf);

  // Payback — source convention: 1 grace year + years of distributions to recover seed
  const paybackYears = annualDist > 0 ? 1 + seed / annualDist : null;
  const paybackMonth = paybackYears !== null ? Math.round(paybackYears * 12) : null;

  // Capital returned month: cumulative distributions >= seed
  let capitalReturnedMonth = null;
  let distAcc = 0;
  for (let m = 0; m <= totalMonths; m++) {
    if (monthly[m] > 0) distAcc += monthly[m];
    if (distAcc >= seed) { capitalReturnedMonth = m; break; }
  }

  return {
    revenue, totalCost, profit, margin, commission, pfCost,
    salesMonths, lastSaleMonth, lastClosingMonth, repartoYears,
    investorTotal, investorAnnual, moic, seed,
    irrAnnual, paybackMonth, paybackYears, capitalReturnedMonth,
    monthly, cumulative, totalMonths
  };
}

/* IRR via bisection (same algorithm as build_comparacion.py) */
function irr(cashflows) {
  const npv = r => cashflows.reduce((acc, cf, i) => acc + cf / Math.pow(1 + r, i), 0);
  let lo = -0.99, hi = 10.0;
  if (npv(lo) * npv(hi) > 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (npv(mid) > 0) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

/* Scenario shortcuts */
function computeScenario(key, overrides) {
  const scn = MODEL.SCENARIOS[key];
  return computeProject(Object.assign({
    price: scn.price,
    absorption: scn.absorption,
    pininfarina: scn.pininfarina,
    seed: scn.seed,
    tranches: scn.tranches
  }, overrides || {}));
}

/* ------------------------------------------------------------
   Formatting helpers
   ------------------------------------------------------------ */
function fmtM(mxn, decimals) {
  const d = decimals === undefined ? 1 : decimals;
  return "$" + (mxn / 1e6).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d }) + "M";
}
function fmtUsdM(mxn, fx) {
  return "$" + (mxn / (fx || 18) / 1e6).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "M USD";
}
function fmtPct(x, decimals) {
  const d = decimals === undefined ? 1 : decimals;
  return (x * 100).toFixed(d) + "%";
}
