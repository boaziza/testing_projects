// ── STATE ──────────────────────────────────────────────────────
let allRows        = [];   // pre-processed documents for the active table
let filtered       = null; // non-null only when any filter is active
let currentPage    = 1;
let lastAttributes = [];   // column definitions for the active table

const PAGE_SIZE = 20;
const API = _AW.SERVER_URL;

// ── HELPERS ────────────────────────────────────────────────────
async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  return res.json();
}

const hiddenKeys = [
  "cash5000","cash2000","cash1000","cash500",
  "id","shift","email","fiche","listSFC","listBC","bon"
];

const preferredOrder = [
  "company","plate","amount","employee",
  "totalVente","totalPayments","totalCash",
  "momo","momoLoss","spFuelCard","bankCard",
  "totalFiche","totalLoans","loans",
  "gainPayments","logDate","monthYear"
];

const renameMap = {
  employee:            "Employee",
  plate:               "Plate",
  company:             "Company",
  amount:              "Amount",
  monthYear:           "Month",
  logDate:             "Date",
  gainPayments:        "Gain",
  totalVente:          "Total Vente",
  totalPayments:       "Total Payments",
  totalCash:           "Total Cash",
  momo:                "MOMO",
  momoLoss:            "MOMO Loss",
  bankCard:            "Bank Card",
  totalFiche:          "Fiche",
  spFuelCard:          "SP Fuel Card",
  totalLoans:          "Loans",
  totalGainFuelPms:    "Total Gain (PMS)",
  totalGainFuelAgo:    "Total Gain (AGO)",
  totalReceivedPms:    "Total Received (PMS)",
  totalReceivedAgo:    "Total Received (AGO)",
  totalVenteLitresAgo: "Total Litres Sold (AGO)",
  totalVenteLitresPms: "Total Litres Sold (PMS)",
};

