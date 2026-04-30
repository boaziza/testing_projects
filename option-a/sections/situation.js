(function () {


  let calMonth   = { year: new Date().getFullYear(), month: new Date().getMonth() + 1 };
  let activeDate = null;
  let monthCache = {};

  // ── Edit state ──────────────────────────────────────────────────────────────
  let _activeSitDoc = null;
  let _isEditing    = false;

  // Fields the user can directly change — [spanId, docFieldName]
  const EDIT_FIELDS = [
    { id: 'pms1',          key: 'pms1' },
    { id: 'pms2',          key: 'pms2' },
    { id: 'pms3',          key: 'pms3' },
    { id: 'pms4',          key: 'pms4' },
    { id: 'ago1',          key: 'ago1' },
    { id: 'ago2',          key: 'ago2' },
    { id: 'ago3',          key: 'ago3' },
    { id: 'ago4',          key: 'ago4' },
    { id: 'pmsPrices',     key: 'pmsPrice' },
    { id: 'agoPrices',     key: 'agoPrice' },
    { id: 'momo',          key: 'momo' },
    { id: 'momoLoss',      key: 'momoLoss' },
    { id: 'spFuelCard',    key: 'spFuelCard' },
    { id: 'bankCard',      key: 'bankCard' },
    { id: 'totalFiche',    key: 'totalFiche' },
    { id: 'bon',           key: 'bon' },
    { id: 'totalCash',     key: 'totalCash' },
    { id: 'totalPayments', key: 'totalPayments' },
  ];

  const { safeDate, fmt, fmtShort, monthLabel } = window._utils;
  const { apiFetch } = window._dash;

  // ── Data fetching ────────────────────────────────────────────────────────────

  async function _fetchMonthFull(year, month) {
    const mm   = String(month).padStart(2, "0");
    const res  = await apiFetch(`/situation?month=${mm}&year=${year}`);
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
    const mm   = String(month).padStart(2, "0");
    const res  = await apiFetch(`/situation?month=${mm}&year=${year}`);
    const data = await res.json();
    monthCache[key] = (data.situations || []).map(d => ({ logDate: safeDate(d.logDate), done: d.done }));
    return monthCache[key];
  }

  // ── Calendar / sidebar ───────────────────────────────────────────────────────

  async function buildCalendar(year, month) {
    let dates = [];
    try { dates = await fetchMonthDates(year, month); } catch {}
    window._utils.renderCalendar({
      gridId: "calGrid", labelId: "calMonthLabel",
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
    // Exit edit mode silently when switching dates
    if (_isEditing) { _isEditing = false; _setEditUI(false); }
    activeDate = date;
    document.querySelectorAll(".recent-item").forEach(el =>
      el.classList.toggle("recent-active", el.dataset.date === date)
    );
    const [y, m] = date.split("-").map(Number);
    if (y === calMonth.year && m === calMonth.month) await buildCalendar(y, m);
    await loadSituationDate(date);
  }

  // ── Sheet renderer ───────────────────────────────────────────────────────────

  async function loadSituationDate(date) {
    if (_isEditing) return;
    _restoreSpans();
    const toast  = window._dash.toast;
    date         = safeDate(date);
    const mainEl = document.getElementById("sitMain");
    if (!mainEl) return;
    mainEl.classList.add("sit-loading");

    // Hide edit button while loading
    _setEditBtn(false);

    try {
      const [y, m] = date.split("-");
      const [sitRes, stockRes, pmsRes, agoRes] = await Promise.all([
        apiFetch(`/situation/me?logDate=${date}`).then(r => r.json()),
        apiFetch(`/stock/me?monthYear=${y}-${m}`).then(r => r.json()),
        apiFetch(`/stock-daily/me?logDate=${date}&fuelType=PMS`).then(r => r.json()),
        apiFetch(`/stock-daily/me?logDate=${date}&fuelType=AGO`).then(r => r.json()),
      ]);

      if (_isEditing) return; // edit mode started while fetch was in-flight

      if (!sitRes.situation || sitRes.situation.documents.length === 0) {
        const el = document.getElementById("loadedDate");
        if (el) el.textContent = "No data for " + date;
        const pill = document.getElementById("donePill");
        if (pill) pill.textContent = "";
        _activeSitDoc = null;
        return;
      }

      const doc      = sitRes.situation.documents[0];
      const stockDoc = stockRes.stock?.documents[0]     || null;
      const pmsDoc   = pmsRes.stockDaily?.documents[0]  || null;
      const agoDoc   = agoRes.stockDaily?.documents[0]  || null;

      // Store for edit
      _activeSitDoc = doc;

      // Header
      const d = new Date(date + "T00:00:00");
      const loadedDateEl = document.getElementById("loadedDate");
      if (loadedDateEl) loadedDateEl.textContent = isNaN(d) ? date
        : d.toLocaleString("default", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

      const pill = document.getElementById("donePill");
      if (pill) {
        pill.textContent      = doc.done ? "Done ✓" : "Pending";
        pill.style.background = doc.done ? "var(--pms-bg)" : "#fff7ed";
        pill.style.color      = doc.done ? "var(--pms)"    : "var(--ago)";
      }
      const sheetDateEl = document.getElementById("sheetDate");
      if (sheetDateEl) sheetDateEl.textContent = date;

      // Pump indices
      ["pms1","pms2","pms3","pms4","ago1","ago2","ago3","ago4"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = fmt(doc[id]);
      });

      // Litre deltas per pump
      if (doc.done) {
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = fmt(v); };
        set("p1_essence", (doc.pms2||0) - (doc.pms1||0));
        set("p2_essence", (doc.pms4||0) - (doc.pms3||0));
        set("p3_gasoil",  (doc.ago2||0) - (doc.ago1||0));
        set("p4_gasoil",  (doc.ago4||0) - (doc.ago3||0));
      } else {
        ["p1_essence","p2_essence","p3_gasoil","p4_gasoil"].forEach(id => {
          const el = document.getElementById(id); if (el) el.textContent = "—";
        });
      }

      // Sales totals + payment fields
      const ventePms = Number(doc.venteLitresPms) || 0;
      const venteAgo = Number(doc.venteLitresAgo) || 0;
      [
        ["litresAPms", ventePms], ["litresAAgo", venteAgo],
        ["litresCPms", ventePms], ["litresCAgo", venteAgo],
        ["totalPms",   doc.totalPms],    ["totalAgo",      doc.totalAgo],
        ["totalVente", doc.totalVente],  ["pmsPrices",     doc.pmsPrice],
        ["agoPrices",  doc.agoPrice],    ["totalPayments", doc.totalPayments],
        ["momo",       doc.momo],        ["momoLoss",      doc.momoLoss],
        ["spFuelCard", doc.spFuelCard],  ["bankCard",      doc.bankCard],
        ["totalFiche", doc.totalFiche],  ["bon",           doc.bon],
        ["totalCash",  doc.totalCash],
      ].forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = (typeof val === "number" ? val : Number(val) || 0).toLocaleString();
      });

      // Stock fields
      [
        ["initialPms",        pmsDoc?.initialStock],  ["initialAgo",        agoDoc?.initialStock],
        ["receivedPms",       pmsDoc?.receivedLitres], ["receivedAgo",       agoDoc?.receivedLitres],
        ["venteLitresPmsStock", ventePms],              ["venteLitresAgoStock", venteAgo],
        ["theoryStockPms",    pmsDoc?.theoryStock],    ["theoryStockAgo",    agoDoc?.theoryStock],
        ["physicalStockPms",  pmsDoc?.physicalStock],  ["physicalStockAgo",  agoDoc?.physicalStock],
        ["gainFuelPms",       pmsDoc?.gainFuel],       ["gainFuelAgo",       agoDoc?.gainFuel],
      ].forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = typeof val === "number" ? val : Number(val) || 0;
      });

      const tgPmsEl = document.getElementById("totalGainFuelPms");
      if (tgPmsEl) tgPmsEl.textContent = stockDoc ? fmt(stockDoc.totalGainFuelPms) : "—";
      const tgAgoEl = document.getElementById("totalGainFuelAgo");
      if (tgAgoEl) tgAgoEl.textContent = stockDoc ? fmt(stockDoc.totalGainFuelAgo) : "—";

      const doneEl = document.getElementById("done");
      if (doneEl) doneEl.textContent = doc.done ? "Yes ✓" : "No";

      // Show edit button now that a doc is loaded
      _setEditBtn(true);

    } catch (err) {
      toast("Error loading situation: " + (err?.message || err), "error");
    } finally {
      mainEl.classList.remove("sit-loading");
    }
  }

  // ── Edit mode ────────────────────────────────────────────────────────────────

  function _restoreSpans() {
    EDIT_FIELDS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el || el.tagName !== "INPUT") return;
      const span = document.createElement("span");
      span.id = id;
      el.replaceWith(span);
    });
    const doneEl = document.getElementById("done");
    if (doneEl && doneEl.tagName === "INPUT") {
      const span = document.createElement("span");
      span.id = "done";
      doneEl.replaceWith(span);
    }
  }

  function _setEditBtn(visible) {
    const btn = document.getElementById("sitEditBtn");
    if (btn) btn.style.display = visible && !_isEditing ? "" : "none";
  }

  function _setEditUI(editing) {
    document.getElementById("sitEditBtn").style.display     = editing ? "none" : (_activeSitDoc ? "" : "none");
    document.getElementById("sitCancelBtn").style.display   = editing ? "" : "none";
    document.getElementById("sitSaveBtn").style.display     = editing ? "" : "none";
    document.getElementById("sitDownloadBtn").style.display = editing ? "none" : "";
    const sheet = document.querySelector("#section-situation .sheet");
    if (sheet) sheet.classList.toggle("sit-edit-mode", editing);
  }

  function enterEditMode() {
    if (!_activeSitDoc || _isEditing) return;
    _isEditing = true;

    // Replace each editable span with a number input
    EDIT_FIELDS.forEach(({ id, key }) => {
      const el = document.getElementById(id);
      if (!el || el.tagName === "INPUT") return;
      const inp = document.createElement("input");
      inp.type      = "number";
      inp.className = "sit-edit-input";
      inp.id        = id;
      inp.value     = Number(_activeSitDoc[key]) || 0;
      inp.addEventListener("input", recalcEditValues);
      el.replaceWith(inp);
    });

    // Replace done span with a checkbox
    const doneEl = document.getElementById("done");
    if (doneEl && doneEl.tagName !== "INPUT") {
      const chk = document.createElement("input");
      chk.type      = "checkbox";
      chk.className = "sit-edit-checkbox";
      chk.id        = "done";
      chk.checked   = !!_activeSitDoc.done;
      doneEl.replaceWith(chk);
    }

    recalcEditValues();
    _setEditUI(true);
  }

  async function exitEditMode() {
    if (!_isEditing) return;
    _isEditing = false;
    _setEditUI(false);
    await loadSituationDate(activeDate);
  }

  function recalcEditValues() {
    const v = id => Number(document.getElementById(id)?.value || 0);

    const p1e    = v("pms2") - v("pms1");
    const p2e    = v("pms4") - v("pms3");
    const p3g    = v("ago2") - v("ago1");
    const p4g    = v("ago4") - v("ago3");
    const litPms = p1e + p2e;
    const litAgo = p3g + p4g;
    const tPms   = litPms * v("pmsPrices");
    const tAgo   = litAgo * v("agoPrices");
    const tVente = tPms + tAgo;

    const set = (id, n) => {
      const el = document.getElementById(id);
      if (el && el.tagName !== "INPUT") el.textContent = Math.round(n).toLocaleString();
    };
    set("p1_essence", p1e); set("p2_essence", p2e);
    set("p3_gasoil",  p3g); set("p4_gasoil",  p4g);
    set("litresAPms", litPms); set("litresAAgo", litAgo);
    set("litresCPms", litPms); set("litresCAgo", litAgo);
    set("totalPms",   tPms);  set("totalAgo",   tAgo);
    set("totalVente", tVente);
  }

  async function saveEdit(btn) {
    if (!_activeSitDoc || !_isEditing) return;
    const { toast, apiFetch: fetch } = window._dash;

    const v = id => Number(document.getElementById(id)?.value || 0);

    const pms1 = v("pms1"), pms2 = v("pms2"), pms3 = v("pms3"), pms4 = v("pms4");
    const ago1 = v("ago1"), ago2 = v("ago2"), ago3 = v("ago3"), ago4 = v("ago4");
    const pmsPrice = v("pmsPrices"), agoPrice = v("agoPrices");

    const venteLitresPms = (pms2 - pms1) + (pms4 - pms3);
    const venteLitresAgo = (ago2 - ago1) + (ago4 - ago3);
    const totalPms       = Math.round(venteLitresPms * pmsPrice);
    const totalAgo       = Math.round(venteLitresAgo * agoPrice);
    const totalVente     = totalPms + totalAgo;
    const totalPayments  = v("totalPayments");
    const gainPayments   = totalVente - totalPayments;

    const doneEl = document.getElementById("done");
    const done   = doneEl?.tagName === "INPUT" ? doneEl.checked : !!_activeSitDoc.done;

    try {
      const res = await apiFetch("/situation", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          $Id: _activeSitDoc.$id,
          pms1, pms2, pms3, pms4,
          ago1, ago2, ago3, ago4,
          pmsPrice, agoPrice,
          venteLitresPms, venteLitresAgo,
          totalPms, totalAgo, totalVente,
          gainPayments,
          momo:          v("momo"),
          momoLoss:      v("momoLoss"),
          spFuelCard:    v("spFuelCard"),
          bankCard:      v("bankCard"),
          totalFiche:    v("totalFiche"),
          bon:           v("bon"),
          totalCash:     v("totalCash"),
          totalPayments,
          done,
        }),
      });

      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Save failed"); }

      // Invalidate cache so calendar dot refreshes
      delete monthCache[activeDate.substring(0, 7)];

      _isEditing = false;
      _setEditUI(false);
      await loadSituationDate(activeDate);
      toast("Situation updated.", "success");
    } catch (err) {
      toast("Save failed: " + err.message, "error");
      btn.disabled = false;
    }
  }

  // ── Init ─────────────────────────────────────────────────────────────────────

  async function initSituation() {
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
      const fallbackRes  = await apiFetch("/situation?limit=1");
      const fallbackData = await fallbackRes.json();
      if (!fallbackData.situations || fallbackData.situations.length === 0) {
        const el = document.getElementById("loadedDate");
        if (el) el.textContent = "No records found.";
        const rl = document.getElementById("recentList");
        if (rl) rl.innerHTML = '<div class="list-empty">No records yet.</div>';
        await buildCalendar(y, m);
        return;
      }
      const latest       = safeDate(fallbackData.situations[0].logDate);
      const [fy, fm]     = latest.split("-").map(Number);
      calMonth           = { year: fy, month: fm };
      const fallbackDocs = await _fetchMonthFull(fy, fm);
      cacheFromDocs(fallbackDocs);
      await buildCalendar(fy, fm);
      buildRecentList(fallbackDocs);
      await selectDate(latest);
    } catch {
      const el = document.getElementById("loadedDate");
      if (el) el.textContent = "Failed to load.";
      const rl = document.getElementById("recentList");
      if (rl) rl.innerHTML = '<div class="list-empty">Error loading.</div>';
    }
  }

  async function download() {
    if (!activeDate) { window._dash.toast("No situation loaded.", "warning"); return; }
    try {
      await html2pdf().set({
        margin: [10,10,10,10], filename: `Situation_${activeDate}.pdf`,
        image:       { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
        jsPDF:       { unit: "mm", format: "a4", orientation: "portrait" },
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

  window._sections.situation = initSituation;
  window._sit = { selectDate, changeCalMonth, download, enterEditMode, exitEditMode, saveEdit };

})();
