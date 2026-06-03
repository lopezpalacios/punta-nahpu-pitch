/* ============================================================
   PUNTA NAHPU — Chart.js dashboards
   ============================================================ */

const CHART_COLORS = {
  cream: "#ede4d2",
  creamDim: "rgba(237, 228, 210, 0.62)",
  creamFaint: "rgba(237, 228, 210, 0.35)",
  gold: "#c9a872",
  goldBright: "#ddc193",
  goldFill: "rgba(201, 168, 114, 0.12)",
  emerald: "#4d9670",
  emeraldBright: "#6fc294",
  emeraldFill: "rgba(77, 150, 112, 0.12)",
  red: "#c97a6e",
  line: "rgba(237, 228, 210, 0.08)"
};

// Global Chart.js defaults — match the editorial system
Chart.defaults.font.family = "'Spline Sans Mono', monospace";
Chart.defaults.font.size = 11;
Chart.defaults.color = CHART_COLORS.creamFaint;
Chart.defaults.borderColor = CHART_COLORS.line;
Chart.defaults.plugins.legend.labels.boxWidth = 12;
Chart.defaults.plugins.legend.labels.boxHeight = 12;
Chart.defaults.plugins.legend.labels.padding = 18;
Chart.defaults.plugins.tooltip.backgroundColor = "rgba(12, 18, 15, 0.95)";
Chart.defaults.plugins.tooltip.borderColor = "rgba(200, 169, 110, 0.4)";
Chart.defaults.plugins.tooltip.borderWidth = 1;
Chart.defaults.plugins.tooltip.titleColor = "#ddc193";
Chart.defaults.plugins.tooltip.bodyColor = "#ede4d2";
Chart.defaults.plugins.tooltip.padding = 12;
Chart.defaults.plugins.tooltip.cornerRadius = 2;
Chart.defaults.plugins.tooltip.titleFont = { family: "'Spline Sans Mono', monospace", size: 12 };
Chart.defaults.plugins.tooltip.bodyFont = { family: "'Spline Sans Mono', monospace", size: 12 };

const charts = {};  // registry for re-rendering on language / scenario change

function destroyChart(id) {
  if (charts[id]) { charts[id].destroy(); delete charts[id]; }
}

/* ------------------------------------------------------------
   1. Appreciation by region (horizontal bars)
   ------------------------------------------------------------ */
function renderAppreciationChart() {
  destroyChart("appreciation");
  const ctx = document.getElementById("chartAppreciation");
  if (!ctx) return;
  const data = MODEL.MARKET.appreciation2024;
  charts.appreciation = new Chart(ctx, {
    type: "bar",
    data: {
      labels: data.map(d => d.region),
      datasets: [{
        data: data.map(d => d.value),
        backgroundColor: data.map(d => d.region === "Riviera Maya" ? CHART_COLORS.gold : "rgba(237, 228, 210, 0.15)"),
        borderColor: data.map(d => d.region === "Riviera Maya" ? CHART_COLORS.goldBright : "transparent"),
        borderWidth: 1,
        barThickness: 26
      }]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: c => " " + c.parsed.x.toFixed(1) + "%" } }
      },
      scales: {
        x: {
          grid: { color: CHART_COLORS.line },
          ticks: { callback: v => v + "%" },
          max: 16
        },
        y: {
          grid: { display: false },
          ticks: { color: CHART_COLORS.creamDim, font: { size: 12 } }
        }
      }
    }
  });
}

/* ------------------------------------------------------------
   2. Comparables (horizontal bars, Nahpu highlighted)
   ------------------------------------------------------------ */
