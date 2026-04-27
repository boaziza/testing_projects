(function () {

  let _repRows = [], _repFiltered = null, _repPage = 1, _repAttrs = [];
  const PAGE_SIZE = 20;
  const API = _AW.SERVER_URL;

  async function fetchJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}`);
    return res.json();
  }

  const hiddenKeys = ["cash5000","cash2000","cash1000","cash500","id","shift","email","fiche","listSFC","listBC","bon"];
  const preferredOrder = ["company","plate","amount","employee","totalVente","totalPayments","totalCash","momo","momoLoss","spFuelCard","bankCard","totalFiche","totalLoans","loans","gainPayments","logDate","monthYear"];
  const renameMap = {
    employee:"Employee", plate:"Plate", company:"Company", amount:"Amount", monthYear:"Month", logDate:"Date",
    gainPayments:"Gain", totalVente:"Total Vente", totalPayments:"Total Payments", totalCash:"Total Cash",
    momo:"MOMO", momoLoss:"MOMO Loss", bankCard:"Bank Card", totalFiche:"Fiche", spFuelCard:"SP Fuel Card",
    totalLoans:"Loans", totalGainFuelPms:"Total Gain (PMS)", totalGainFuelAgo:"Total Gain (AGO)",
    totalReceivedPms:"Total Received (PMS)", totalReceivedAgo:"Total Received (AGO)",
    totalVenteLitresAgo:"Total Litres Sold (AGO)", totalVenteLitresPms:"Total Litres Sold (PMS)",
  };

  function rearrangeAndRename(attrs) {
    return [
      ...preferredOrder.map(k => attrs.find(a => a.key === k)).filter(Boolean),
      ...attrs.filter(a => !preferredOrder.includes(a.key)),
    ].filter(a => !hiddenKeys.includes(a.key))
     .map(a => ({ ...a, displayName: a.key === "loans" ? "Versement" : (renameMap[a.key] || a.key) }));
  }

  function mapTypeToInput(type) {
    return { integer:"number", float:"number", boolean:"checkbox", email:"email", url:"url", datetime:"date" }[type] || "text";
  }

  function formatValue(key, value) {
    if (value === null || value === undefined) return "—";
    if (key === "logDate" && value) {
      const d = new Date(value);
      return isNaN(d) ? String(value).substring(0, 10) : d.toISOString().split("T")[0];
    }
    const n = Number(value);
    return isNaN(n) ? String(value) : n.toLocaleString();
  }

  function preprocessRows(rows) {
    return rows.map(row => {
      const r = { ...row };
      if (typeof r.loans === "string") { try { r._loans = JSON.parse(r.loans); } catch { r._loans = []; } }
      else { r._loans = Array.isArray(r.loans) ? r.loans : []; }
      if (r.logDate) r.logDate = String(r.logDate).substring(0, 10);
      return r;
    });
  }

  async function loadTableList() {
    try {
      const data = await fetchJSON(`${API}/tables`);
      const tables = Object.keys(data.availableTables);
      const listEl = document.getElementById("rep-reportsList");
      if (listEl) listEl.innerHTML = "";
      tables.forEach(name => {
        const div = document.createElement("div");
        div.textContent = name.toUpperCase();
        div.className = "report-item";
        div.dataset.table = name;
        div.onclick = () => display(name);
        listEl.appendChild(div);
      });
      if (tables.length > 0) display(tables[0]);
    } catch { window._dash.toast("Could not load table list", "error"); }
  }

  async function loadMetrics() {
    try {
      const [attrData, docData] = await Promise.all([
        fetchJSON(`${API}/attributes/stock`),
        fetchJSON(`${API}/documents/stock`),
      ]);
      const rows = preprocessRows(docData.documents);
      let totalGain = 0, totalGainAgo = 0, totalGainPms = 0;
      rows.forEach(row => {
        totalGain    += Number(row.gainPayments)     || 0;
        totalGainAgo += Number(row.totalGainFuelAgo) || 0;
        totalGainPms += Number(row.totalGainFuelPms) || 0;
      });
      const gainEl = document.getElementById("rep-gain");
      if (gainEl) gainEl.textContent = `${totalGain.toLocaleString()} RWF`;
      const gainAgoEl = document.getElementById("rep-gainAgo");
      if (gainAgoEl) gainAgoEl.textContent = `${totalGainAgo.toLocaleString()} L`;
      const gainPmsEl = document.getElementById("rep-gainPms");
      if (gainPmsEl) gainPmsEl.textContent = `${totalGainPms.toLocaleString()} L`;
    } catch { window._dash.toast("Could not load metrics", "error"); }
  }

  async function display(tableName) {
    try {
      const titleEl = document.getElementById("rep-tableTitle");
      if (titleEl) titleEl.textContent = `${tableName.toUpperCase()} Table`;
      document.querySelectorAll("#section-report .report-item").forEach(el =>
        el.classList.toggle("active", el.dataset.table === tableName)
      );
      const [attrData, docData] = await Promise.all([
        fetchJSON(`${API}/attributes/${tableName}`),
        fetchJSON(`${API}/documents/${tableName}`),
      ]);
      _repAttrs    = rearrangeAndRename(attrData.attributes);
      _repRows     = preprocessRows(docData.documents);
      _repFiltered = null; _repPage = 1;
      const searchEl = document.getElementById("rep-search");
      if (searchEl) searchEl.value = "";
      const hasLogDate = _repAttrs.some(a => a.key === "logDate");
      const dateFilterRowEl = document.getElementById("rep-dateFilterRow");
      if (dateFilterRowEl) dateFilterRowEl.style.display = hasLogDate ? "flex" : "none";
      const exportBtnEl = document.getElementById("rep-exportBtn");
      if (exportBtnEl) exportBtnEl.style.display = "inline-block";
      const dateFromEl = document.getElementById("rep-dateFrom");
      if (dateFromEl) dateFromEl.value = "";
      const dateToEl = document.getElementById("rep-dateTo");
      if (dateToEl) dateToEl.value = "";
      buildHeaders(_repAttrs);
      buildSearchControls(_repAttrs);
      renderCurrentPage();
    } catch { window._dash.toast("Could not load table data", "error"); }
  }

  function buildHeaders(attributes) {
    const headers = document.getElementById("rep-headers");
    if (headers) headers.innerHTML = "";
    attributes.forEach(attr => {
      const th = document.createElement("th"); th.textContent = attr.displayName; headers.appendChild(th);
    });
  }

  function buildSearchControls(attributes) {
    const searchWith = document.getElementById("rep-searchWith");
    const searchInput = document.getElementById("rep-search");
    searchWith.innerHTML = "";
    attributes.forEach(attr => {
      const opt = document.createElement("option"); opt.value = attr.key; opt.textContent = attr.displayName; searchWith.appendChild(opt);
    });
    searchWith.onchange = () => {
      const sel = attributes.find(a => a.key === searchWith.value);
      if (sel) searchInput.type = mapTypeToInput(sel.type);
      searchInput.value = ""; updateSuggestions(); applyFilters();
    };
    searchInput.value = ""; searchInput.type = "text";
    searchInput.oninput   = debounce(() => applyFilters(), 300);
    searchInput.onkeydown = e => { if (e.key === "Enter") applyFilters(); };
    updateSuggestions();
  }

  function updateSuggestions() {
    const searchWithEl = document.getElementById("rep-searchWith");
    const key = searchWithEl?.value;
    const dl = document.getElementById("rep-searchSuggestions");
    if (dl) dl.innerHTML = "";
    if (!key) return;
    const seen = new Set();
    _repRows.forEach(row => {
      const v = row[key];
      if (v !== null && v !== undefined && v !== "") {
        const disp = key === "logDate" ? String(v).substring(0, 10) : String(v);
        if (!seen.has(disp)) { seen.add(disp); const opt = document.createElement("option"); opt.value = disp; dl.appendChild(opt); }
      }
    });
  }

  function applyFilters() {
    const df = document.getElementById("rep-dateFrom")?.value;
    const dt = document.getElementById("rep-dateTo")?.value;
    const sk = document.getElementById("rep-searchWith")?.value;
    const sv = document.getElementById("rep-search")?.value.trim();
    let rows = _repRows;
    if (df || dt) rows = rows.filter(row => { const d = row.logDate; if (!d) return true; if (df && d < df) return false; if (dt && d > dt) return false; return true; });
    if (sv) rows = rows.filter(row => String(row[sk] ?? "").toLowerCase().includes(sv.toLowerCase()));
    _repFiltered = (!df && !dt && !sv) ? null : rows;
    _repPage = 1; renderCurrentPage();
  }

  function clearDateFilter() {
    const dateFromEl = document.getElementById("rep-dateFrom");
    if (dateFromEl) dateFromEl.value = "";
    const dateToEl = document.getElementById("rep-dateTo");
    if (dateToEl) dateToEl.value = "";
    applyFilters();
  }

  function exportCSV() {
    const source = _repFiltered ?? _repRows;
    if (source.length === 0) { window._dash.toast("No data to export.", "warning"); return; }
    const headers = _repAttrs.map(a => `"${a.displayName}"`);
    const rows = source.map(row => _repAttrs.map(attr => {
      if (attr.key === "loans") {
        const v = (row._loans || []).filter(l => l.company === "Versement").reduce((s, l) => s + (Number(l.amount) || 0), 0);
        return v || "";
      }
      const v = row[attr.key];
      if (v === null || v === undefined) return "";
      const s = String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
    }));
    const csv  = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: `${document.getElementById("rep-tableTitle")?.textContent.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().split("T")[0]}.csv` });
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    window._dash.toast(`Exported ${source.length} row${source.length !== 1 ? "s" : ""}.`, "success");
  }

  function renderCurrentPage() {
    const body = document.getElementById("rep-body");
    const source     = _repFiltered ?? _repRows;
    const totalPages = Math.max(1, Math.ceil(source.length / PAGE_SIZE));
    if (_repPage > totalPages) _repPage = totalPages;
    const pageRows = source.slice((_repPage - 1) * PAGE_SIZE, _repPage * PAGE_SIZE);
    body.innerHTML = "";
    if (pageRows.length === 0) {
      const tr = document.createElement("tr"); const td = document.createElement("td");
      td.colSpan = _repAttrs.length || 1; td.className = "empty-row";
      td.textContent = _repFiltered !== null ? "No records match your search." : "No records found.";
      tr.appendChild(td); body.appendChild(tr);
    } else {
      const totals = Array(_repAttrs.length).fill(0); let hasTotals = false;
      pageRows.forEach(row => {
        const tr = document.createElement("tr");
        _repAttrs.forEach((attr, j) => {
          const td = document.createElement("td");
          if (attr.key === "loans") {
            const v = (row._loans || []).filter(l => l.company === "Versement").reduce((s, l) => s + (Number(l.amount) || 0), 0);
            td.textContent = v ? v.toLocaleString() : "—"; totals[j] += v; if (v) hasTotals = true;
          } else {
            td.textContent = formatValue(attr.key, row[attr.key]);
            const n = Number(row[attr.key]);
            if (!isNaN(n) && row[attr.key] !== null) { totals[j] += n; hasTotals = true; }
          }
          tr.appendChild(td);
        });
        body.appendChild(tr);
      });
      if (hasTotals) {
        const tr = document.createElement("tr"); tr.className = "totals-row";
        _repAttrs.forEach((attr, j) => {
          const td = document.createElement("td");
          td.textContent = j === 0 ? "TOTALS" : (totals[j] ? totals[j].toLocaleString() : "");
          tr.appendChild(td);
        });
        body.appendChild(tr);
      }
    }
    const countEl = getEl("rep-resultCount");
    if (countEl) {
      const total = source.length;
      countEl.textContent = _repFiltered !== null ? `${total} result${total !== 1 ? "s" : ""} found` : `${total} record${total !== 1 ? "s" : ""}`;
      countEl.className = _repFiltered !== null && total === 0 ? "result-count no-results" : "result-count";
    }
    const pag = getEl("rep-pagination");
    const src = _repFiltered ?? _repRows;
    if (pag) pag.style.display = src.length > 0 ? "flex" : "none";
    if (getEl("rep-prevPage")) getEl("rep-prevPage").disabled = _repPage === 1;
    if (getEl("rep-nextPage")) getEl("rep-nextPage").disabled = _repPage === totalPages;
    if (getEl("rep-pageNumber")) getEl("rep-pageNumber").textContent = `Page ${_repPage} of ${totalPages}`;
  }

  function debounce(fn, delay) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
  }

  // Register
  window._sections.report = function loadReport() {
    if (window._sections.report._initialized) return;
    window._sections.report._initialized = true;
    if (getEl("rep-prevPage")) getEl("rep-prevPage").onclick = () => { if (_repPage > 1) { _repPage--; renderCurrentPage(); } };
    if (getEl("rep-nextPage")) getEl("rep-nextPage").onclick = () => {
      const total = Math.ceil((_repFiltered ?? _repRows).length / PAGE_SIZE);
      if (_repPage < total) { _repPage++; renderCurrentPage(); }
    };
    loadTableList();
    loadMetrics();
  };

  // Expose for onclick attributes in HTML
  window._rep = { exportCSV, applyFilters, clearDateFilter };

})();