function rearrangeAndRename(attrs) {
  return [
    ...preferredOrder.map(k => attrs.find(a => a.key === k)).filter(Boolean),
    ...attrs.filter(a => !preferredOrder.includes(a.key)),
  ]
    .filter(a => !hiddenKeys.includes(a.key))
    .map(a => ({
      ...a,
      displayName: a.key === "loans" ? "Versement" : (renameMap[a.key] || a.key),
    }));
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

// Pre-process rows once on load: parse loans JSON, normalise logDate
function preprocessRows(rows) {
  return rows.map(row => {
    const r = { ...row };
    if (typeof r.loans === "string") {
      try { r._loans = JSON.parse(r.loans); } catch { r._loans = []; }
    } else {
      r._loans = Array.isArray(r.loans) ? r.loans : [];
    }
    if (r.logDate) r.logDate = String(r.logDate).substring(0, 10);
    return r;
  });
}

// ── SIDEBAR — TABLE LIST ───────────────────────────────────────
async function loadTableList() {
  try {
    const data = await fetchJSON(`${API}/tables`);
    const tables = Object.keys(data.availableTables);
    const listEl = document.getElementById("reportsList");
    listEl.innerHTML = "";

    tables.forEach(name => {
      const div = document.createElement("div");
      div.textContent = name.toUpperCase();
      div.className = "report-item";
      div.dataset.table = name;
      div.onclick = () => display(name);
      listEl.appendChild(div);
    });
  } catch (err) {
    console.error("Could not load table list:", err);
    toast("Could not load table list", "error");
  }
}

// ── METRIC BLOCKS (fetch stock once) ──────────────────────────
async function loadMetrics() {
  try {
    const [attrData, docData] = await Promise.all([
      fetchJSON(`${API}/attributes/stock`),
      fetchJSON(`${API}/documents/stock`),
    ]);

    const stockRows = preprocessRows(docData.documents);

    let totalGain    = 0;
    let totalGainAgo = 0;
    let totalGainPms = 0;

    stockRows.forEach(row => {
      totalGain    += Number(row.gainPayments)     || 0;
      totalGainAgo += Number(row.totalGainFuelAgo) || 0;
      totalGainPms += Number(row.totalGainFuelPms) || 0;
    });

    document.getElementById("gain").textContent    = `${totalGain.toLocaleString()} RWF`;
    document.getElementById("gainAgo").textContent = `${totalGainAgo.toLocaleString()} L`;
    document.getElementById("gainPms").textContent = `${totalGainPms.toLocaleString()} L`;
  } catch (err) {
    console.error("Could not load metrics:", err);
    toast("Could not load metrics", "error");
  }
}

// ── MAIN DISPLAY ───────────────────────────────────────────────
async function display(tableName) {
  try {
    document.getElementById("tableTitle").textContent = `${tableName.toUpperCase()} Table`;

    // Mark sidebar active item
    document.querySelectorAll(".report-item").forEach(el => {
      el.classList.toggle("active", el.dataset.table === tableName);
    });

    const [attrData, docData] = await Promise.all([
      fetchJSON(`${API}/attributes/${tableName}`),
      fetchJSON(`${API}/documents/${tableName}`),
    ]);

    lastAttributes = rearrangeAndRename(attrData.attributes);
    allRows        = preprocessRows(docData.documents);
    filtered       = null;
    currentPage    = 1;

    // Reset all filters when switching tables
    document.getElementById("search").value = "";

    // Show date filter row and export button now that data is loaded
    const hasLogDate = lastAttributes.some(a => a.key === "logDate");
    document.getElementById("dateFilterRow").style.display = hasLogDate ? "flex" : "none";
    document.getElementById("exportBtn").style.display     = "inline-block";

    // Default date range to current month for tables that have logDate
    if (hasLogDate) {
      const now = new Date();
      const y   = now.getFullYear();
      const m   = String(now.getMonth() + 1).padStart(2, "0");
      const d   = String(now.getDate()).padStart(2, "0");
      document.getElementById("dateFrom").value = `${y}-${m}-01`;
      document.getElementById("dateTo").value   = `${y}-${m}-${d}`;
    } else {
      document.getElementById("dateFrom").value = "";
      document.getElementById("dateTo").value   = "";
    }

    buildHeaders(lastAttributes);
    buildSearchControls(lastAttributes);
    renderCurrentPage();

  } catch (err) {
    console.error("Display error:", err);
    toast("Could not load table data", "error");
  }
}

// ── BUILD HEADERS ──────────────────────────────────────────────
function buildHeaders(attributes) {
  const headers = document.getElementById("headers");
  headers.innerHTML = "";
  attributes.forEach(attr => {
    const th = document.createElement("th");
    th.textContent = attr.displayName;
    headers.appendChild(th);
  });
}

// ── BUILD SEARCH CONTROLS ──────────────────────────────────────
function buildSearchControls(attributes) {
  const searchWith  = document.getElementById("searchWith");
  const searchInput = document.getElementById("search");

  // Rebuild column picker
  searchWith.innerHTML = "";
  attributes.forEach(attr => {
    const opt = document.createElement("option");
    opt.value       = attr.key;
    opt.textContent = attr.displayName;
    searchWith.appendChild(opt);
  });

  // Change input type to match selected column type
  searchWith.onchange = () => {
    const selected = attributes.find(a => a.key === searchWith.value);
    if (selected) searchInput.type = mapTypeToInput(selected.type);
    searchInput.value = "";
    updateSuggestions();
    applyFilters();
  };

  // Reset input
  searchInput.value = "";
  searchInput.type  = "text";

  // Live search with 300ms debounce
  searchInput.oninput = debounce(() => {
    applyFilters();
  }, 300);

  // Enter key also triggers immediately
  searchInput.onkeydown = e => {
    if (e.key === "Enter") applyFilters();
  };

  // Populate initial suggestions for first column
  updateSuggestions();
}

// Populate datalist with unique values from current column in allRows
function updateSuggestions() {
  const key      = document.getElementById("searchWith").value;
  const datalist = document.getElementById("searchSuggestions");
  datalist.innerHTML = "";

  if (!key) return;

  const seen = new Set();
  allRows.forEach(row => {
    const v = row[key];
    if (v !== null && v !== undefined && v !== "") {
      const display = key === "logDate" ? String(v).substring(0, 10) : String(v);
      if (!seen.has(display)) {
        seen.add(display);
        const opt = document.createElement("option");
        opt.value = display;
        datalist.appendChild(opt);
      }
    }
  });
}

// ── FILTERS (date range + text search) ────────────────────────
function applyFilters() {
  const dateFromVal = document.getElementById("dateFrom").value;
  const dateToVal   = document.getElementById("dateTo").value;
  const searchKey   = document.getElementById("searchWith").value;
  const searchValue = document.getElementById("search").value.trim();

  let rows = allRows;

  if (dateFromVal || dateToVal) {
    rows = rows.filter(row => {
      const d = row.logDate;
      if (!d) return true;
      if (dateFromVal && d < dateFromVal) return false;
      if (dateToVal   && d > dateToVal)   return false;
      return true;
    });
  }

  if (searchValue) {
    rows = rows.filter(row => {
      const cellValue = String(row[searchKey] ?? "").toLowerCase();
      return cellValue.includes(searchValue.toLowerCase());
    });
  }

  filtered    = (!dateFromVal && !dateToVal && !searchValue) ? null : rows;
  currentPage = 1;
  renderCurrentPage();
}

function clearDateFilter() {
  document.getElementById("dateFrom").value = "";
  document.getElementById("dateTo").value   = "";
  applyFilters();
}

// ── CSV EXPORT ─────────────────────────────────────────────────
function exportCSV() {
  const source = filtered ?? allRows;
  if (source.length === 0) { toast("No data to export.", "warning"); return; }

  const headers = lastAttributes.map(a => `"${a.displayName}"`);
  const rows = source.map(row =>
    lastAttributes.map(attr => {
      if (attr.key === "loans") {
        const versement = (row._loans || [])
          .filter(l => l.company === "Versement")
          .reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
        return versement || "";
      }
      const v = row[attr.key];
      if (v === null || v === undefined) return "";
      const s = String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"` : s;
    })
  );

  const csv  = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  const title = document.getElementById("tableTitle").textContent.replace(/[^a-zA-Z0-9]/g, "_");
  a.download  = `${title}_${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast(`Exported ${source.length} row${source.length !== 1 ? "s" : ""}.`, "success");
}

// ── RENDER ─────────────────────────────────────────────────────
function renderCurrentPage() {
  const body = document.getElementById("body");
  const source = filtered ?? allRows;
  const totalPages = Math.max(1, Math.ceil(source.length / PAGE_SIZE));

  // Clamp page
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * PAGE_SIZE;
  const pageRows = source.slice(start, start + PAGE_SIZE);

  // Render rows
  body.innerHTML = "";

  if (pageRows.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = lastAttributes.length || 1;
    td.className = "empty-row";
    td.textContent = filtered !== null
      ? "No records match your search."
      : "No records found.";
    tr.appendChild(td);
    body.appendChild(tr);
  } else {
    // Data rows
    const totals = Array(lastAttributes.length).fill(0);
    let hasTotals = false;

    pageRows.forEach(row => {
      const tr = document.createElement("tr");
      lastAttributes.forEach((attr, j) => {
        const td  = document.createElement("td");
        const key = attr.key;

        if (key === "loans") {
          // Use pre-parsed _loans — filter for Versement entries
          const versement = (row._loans || [])
            .filter(l => l.company === "Versement")
            .reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
          td.textContent = versement ? versement.toLocaleString() : "—";
          totals[j] += versement;
          if (versement) hasTotals = true;
        } else {
          td.textContent = formatValue(key, row[key]);
          const n = Number(row[key]);
          if (!isNaN(n) && row[key] !== null) {
            totals[j] += n;
            hasTotals = true;
          }
        }

        tr.appendChild(td);
      });
      body.appendChild(tr);
    });

    // Totals row (only if there's something to total)
    if (hasTotals) {
      const totalsRow = document.createElement("tr");
      totalsRow.className = "totals-row";
      lastAttributes.forEach((attr, j) => {
        const td = document.createElement("td");
        if (j === 0) {
          td.textContent = "TOTALS";
        } else {
          td.textContent = totals[j] ? totals[j].toLocaleString() : "";
        }
        totalsRow.appendChild(td);
      });
      body.appendChild(totalsRow);
    }
  }

  // Update result count label
  const countEl = document.getElementById("resultCount");
  if (countEl) {
    const total = source.length;
    countEl.textContent = filtered !== null
      ? `${total} result${total !== 1 ? "s" : ""} found`
      : `${total} record${total !== 1 ? "s" : ""}`;
    countEl.className = filtered !== null && total === 0
      ? "result-count no-results"
      : "result-count";
  }

  // Update pagination
  updatePagination(totalPages);
}

// ── PAGINATION ─────────────────────────────────────────────────
function updatePagination(totalPages) {
  const pag      = document.getElementById("pagination");
  const prevBtn  = document.getElementById("prevPage");
  const nextBtn  = document.getElementById("nextPage");
  const pageNum  = document.getElementById("pageNumber");
  const source   = filtered ?? allRows;

  // Show pagination only if there's more than one page or data exists
  pag.style.display = source.length > 0 ? "flex" : "none";

  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === totalPages;
  pageNum.textContent = `Page ${currentPage} of ${totalPages}`;
}

document.getElementById("prevPage").onclick = () => {
  if (currentPage > 1) { currentPage--; renderCurrentPage(); }
};

document.getElementById("nextPage").onclick = () => {
  const source = filtered ?? allRows;
  const totalPages = Math.ceil(source.length / PAGE_SIZE);
  if (currentPage < totalPages) { currentPage++; renderCurrentPage(); }
};

// ── DEBOUNCE UTILITY ───────────────────────────────────────────
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ── INIT ───────────────────────────────────────────────────────
loadTableList();
loadMetrics();