function renderCompsChart() {
  destroyChart("comps");
  const ctx = document.getElementById("chartComps");
  if (!ctx) return;
  const data = MODEL.MARKET.comparables;
  charts.comps = new Chart(ctx, {
    type: "bar",
    data: {
      labels: data.map(d => d.name),
      datasets: [{
        data: data.map(d => d.price),
        backgroundColor: data.map(d => d.highlight ? CHART_COLORS.gold : (d.range ? CHART_COLORS.emeraldFill : "rgba(237, 228, 210, 0.15)")),
        borderColor: data.map(d => d.highlight ? CHART_COLORS.goldBright : (d.range ? CHART_COLORS.emerald : "transparent")),
        borderWidth: 1,
        barThickness: 22
      }]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: c => {
              const d = data[c.dataIndex];
              return d.range ? " $65,000–105,000 MXN/m² (midpoint shown)" : " $" + c.parsed.x.toLocaleString() + " MXN/m²";
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: CHART_COLORS.line },
          ticks: { callback: v => "$" + (v / 1000) + "K" }
        },
        y: {
          grid: { display: false },
          ticks: {
            color: c => data[c.index] && data[c.index].highlight ? CHART_COLORS.goldBright : CHART_COLORS.creamDim,
            font: c => ({
              size: 12,
              weight: data[c.index] && data[c.index].highlight ? "600" : "400",
              family: "'Spline Sans Mono', monospace"
            })
          }
        }
      }
    }
  });
}

/* ------------------------------------------------------------
   3. J-curve: investor cumulative cash flow (3 series)
   ------------------------------------------------------------ */
function renderJcurveChart() {
  destroyChart("jcurve");
  const ctx = document.getElementById("chartJcurve");
  if (!ctx) return;

  const sin = computeScenario("sin");
  const con = computeScenario("con");
  const downside = computeScenario("sin", { absorption: 1.8 });

  const maxMonths = Math.max(sin.totalMonths, con.totalMonths, downside.totalMonths);
  const labels = Array.from({ length: maxMonths + 1 }, (_, i) => i);

  const toSeries = r => labels.map(m => m < r.cumulative.length ? r.cumulative[m] / 1e6 : r.cumulative[r.cumulative.length - 1] / 1e6);

  charts.jcurve = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: t("ch_base"),
          data: toSeries(sin),
          borderColor: CHART_COLORS.emerald,
          backgroundColor: CHART_COLORS.emeraldFill,
          borderWidth: 2,
          pointRadius: 0,
          fill: true,
          tension: 0.15
        },
        {
          label: t("ch_pininfarina"),
          data: toSeries(con),
          borderColor: CHART_COLORS.gold,
          backgroundColor: "transparent",
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.15
        },
        {
          label: t("ch_downside"),
          data: toSeries(downside),
          borderColor: CHART_COLORS.red,
          backgroundColor: "transparent",
          borderWidth: 1.5,
          borderDash: [6, 5],
          pointRadius: 0,
          tension: 0.15
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { position: "top", align: "end", labels: { color: CHART_COLORS.creamDim } },
        tooltip: {
          callbacks: {
            title: items => t("ch_months") + " " + items[0].label,
            label: c => " " + c.dataset.label + ": $" + c.parsed.y.toFixed(1) + "M MXN"
          }
        }
      },
      scales: {
        x: {
          grid: { color: CHART_COLORS.line },
          title: { display: true, text: t("ch_months"), color: CHART_COLORS.creamFaint },
          ticks: { maxTicksLimit: 15 }
        },
        y: {
          grid: {
            color: c => c.tick.value === 0 ? "rgba(237, 228, 210, 0.35)" : CHART_COLORS.line,
            lineWidth: c => c.tick.value === 0 ? 1.5 : 1
          },
          title: { display: true, text: t("ch_cum_cashflow"), color: CHART_COLORS.creamFaint },
          ticks: { callback: v => "$" + v + "M" }
        }
      }
    }
  });
}

/* ------------------------------------------------------------
   4. Absorption sell-down
   ------------------------------------------------------------ */
