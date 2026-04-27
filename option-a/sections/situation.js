(function () {

  const SIT_ID   = "68cd6b7f00330a840d96";
  const STOCK_ID = "6908ab260012e0412ca8";

  let calMonth   = { year: new Date().getFullYear(), month: new Date().getMonth() + 1 };
  let activeDate = null;
  let monthCache = {};

  const { safeDate, fmt, fmtShort, monthLabel } = window._utils;
  const { apiFetch } = window._dash;

  async function _fetchMonthFull(year, month) {
    const mm  = String(month).padStart(2, "0");
    const res = await apiFetch(`/situation?month=${mm}&year=${year}`);
    const data = await res.json();
    return data.situations || [];
  }

  function cacheFromDocs(docs) {
    docs.forEach(doc => {
      const ld  = safeDate(doc.logDate);
      const key = ld.substring(0, 7);
      if (!monthCache[key]) monthCache[key] = [];
      if (!monthCache[key].find(d => d.logDate === ld))
        monthCache[key].push({ logDate: ld, done: doc.done });
    });
  }

  async function fetchMonthDates(year, month) {
    const key = `${year}-${String(month).padStart(2, "0")}`;
    if (monthCache[key]) return monthCache[key];
    const mm  = String(month).padStart(2, "0");
    
    const res = await apiFetch(`/situation?month=${mm}&year=${year}`);
    const data = await res.json();
    monthCache[key] = (data.situations || []).map(d => ({ logDate: safeDate(d.logDate), done: d.done }));
    return monthCache[key];
  }

  async function buildCalendar(year, month) {
    let dates = [];
    try { dates = await fetchMonthDates(year, month); } catch {}
    window._utils.renderCalendar({
      gridId:       "calGrid",
      labelId:      "calMonthLabel",
      year, month,
      entries:      dates.map(d => ({ date: d.logDate, done: d.done })),
      selectedDate: activeDate,
      weekStart:    "mon",
      onDayClick:   selectDate,
    });
  }

  function buildRecentList(docs) {
    const list = document.getElementById("recentList");
    if (!list) return;
    list.innerHTML = "";
    docs.forEach(doc => {
      const ld      = safeDate(doc.logDate);
      const d       = new Date(ld + "T00:00:00");
      const display = d.toLocaleString("default", { day: "numeric", month: "short", year: "numeric" });
      const dayName = d.toLocaleString("default", { weekday: "short" });
      const item    = document.createElement("div");
      item.className    = "recent-item";
      item.dataset.date = ld;
      item.innerHTML = `
        <div class="recent-dot" style="background:${doc.done ? "var(--pms)" : "var(--navy-light)"}"></div>
        <div class="recent-info">
          <div class="recent-date">${display}</div>
          <div class="recent-meta">${dayName} · ${doc.done ? "Done ✓" : "Pending"}</div>
        </div>
        <div class="recent-total">${fmtShort(doc.totalPayments)}</div>
      `;
      item.onclick = () => selectDate(ld);
      list.appendChild(item);
    });
  }

  async function selectDate(date) {
    activeDate = date;
    document.querySelectorAll(".recent-item").forEach(el =>
      el.classList.toggle("recent-active", el.dataset.date === date)
    );
    const [y, m] = date.split("-").map(Number);
    if (y === calMonth.year && m === calMonth.month) await buildCalendar(y, m);
    await loadSituationDate(date);
  }

  async function loadSituationDate(date) {
    const toast  = window._dash.toast;
    date         = safeDate(date);
    const mainEl = document.getElementById("sitMain");
    if (!mainEl) return;
    mainEl.classList.add("sit-loading");
    try {
      const [y, m] = date.split("-");
      const [sitRes, stockRes, stockDailyPmsRes, stockDailyAgoRes] = await Promise.all([
       apiFetch(`/situation/me?logDate=${date}`).then(r => r.json()),
       apiFetch(`/stock/me?monthYear=${y}-${m}`).then(r => r.json()),
       apiFetch(`/stock-daily/me?logDate=${date}&fuelType=PMS`).then(r => r.json()),
       apiFetch(`/stock-daily/me?logDate=${date}&fuelType=AGO`).then(r => r.json()),
      ]);
      if (!sitRes.situation || sitRes.situation.documents.length === 0) {
        const loadedDateEl = document.getElementById("loadedDate");
        if (loadedDateEl) loadedDateEl.textContent = "No data for " + date;
        const donePillEl = document.getElementById("donePill");
        if (donePillEl) donePillEl.textContent = "";
        return;
      }
      const doc      = sitRes.situation.documents[0];
      const stockDoc = stockRes.stock?.documents[0] || null;
      const stockDailyPmsDoc = stockDailyPmsRes.stockDaily?.documents[0] || null;
      const stockDailyAgoDoc = stockDailyAgoRes.stockDaily?.documents[0] || null;
      const d = new Date(date + "T00:00:00");
      const loadedDateEl = document.getElementById("loadedDate");
      if (loadedDateEl) loadedDateEl.textContent = isNaN(d) ? date : d.toLocaleString("default", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
      const pill = document.getElementById("donePill");
      if (pill) {
        pill.textContent      = doc.done ? "Done ✓" : "Pending";
        pill.style.background = doc.done ? "var(--pms-bg)" : "#fff7ed";
        pill.style.color      = doc.done ? "var(--pms)"    : "var(--ago)";
      }
      const sheetDateEl = document.getElementById("sheetDate");
      if (sheetDateEl) sheetDateEl.textContent = date;
      ["pms1","pms2","pms3","pms4","ago1","ago2","ago3","ago4"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = fmt(doc[id]);
      });
      if (doc.done) {
        const p1El = document.getElementById("p1_essence");
        if (p1El) p1El.textContent = fmt((doc.pms2 || 0) - (doc.pms1 || 0));
        const p2El = document.getElementById("p2_essence");
        if (p2El) p2El.textContent = fmt((doc.pms4 || 0) - (doc.pms3 || 0));
        const p3El = document.getElementById("p3_gasoil");
        if (p3El) p3El.textContent = fmt((doc.ago2 || 0) - (doc.ago1 || 0));
        const p4El = document.getElementById("p4_gasoil");
        if (p4El) p4El.textContent = fmt((doc.ago4 || 0) - (doc.ago3 || 0));
      } else {
        ["p1_essence","p2_essence","p3_gasoil","p4_gasoil"].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.textContent = "—";
        });
      }
      const ventePms = Number(doc.venteLitresPms) || 0;
      const venteAgo = Number(doc.venteLitresAgo) || 0;
      [
        ["totalPms", doc.totalPms], ["totalAgo", doc.totalAgo], ["totalVente", doc.totalVente],
        ["pmsPrices", doc.pmsPrice], ["agoPrices", doc.agoPrice],
        ["totalPayments", doc.totalPayments], ["momo", doc.momo], ["momoLoss", doc.momoLoss],
        ["spFuelCard", doc.spFuelCard], ["bankCard", doc.bankCard], ["totalFiche", doc.totalFiche],
        ["bon", doc.bon], ["totalCash", doc.totalCash],
        ["initialPms", stockDailyPmsDoc?.initialStock], ["initialAgo", stockDailyAgoDoc?.initialStock],
        ["receivedPms", stockDailyPmsDoc?.receivedLitres], ["receivedAgo", stockDailyAgoDoc?.receivedLitres],
        ["venteLitresPmsStock", ventePms], ["venteLitresAgoStock", venteAgo],
        ["theoryStockPms", stockDailyPmsDoc?.theoryStock], ["theoryStockAgo", stockDailyAgoDoc?.theoryStock],
        ["physicalStockPms", stockDailyPmsDoc?.physicalStock], ["physicalStockAgo", stockDailyAgoDoc?.physicalStock],
        ["gainFuelPms", stockDailyPmsDoc?.gainFuel], ["gainFuelAgo", stockDailyAgoDoc?.gainFuel],
      ].forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = typeof val === "number" ? val : Number(val) || 0;
      });
      const totalGainPmsEl = document.getElementById("totalGainFuelPms");
      if (totalGainPmsEl) totalGainPmsEl.textContent = stockDoc ? fmt(stockDoc.totalGainFuelPms) : "—";
      const totalGainAgoEl = document.getElementById("totalGainFuelAgo");
      if (totalGainAgoEl) totalGainAgoEl.textContent = stockDoc ? fmt(stockDoc.totalGainFuelAgo) : "—";
      const doneEl = document.getElementById("done");
      if (doneEl) doneEl.textContent = doc.done ? "Yes ✓" : "No";
    } catch (err) {
      toast("Error loading situation: " + (err?.message || err), "error");
    } finally {
      mainEl.classList.remove("sit-loading");
    }
  }

  async function initSituation() {
    const toast = window._dash.toast;
    try {
      const now = new Date();
      const y   = now.getFullYear();
      const m   = now.getMonth() + 1;
      calMonth  = { year: y, month: m };
      const docs = await _fetchMonthFull(y, m);
      if (docs.length > 0) {
        cacheFromDocs(docs);
        await buildCalendar(y, m);
        buildRecentList(docs);
        await selectDate(safeDate(docs[0].logDate));
        return;
      }
      
      const fallbackRes = await apiFetch(`/situation?limit=1`);
      const fallbackData = await fallbackRes.json();
      
      if (!fallbackData.situations || fallbackData.situations.length === 0) {
        const loadedDateEl = document.getElementById("loadedDate");
        if (loadedDateEl) loadedDateEl.textContent = "No records found.";
        const recentListEl = document.getElementById("recentList");
        if (recentListEl) recentListEl.innerHTML = '<div class="list-empty">No records yet.</div>';
        await buildCalendar(y, m);
        return;
      }
      const latest        = safeDate(fallbackData.situations[0].logDate);
      const [fy, fm]      = latest.split("-").map(Number);
      calMonth            = { year: fy, month: fm };
      const fallbackDocs  = await _fetchMonthFull(fy, fm);
      cacheFromDocs(fallbackDocs);
      await buildCalendar(fy, fm);
      buildRecentList(fallbackDocs);
      await selectDate(latest);
    } catch (err) {
      const loadedDateEl = document.getElementById("loadedDate");
      if (loadedDateEl) loadedDateEl.textContent = "Failed to load.";
      const recentListEl = document.getElementById("recentList");
      if (recentListEl) recentListEl.innerHTML = '<div class="list-empty">Error loading.</div>';
    }
  }

  async function download() {
    if (!activeDate) { window._dash.toast("No situation loaded.", "warning"); return; }
    try {
      await html2pdf().set({
        margin: [10,10,10,10], filename: `Situation_${activeDate}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      }).from(document.querySelector(".sheet")).save();
    } catch (err) {
      window._dash.toast("Download failed: " + (err?.message || err), "error");
    }
  }

  async function changeCalMonth(dir) {
    calMonth.month += dir;
    if (calMonth.month > 12) { calMonth.month = 1;  calMonth.year++; }
    if (calMonth.month < 1)  { calMonth.month = 12; calMonth.year--; }
    await buildCalendar(calMonth.year, calMonth.month);
  }

  // Register
  window._sections.situation = initSituation;

  // Expose for onclick attributes in HTML
  window._sit = { selectDate, changeCalMonth, download };

})();
