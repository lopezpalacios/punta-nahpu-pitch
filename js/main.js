/* ============================================================
   PUNTA NAHPU — Main interactions
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  applyTranslations();
  initNav();
  initLangToggle();
  initScrollReveal();
  initDashboard();
  initCalculator();
  renderAllCharts(dashboardScenario);
  renderTranchesTable(dashboardScenario);
  updateFinHeadline(dashboardScenario);
});

/* ------------------------------------------------------------
   Nav: scrolled state + mobile
   ------------------------------------------------------------ */
function initNav() {
  const nav = document.getElementById("nav");
  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 40);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Mobile burger drawer
  const burger = document.getElementById("navBurger");
  const drawer = document.getElementById("navDrawer");
  if (burger && drawer) {
    burger.addEventListener("click", () => {
      const open = drawer.classList.toggle("open");
      burger.classList.toggle("open", open);
      nav.classList.add("scrolled"); // solid bg while drawer open
    });
    // Close drawer when a link is tapped
    drawer.querySelectorAll("a").forEach(a => {
      a.addEventListener("click", () => {
        drawer.classList.remove("open");
        burger.classList.remove("open");
      });
    });
  }

  // Mobile language toggle mirrors the desktop one
  const mobileToggle = document.getElementById("langToggleMobile");
  if (mobileToggle) {
    mobileToggle.addEventListener("click", () => {
      setLanguage(currentLang === "en" ? "es" : "en");
    });
  }
}

/* ------------------------------------------------------------
   Language toggle
   ------------------------------------------------------------ */
function initLangToggle() {
  const toggle = document.getElementById("langToggle");
  toggle.addEventListener("click", () => {
    setLanguage(currentLang === "en" ? "es" : "en");
  });
  // Re-render dynamic content on language change
  document.addEventListener("langchange", () => {
    renderAllCharts(dashboardScenario);
    renderTranchesTable(dashboardScenario);
    updateFinHeadline(dashboardScenario);
    updateCalculator();
    updatePlanMarks();
  });
}

/* ------------------------------------------------------------
   Scroll reveal — observe section blocks
   ------------------------------------------------------------ */
function initScrollReveal() {
  const targets = document.querySelectorAll(
    ".section-head, .prox-card, .stat-row, .vignette, .pf-col, .chart-card, .risk-card, .doc-item, .wf-step, .timeline-item, .momentum-chart, .comps-chart, .comps-text, .bp-land, .bp-amenities, .fin-headline, .ask-content, .risk-floor, .calc-controls, .calc-outputs"
  );
  targets.forEach(el => el.classList.add("scroll-reveal"));

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

  targets.forEach(el => observer.observe(el));
}

/* ------------------------------------------------------------
   Financial dashboard — scenario toggle
   ------------------------------------------------------------ */
let dashboardScenario = "sin";

function initDashboard() {
  const toggle = document.getElementById("dashboardToggle");
  if (!toggle) return;
  toggle.querySelectorAll(".scn-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      toggle.querySelectorAll(".scn-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      dashboardScenario = btn.dataset.scn;
      updateFinHeadline(dashboardScenario);
      renderCapitalChart(dashboardScenario);
      renderCostsChart(dashboardScenario);
      renderTranchesTable(dashboardScenario);
    });
  });
}

function updateFinHeadline(scnKey) {
  const result = computeScenario(scnKey);
  const fx = 18.0;
  setText("finVgv", fmtM(result.revenue));
  setText("finVgvUsd", fmtUsdM(result.revenue, fx));
  setText("finCost", fmtM(result.totalCost));
  setText("finCostUsd", fmtUsdM(result.totalCost, fx));
  setText("finProfit", fmtM(result.profit));
  setText("finProfitUsd", fmtUsdM(result.profit, fx));
  setText("finMargin", fmtPct(result.margin));
}

function renderTranchesTable(scnKey) {
  const tbody = document.querySelector("#tranchesTable tbody");
  if (!tbody) return;
  const scn = MODEL.SCENARIOS[scnKey];
  const info = MODEL.TRANCHE_INFO[currentLang] ? MODEL.TRANCHE_INFO[currentLang][scnKey] : MODEL.TRANCHE_INFO.en[scnKey];
  const monthWord = currentLang === "es" ? "Mes" : "Month";

  tbody.innerHTML = scn.tranches.map((tr, i) => `
    <tr>
      <td>T${i + 1}</td>
      <td class="mono">${monthWord} ${tr.month}</td>
      <td class="mono">${fmtM(tr.amount, 1)} <span style="color:var(--cream-faint)">(${Math.round(tr.amount / scn.seed * 100)}%)</span></td>
      <td>${info[i].trigger}</td>
      <td>${info[i].use}</td>
    </tr>
  `).join("");
}

/* ------------------------------------------------------------
   Interactive calculator
   ------------------------------------------------------------ */
const calcState = {
  pininfarina: false,
  price: 40000,       // starts conservative, below plan
  absorption: 2.0,    // starts conservative, below plan
  fx: 18.0
};