function renderAbsorptionChart() {
  destroyChart("absorption");
  const ctx = document.getElementById("chartAbsorption");
  if (!ctx) return;

  const scenarios = [
    { key: "sin", color: CHART_COLORS.emerald, label: t("ch_base"), abs: 2.35 },
    { key: "con", color: CHART_COLORS.gold, label: t("ch_pininfarina"), abs: 3.2 }
  ];

  const maxMonth = 70;
  const labels = Array.from({ length: maxMonth + 1 }, (_, i) => i);

  const datasets = scenarios.map(s => {
    const data = labels.map(m => {
      if (m < MODEL.MES_INICIO_VENTAS) return MODEL.N_CASAS;
      return Math.max(0, MODEL.N_CASAS - (m - MODEL.MES_INICIO_VENTAS) * s.abs);
    });
    return {
      label: s.label,
      data,
      borderColor: s.color,
      backgroundColor: "transparent",
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.1,
      stepped: false
    };
  });

  charts.absorption = new Chart(ctx, {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { position: "top", align: "end", labels: { color: CHART_COLORS.creamDim } },
        tooltip: {
          callbacks: {
            title: items => t("ch_months") + " " + items[0].label,
            label: c => " " + c.dataset.label + ": " + Math.round(c.parsed.y) + " " + t("ch_homes_left").toLowerCase()
          }
        }
      },
      scales: {
        x: {
          grid: { color: CHART_COLORS.line },
          title: { display: true, text: t("ch_months"), color: CHART_COLORS.creamFaint },
          ticks: { maxTicksLimit: 12 }
        },
        y: {
          grid: { color: CHART_COLORS.line },
          title: { display: true, text: t("ch_homes_left"), color: CHART_COLORS.creamFaint },
          min: 0, max: 150
        }
      }
    }
  });
}

/* ------------------------------------------------------------
   5. Capital deployment vs presale inflows (first 24 months)
   ------------------------------------------------------------ */
function renderCapitalChart(scnKey) {
  destroyChart("capital");
  const ctx = document.getElementById("chartCapital");
  if (!ctx) return;

  const scn = MODEL.SCENARIOS[scnKey || "sin"];
  const months = 24;
  const labels = Array.from({ length: months }, (_, i) => i + 1);

  const trancheData = labels.map(m => {
    const tr = scn.tranches.find(x => x.month === m);
    return tr ? tr.amount / 1e6 : 0;
  });

  const housePrice = MODEL.M2_CASA * scn.price;
  const presaleData = labels.map(m => {
    if (m < MODEL.MES_INICIO_VENTAS) return 0;
    // 45% deposits from monthly sales + 55% closings 12 months after each sale
    let inflow = scn.absorption * housePrice * MODEL.PCT_ANTICIPO;
    const saleMonthOfClosings = m - MODEL.LAG_FINIQUITO;
    if (saleMonthOfClosings >= MODEL.MES_INICIO_VENTAS) {
      inflow += scn.absorption * housePrice * (1 - MODEL.PCT_ANTICIPO);
    }
    return inflow / 1e6;
  });

  charts.capital = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: t("ch_capital_out"),
          data: trancheData,
          backgroundColor: CHART_COLORS.gold,
          borderColor: CHART_COLORS.goldBright,
          borderWidth: 1,
          barPercentage: 0.7
        },
        {
          label: t("ch_presale_in"),
          data: presaleData,
          backgroundColor: CHART_COLORS.emeraldFill,
          borderColor: CHART_COLORS.emerald,
          borderWidth: 1,
          barPercentage: 0.7
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "top", align: "end", labels: { color: CHART_COLORS.creamDim } },
        tooltip: {
          callbacks: {
            title: items => t("ch_months") + " " + items[0].label,
            label: c => " " + c.dataset.label + ": $" + c.parsed.y.toFixed(1) + "M"
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          title: { display: true, text: t("ch_months"), color: CHART_COLORS.creamFaint },
          stacked: false
        },
        y: {
          grid: { color: CHART_COLORS.line },
          ticks: { callback: v => "$" + v + "M" }
        }
      }
    }
  });
}

/* ------------------------------------------------------------
   6. Cost breakdown (horizontal bars)
   ------------------------------------------------------------ */
