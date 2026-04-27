(function () {

  const SETTINGS_ID = "69d3ed400021197ed76e";
  const SIT_ID      = "68cd6b7f00330a840d96";
  let _chart7d = null;

  const { fmtShort } = window._utils;

  window._sections.overview = async function loadOverview() {
    const { state } = window._dash;
    const hour     = new Date().getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

    const overviewTitleEl = document.getElementById("overviewTitle");
    if (overviewTitleEl) overviewTitleEl.textContent = `${greeting}, ${(state.profile.name || "").split(" ")[0]}`;

    if (state.role === "owner") {
      const overviewSubEl = document.getElementById("overviewSub");
      if (overviewSubEl) overviewSubEl.textContent = state.company?.name || "Your company";
      const overviewStatsEl = document.getElementById("overviewStats");
      if (overviewStatsEl) overviewStatsEl.innerHTML = `
        <div class="stat-card"><div class="stat-val">${state.stations.length}</div><div class="stat-label">Stations</div></div>
        <div class="stat-card"><div class="stat-val">${state.managers.length}</div><div class="stat-label">Managers</div></div>
        <div class="stat-card"><div class="stat-val">${state.pompistes.length}</div><div class="stat-label">Pompistes</div></div>
      `;
      const overviewChartsEl = document.getElementById("overviewCharts");
      if (overviewChartsEl) overviewChartsEl.innerHTML = "";
      return;
    }

    // ── Manager view ──────────────────────────────────────────────────────────
    const overviewSubEl = document.getElementById("overviewSub");
    if (overviewSubEl) overviewSubEl.textContent = state.profile.name || "Your station";
    const overviewStatsEl = document.getElementById("overviewStats");
    if (overviewStatsEl) overviewStatsEl.innerHTML = `
      <div class="stat-card"><div class="stat-val">${state.pompistes.length}</div><div class="stat-label">Pompistes</div></div>
      <div class="stat-card"><div class="stat-val" id="ov-pms">—</div><div class="stat-label">PMS (RWF/L)</div></div>
      <div class="stat-card"><div class="stat-val" id="ov-ago">—</div><div class="stat-label">AGO (RWF/L)</div></div>
      <div class="stat-card"><div class="stat-val" id="ov-momo">—</div><div class="stat-label">MoMo Fee</div></div>
      <div class="stat-card"><div class="stat-val" id="ov-today">—</div><div class="stat-label">Today</div></div>
      <div class="stat-card"><div class="stat-val" id="ov-month-vente">—</div><div class="stat-label">This Month (RWF)</div></div>
      <div class="stat-card"><div class="stat-val" id="ov-month-gain">—</div><div class="stat-label">Monthly Gain</div></div>
    `;
    const overviewChartsEl = document.getElementById("overviewCharts");
    if (overviewChartsEl) overviewChartsEl.innerHTML = `
      <div class="chart-card">
        <div class="chart-card-title">Last 7 Days — Total Sales (RWF)</div>
        <div class="chart-wrap"><canvas id="ov-chart-7d"></canvas></div>
      </div>
    `;

    // Fuel settings
    try {
      const settRes = await _AW.db.listDocuments(_AW.DB_ID, SETTINGS_ID);
      if (settRes.documents.length > 0) {
        const doc = settRes.documents[0];
        const ovPmsEl = document.getElementById("ov-pms");
        if (ovPmsEl) ovPmsEl.textContent = doc.pmsPrice != null ? Number(doc.pmsPrice).toLocaleString() : "—";
        const ovAgoEl = document.getElementById("ov-ago");
        if (ovAgoEl) ovAgoEl.textContent = doc.agoPrice != null ? Number(doc.agoPrice).toLocaleString() : "—";
        const ovMomoEl = document.getElementById("ov-momo");
        if (ovMomoEl) ovMomoEl.textContent = doc.momoFeePercent != null ? doc.momoFeePercent + "%" : "—";
        if (doc.stationName) if (overviewSubEl) overviewSubEl.textContent = doc.stationName;
      }
    } catch {}

    // Situation docs for current month
    try {
      const now   = new Date();
      const y     = now.getFullYear();
      const m     = String(now.getMonth() + 1).padStart(2, "0");
      const today = now.toISOString().substring(0, 10);

      const sitRes = await _AW.db.listDocuments(_AW.DB_ID, SIT_ID, [
        Appwrite.Query.greaterThanEqual("logDate", `${y}-${m}-01`),
        Appwrite.Query.lessThanEqual("logDate",    `${y}-${m}-31`),
        Appwrite.Query.orderDesc("logDate"),
        Appwrite.Query.limit(31),
      ]);
      const docs = sitRes.documents;

      // Today's status card
      const todayDoc = docs.find(d => String(d.logDate).substring(0, 10) === today);
      const todayEl = document.getElementById("ov-today");
      if (todayEl) {
        if (todayDoc) {
          todayEl.textContent = todayDoc.done ? "Done ✓" : "Pending";
          todayEl.className   = `stat-val ${todayDoc.done ? "stat-ok" : "stat-warn"}`;
        } else {
          todayEl.textContent = "No entry";
          todayEl.className   = "stat-val stat-muted";
        }
      }

      // Monthly totals
      const monthVente = docs.reduce((s, d) => s + (Number(d.totalVente)    || 0), 0);
      const monthGain  = docs.reduce((s, d) => s + (Number(d.gainPayments)  || 0), 0);
      const ovMonthVenteEl = document.getElementById("ov-month-vente");
      if (ovMonthVenteEl) ovMonthVenteEl.textContent = monthVente > 0 ? fmtShort(monthVente) : "—";
      const gainEl = document.getElementById("ov-month-gain");
      if (gainEl) {
        gainEl.textContent = monthGain !== 0 ? (monthGain >= 0 ? "+" : "") + fmtShort(monthGain) : "—";
        gainEl.className   = `stat-val ${monthGain >= 0 ? "stat-ok" : "stat-warn"}`;
      }

      // Last 7 days for bar chart
      const last7 = [];
      for (let i = 6; i >= 0; i--) {
        const d  = new Date(now);
        d.setDate(d.getDate() - i);
        const ds = d.toISOString().substring(0, 10);
        const dd = docs.find(x => String(x.logDate).substring(0, 10) === ds);
        last7.push({
          label: d.toLocaleDateString("default", { weekday: "short", day: "numeric" }),
          vente: dd != null ? (Number(dd.totalVente) || 0) : null,
          gain:  dd != null ? (Number(dd.gainPayments) || 0) : 0,
        });
      }

      if (_chart7d) { _chart7d.destroy(); _chart7d = null; }
      const ctx = document.getElementById("ov-chart-7d");
      if (ctx && window.Chart) {
        _chart7d = new Chart(ctx, {
          type: "bar",
          data: {
            labels: last7.map(d => d.label),
            datasets: [{
              label: "Total Sales (RWF)",
              data:  last7.map(d => d.vente),
              backgroundColor: last7.map(d =>
                d.vente === null  ? "rgba(148,163,184,0.25)"
                : d.gain >= 0    ? "rgba(22,163,74,0.75)"
                                 : "rgba(220,38,38,0.75)"
              ),
              borderRadius: 6,
              borderSkipped: false,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: c => c.raw === null ? "No data" : "RWF " + Number(c.raw).toLocaleString(),
                },
              },
            },
            scales: {
              x: { grid: { display: false }, ticks: { font: { size: 11 } } },
              y: {
                beginAtZero: true,
                ticks: { callback: v => fmtShort(v), font: { size: 11 } },
                grid: { color: "rgba(0,0,0,0.05)" },
              },
            },
          },
        });
      }
    } catch {}
  };

})();