function initCalculator() {
  const pfToggle = document.getElementById("calcPfToggle");
  const priceSlider = document.getElementById("sliderPrice");
  const absSlider = document.getElementById("sliderAbsorption");
  const fxSlider = document.getElementById("sliderFx");
  const resetBtn = document.getElementById("calcReset");

  if (!priceSlider) return;

  pfToggle.addEventListener("click", () => {
    calcState.pininfarina = !calcState.pininfarina;
    pfToggle.setAttribute("aria-checked", String(calcState.pininfarina));
    // Snap sliders to that scenario's plan values when toggling
    const scn = MODEL.SCENARIOS[calcState.pininfarina ? "con" : "sin"];
    calcState.price = scn.price;
    calcState.absorption = scn.absorption;
    priceSlider.value = scn.price;
    absSlider.value = scn.absorption;
    updatePlanMarks();
    updateCalculator();
  });

  priceSlider.addEventListener("input", () => {
    calcState.price = Number(priceSlider.value);
    updateCalculator();
  });
  absSlider.addEventListener("input", () => {
    calcState.absorption = Number(absSlider.value);
    updateCalculator();
  });
  fxSlider.addEventListener("input", () => {
    calcState.fx = Number(fxSlider.value);
    updateCalculator();
  });

  resetBtn.addEventListener("click", () => {
    const scn = MODEL.SCENARIOS[calcState.pininfarina ? "con" : "sin"];
    calcState.price = scn.price;
    calcState.absorption = scn.absorption;
    calcState.fx = 18.0;
    priceSlider.value = scn.price;
    absSlider.value = scn.absorption;
    fxSlider.value = 18;
    updateCalculator();
  });

  updatePlanMarks();
  updateCalculator();
}

function updatePlanMarks() {
  const priceMark = document.getElementById("pricePlanMark");
  const absMark = document.getElementById("absPlanMark");
  if (priceMark) priceMark.textContent = t(calcState.pininfarina ? "plan_price_pf" : "plan_price");
  if (absMark) absMark.textContent = t(calcState.pininfarina ? "plan_abs_pf" : "plan_abs");
}

function updateCalculator() {
  const scnKey = calcState.pininfarina ? "con" : "sin";
  const scn = MODEL.SCENARIOS[scnKey];

  const result = computeProject({
    price: calcState.price,
    absorption: calcState.absorption,
    pininfarina: calcState.pininfarina,
    seed: scn.seed,
    tranches: scn.tranches
  });

  // Slider value displays
  setText("priceValue", "$" + calcState.price.toLocaleString());
  setText("absValue", calcState.absorption.toFixed(2));
  setText("fxValue", calcState.fx.toFixed(1));

  // Absorption warning (below historical floor)
  const warning = document.getElementById("absWarning");
  if (warning) warning.hidden = calcState.absorption >= 1.5;

  // Outputs
  const yearsWord = t("years_label");
  const monthsWord = t("months_label");

  const irrEl = document.getElementById("outIrr");
  if (result.irrAnnual !== null && result.profit > 0) {
    irrEl.textContent = fmtPct(result.irrAnnual);
    irrEl.classList.remove("negative");
  } else if (result.profit <= 0) {
    irrEl.textContent = "—";
    irrEl.classList.add("negative");
  } else {
    irrEl.textContent = "n/a";
    irrEl.classList.remove("negative");
  }

  const moicEl = document.getElementById("outMoic");
  moicEl.textContent = result.moic.toFixed(2) + "×";
  moicEl.classList.toggle("negative", result.moic < 1);

  const paybackEl = document.getElementById("outPayback");
  if (result.paybackYears !== null && result.profit > 0) {
    paybackEl.textContent = result.paybackYears.toFixed(1) + " " + yearsWord;
    paybackEl.classList.remove("negative");
  } else {
    paybackEl.textContent = "—";
    paybackEl.classList.add("negative");
  }

  const profitEl = document.getElementById("outProfit");
  profitEl.textContent = fmtM(result.profit, 0);
  profitEl.classList.toggle("negative", result.profit < 0);

  setText("outInvestorTotal", fmtM(result.investorTotal, 0));
  setText("outSelldown", Math.ceil(result.salesMonths + MODEL.MES_INICIO_VENTAS) + " " + monthsWord);

  // USD equivalents in tooltips via title attribute
  document.getElementById("outProfit").title = fmtUsdM(result.profit, calcState.fx);
  document.getElementById("outInvestorTotal").title = fmtUsdM(result.investorTotal, calcState.fx);

  // Verdict line
  const verdict = document.getElementById("calcVerdict");
  if (result.profit <= 0) {
    const pctBelow = Math.round((1 - calcState.price / 42000) * 100);
    verdict.textContent = t("calc_verdict_negative").replace("{pct}", String(Math.abs(pctBelow)));
  } else if (result.moic >= 1.8 && result.irrAnnual > 0.15) {
    verdict.textContent = t("calc_verdict_strong")
      .replace("{total}", fmtM(result.investorTotal, 0) + " MXN")
      .replace("{seed}", fmtM(result.seed, 0) + " MXN")
      .replace("{months}", String(Math.ceil(result.salesMonths + MODEL.MES_INICIO_VENTAS)));
  } else {
    verdict.textContent = t("calc_verdict_weak");
  }

  // Live chart
  renderCalcChart(result);
}

/* ------------------------------------------------------------
   Helpers
   ------------------------------------------------------------ */
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