function renderCostsChart(scnKey) {
  destroyChart("costs");
  const ctx = document.getElementById("chartCosts");
  if (!ctx) return;

  const isCon = scnKey === "con";
  const result = computeScenario(scnKey || "sin");

  const items = currentLang === "es" ? [
    { label: "Construcción 141 casas", value: 599250000 },
    { label: "Obras complementarias e infraestructura", value: 78013680 },
    { label: "Terreno", value: 56000000 },
    { label: "Comisiones de venta (8%)", value: result.commission },
    { label: "Gastos indirectos y operación", value: 51725136.8 },
    { label: "IVA total", value: result.totalCost - 599250000 - 78013680 - 56000000 - result.commission - 51725136.8 - result.pfCost },
    { label: "Pininfarina (fijo + regalía 3%)", value: result.pfCost }
  ] : [
    { label: "Construction — 141 homes", value: 599250000 },
    { label: "Site works & infrastructure", value: 78013680 },
    { label: "Land", value: 56000000 },
    { label: "Sales commissions (8%)", value: result.commission },
    { label: "Indirect costs & operations", value: 51725136.8 },
    { label: "Total VAT", value: result.totalCost - 599250000 - 78013680 - 56000000 - result.commission - 51725136.8 - result.pfCost },
    { label: "Pininfarina (fixed + 3% royalty)", value: result.pfCost }
  ];

  const filtered = items.filter(i => i.value > 0);

  charts.costs = new Chart(ctx, {
    type: "bar",
    data: {
      labels: filtered.map(i => i.label),
      datasets: [{
        data: filtered.map(i => i.value / 1e6),
        backgroundColor: filtered.map((i, idx) =>
          i.label.includes("Pininfarina") ? CHART_COLORS.gold : "rgba(237, 228, 210, " + (0.28 - idx * 0.028) + ")"),
        borderColor: filtered.map(i => i.label.includes("Pininfarina") ? CHART_COLORS.goldBright : "transparent"),
        borderWidth: 1,
        barThickness: 28
      }]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: c => " $" + c.parsed.x.toFixed(1) + "M MXN (" + (c.parsed.x * 1e6 / result.totalCost * 100).toFixed(1) + "%)"
          }
        }
      },
      scales: {
        x: {
          grid: { color: CHART_COLORS.line },
          ticks: { callback: v => "$" + v + "M" }
        },
        y: {
          grid: { display: false },
          ticks: { color: CHART_COLORS.creamDim, font: { size: 12 } }
        }
      }
    }
  });
}

/* ------------------------------------------------------------
   7. Calculator live J-curve
   ------------------------------------------------------------ */
function renderCalcChart(result) {
  destroyChart("calc");
  const ctx = document.getElementById("chartCalc");
  if (!ctx) return;

  const labels = Array.from({ length: result.totalMonths + 1 }, (_, i) => i);
  const data = result.cumulative.map(v => v / 1e6);

  charts.calc = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: t("ch_your_scenario"),
        data,
        borderColor: CHART_COLORS.goldBright,
        backgroundColor: CHART_COLORS.goldFill,
        borderWidth: 2.5,
        pointRadius: 0,
        fill: true,
        tension: 0.15
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 350 },
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: items => t("ch_months") + " " + items[0].label,
            label: c => " $" + c.parsed.y.toFixed(1) + "M MXN"
          }
        }
      },
      scales: {
        x: {
          grid: { color: CHART_COLORS.line },
          title: { display: true, text: t("ch_months"), color: CHART_COLORS.creamFaint },
          ticks: { maxTicksLimit: 14 }
        },
        y: {
          grid: {
            color: c => c.tick.value === 0 ? "rgba(237, 228, 210, 0.35)" : CHART_COLORS.line,
            lineWidth: c => c.tick.value === 0 ? 1.5 : 1
          },
          ticks: { callback: v => "$" + v + "M" }
        }
      }
    }
  });
}

/* Render all static charts */
function renderAllCharts(scnKey) {
  renderAppreciationChart();
  renderCompsChart();
  renderJcurveChart();
  renderAbsorptionChart();
  renderCapitalChart(scnKey);
  renderCostsChart(scnKey);
}
