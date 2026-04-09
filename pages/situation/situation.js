// ── APPWRITE CONFIG ───────────────────────────────────────────
const _client = new Appwrite.Client()
  .setEndpoint("https://cloud.appwrite.io/v1")
  .setProject("68a9b3e90029e6a10ff5");

const _db       = new Appwrite.Databases(_client);
const DB_ID     = "695f766c003a8dc2b3be";
const SIT_ID    = "68cd6b7f00330a840d96";
const STOCK_ID  = "6908ab260012e0412ca8";

// ── STATE ─────────────────────────────────────────────────────
let calMonth    = { year: new Date().getFullYear(), month: new Date().getMonth() + 1 };
let activeDate  = null;
let monthCache  = {};   // { "YYYY-MM": [{ logDate, done }] }

// ── HELPERS ───────────────────────────────────────────────────
function fmt(v) { return (Number(v) || 0).toLocaleString(); }

function monthLabel(y, m) {
  return new Date(y, m - 1, 1).toLocaleString("default", { month: "long", year: "numeric" });
}

// ── INIT ──────────────────────────────────────────────────────
// Called on page load. Fetches the 10 most recent situation docs,
// builds the recent list, highlights the calendar, and auto-loads
// the most recent entry — no manual date selection needed.
async function initSituation() {
  try {
    const recent = await _db.listDocuments(DB_ID, SIT_ID, [
      Appwrite.Query.orderDesc("logDate"),
      Appwrite.Query.limit(10),
    ]);

    if (recent.documents.length === 0) {
      document.getElementById("loadedDate").textContent = "No records found.";
      await buildCalendar(calMonth.year, calMonth.month);
      document.getElementById("recentList").innerHTML =
        '<div class="list-empty">No records yet.</div>';
      return;
    }

    // Cache month data from what we already fetched (avoids extra query)
    cacheFromDocs(recent.documents);

    // Build the sidebar list
    buildRecentList(recent.documents);

    // Set calendar to the most recent doc's month and build it
    const latest = recent.documents[0].logDate;
    const [y, m] = latest.split("-").map(Number);
    calMonth = { year: y, month: m };
    await buildCalendar(y, m);

    // Auto-load the most recent situation
    await selectDate(latest);

  } catch (err) {
    console.error("Init error:", err);
    document.getElementById("loadedDate").textContent = "Failed to load.";
    document.getElementById("recentList").innerHTML =
      '<div class="list-empty">Error loading records.</div>';
  }
}

// ── MONTH CACHE ───────────────────────────────────────────────
function cacheFromDocs(docs) {
  docs.forEach(doc => {
    const [y, m] = doc.logDate.split("-");
    const key = `${y}-${m}`;
    if (!monthCache[key]) monthCache[key] = [];
    if (!monthCache[key].find(d => d.logDate === doc.logDate)) {
      monthCache[key].push({ logDate: doc.logDate, done: doc.done });
    }
  });
}

async function fetchMonthDates(year, month) {
  const key = `${year}-${String(month).padStart(2, "0")}`;
  if (monthCache[key]) return monthCache[key];

  const mm    = String(month).padStart(2, "0");
  const start = `${year}-${mm}-01`;
  const end   = `${year}-${mm}-31`;

  const res = await _db.listDocuments(DB_ID, SIT_ID, [
    Appwrite.Query.greaterThanEqual("logDate", start),
    Appwrite.Query.lessThanEqual("logDate", end),
    Appwrite.Query.limit(31),
  ]);

  const dates = res.documents.map(d => ({ logDate: d.logDate, done: d.done }));
  monthCache[key] = dates;
  return dates;
}

// ── CALENDAR ──────────────────────────────────────────────────
async function buildCalendar(year, month) {
  document.getElementById("calMonthLabel").textContent = monthLabel(year, month);

  let dates = [];
  try {
    dates = await fetchMonthDates(year, month);
  } catch (err) {
    console.error("Calendar fetch error:", err);
  }

  const grid = document.getElementById("calGrid");
  grid.innerHTML = "";

  // Day-of-week headers
  ["M","T","W","T","F","S","S"].forEach(d => {
    const el = document.createElement("div");
    el.className = "cal-day-label";
    el.textContent = d;
    grid.appendChild(el);
  });

  // Offset blanks (Monday-first grid)
  const firstDay = new Date(year, month - 1, 1).getDay();
  const offset   = firstDay === 0 ? 6 : firstDay - 1;
  for (let i = 0; i < offset; i++) {
    const el = document.createElement("div");
    el.className = "cal-day";
    grid.appendChild(el);
  }

  const today       = new Date().toISOString().split("T")[0];
  const daysInMonth = new Date(year, month, 0).getDate();

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    const el      = document.createElement("div");
    el.className  = "cal-day";
    el.textContent = d;

    if (dateStr === today)      el.classList.add("cal-today");
    if (dateStr === activeDate) el.classList.add("cal-selected");

    const entry = dates.find(x => x.logDate === dateStr);
    if (entry) {
      el.classList.add("has-data");
      if (entry.done) el.classList.add("done");
      el.title   = entry.done ? "Done ✓" : "Pending";
      el.onclick = () => selectDate(dateStr);
    }

    grid.appendChild(el);
  }
}

async function changeCalMonth(dir) {
  calMonth.month += dir;
  if (calMonth.month > 12) { calMonth.month = 1;  calMonth.year++; }
  if (calMonth.month < 1)  { calMonth.month = 12; calMonth.year--; }
  await buildCalendar(calMonth.year, calMonth.month);
}

// ── RECENT LIST ───────────────────────────────────────────────
function buildRecentList(docs) {
  const list = document.getElementById("recentList");
  list.innerHTML = "";

  docs.forEach(doc => {
    const d       = new Date(doc.logDate + "T00:00:00");
    const display = d.toLocaleString("default", { day: "numeric", month: "short", year: "numeric" });
    const dayName = d.toLocaleString("default", { weekday: "short" });
    const total   = Math.round((doc.totalPayments || 0) / 1000);

    const item = document.createElement("div");
    item.className    = "recent-item";
    item.dataset.date = doc.logDate;
    item.innerHTML = `
      <div class="recent-dot" style="background:${doc.done ? "var(--pms)" : "var(--navy-light)"}"></div>
      <div class="recent-info">
        <div class="recent-date">${display}</div>
        <div class="recent-meta">${dayName} &middot; ${doc.done ? "Done ✓" : "Pending"}</div>
      </div>
      <div class="recent-total">${total}k</div>
    `;
    item.onclick = () => selectDate(doc.logDate);
    list.appendChild(item);
  });
}

// ── SELECT DATE ───────────────────────────────────────────────
// Called when user clicks calendar day or recent list item.
async function selectDate(date) {
  activeDate = date;

  // Highlight list
  document.querySelectorAll(".recent-item").forEach(el => {
    el.classList.toggle("recent-active", el.dataset.date === date);
  });

  // Rebuild calendar to show selected outline (only if same month is shown)
  const [y, m] = date.split("-").map(Number);
  if (y === calMonth.year && m === calMonth.month) {
    await buildCalendar(calMonth.year, calMonth.month);
  }

  // Load full data
  await loadSituation(date);
}

// ── LOAD SITUATION ────────────────────────────────────────────
// Fetches the full situation doc for a given date and renders the sheet.
// Two Appwrite queries run in parallel:
//   1. Situation doc by logDate
//   2. Monthly stock doc by monthYear (for overall gain/loss totals)
async function loadSituation(date) {
  const mainEl = document.getElementById("sitMain");
  mainEl.classList.add("sit-loading");

  try {
    const [y, m] = date.split("-");
    const monthYear = `${y}-${m}`;

    const [sitRes, stockRes] = await Promise.all([
      _db.listDocuments(DB_ID, SIT_ID,   [Appwrite.Query.equal("logDate", date)]),
      _db.listDocuments(DB_ID, STOCK_ID, [Appwrite.Query.equal("monthYear", monthYear)]),
    ]);

    if (sitRes.documents.length === 0) {
      document.getElementById("loadedDate").textContent = "No data for " + date;
      document.getElementById("donePill").textContent = "";
      mainEl.classList.remove("sit-loading");
      return;
    }

    const doc      = sitRes.documents[0];
    const stockDoc = stockRes.documents[0] || null;

    // ── Main bar ─────────────────────────────────────────────
    const d = new Date(date + "T00:00:00");
    document.getElementById("loadedDate").textContent =
      d.toLocaleString("default", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    const pill = document.getElementById("donePill");
    pill.textContent     = doc.done ? "Done ✓" : "Pending";
    pill.style.background = doc.done ? "var(--pms-bg)" : "#fff7ed";
    pill.style.color      = doc.done ? "var(--pms)"    : "var(--ago)";

    // ── Sheet header ──────────────────────────────────────────
    document.getElementById("sheetDate").textContent = date;

    // ── Pump indices ──────────────────────────────────────────
    document.getElementById("pms1").textContent = fmt(doc.pms1);
    document.getElementById("pms2").textContent = fmt(doc.pms2);
    document.getElementById("pms3").textContent = fmt(doc.pms3);
    document.getElementById("pms4").textContent = fmt(doc.pms4);
    document.getElementById("ago1").textContent = fmt(doc.ago1);
    document.getElementById("ago2").textContent = fmt(doc.ago2);
    document.getElementById("ago3").textContent = fmt(doc.ago3);
    document.getElementById("ago4").textContent = fmt(doc.ago4);

    // Per-pump litre deltas (only when day is done)
    if (doc.done) {
      document.getElementById("p1_essence").textContent = ((doc.pms2||0) - (doc.pms1||0)).toLocaleString();
      document.getElementById("p2_essence").textContent = ((doc.pms4||0) - (doc.pms3||0)).toLocaleString();
      document.getElementById("p3_gasoil").textContent  = ((doc.ago2||0) - (doc.ago1||0)).toLocaleString();
      document.getElementById("p4_gasoil").textContent  = ((doc.ago4||0) - (doc.ago3||0)).toLocaleString();
    } else {
      ["p1_essence","p2_essence","p3_gasoil","p4_gasoil"].forEach(id => {
        document.getElementById(id).textContent = "—";
      });
    }

    // ── Litres summary rows ───────────────────────────────────
    const ventePms = Number(doc.venteLitresPms) || 0;
    const venteAgo = Number(doc.venteLitresAgo) || 0;
    document.getElementById("litresAPms").textContent = ventePms.toLocaleString();
    document.getElementById("litresAAgo").textContent = venteAgo.toLocaleString();
    document.getElementById("litresCPms").textContent = ventePms.toLocaleString();
    document.getElementById("litresCAgo").textContent = venteAgo.toLocaleString();

    // ── Sales totals ──────────────────────────────────────────
    document.getElementById("totalPms").textContent   = fmt(doc.totalPms);
    document.getElementById("totalAgo").textContent   = fmt(doc.totalAgo);
    document.getElementById("totalVente").textContent = fmt(doc.totalVente);

    // Snapshot prices for the day (table only — header keeps live prices)
    document.getElementById("pmsPrices").textContent  = fmt(doc.pmsPrice);
    document.getElementById("agoPrices").textContent  = fmt(doc.agoPrice);

    // ── Payments ──────────────────────────────────────────────
    document.getElementById("totalPayments").textContent = fmt(doc.totalPayments);
    document.getElementById("momo").textContent          = fmt(doc.momo);
    document.getElementById("momoLoss").textContent      = fmt(doc.momoLoss);
    document.getElementById("spFuelCard").textContent    = fmt(doc.spFuelCard);
    document.getElementById("bankCard").textContent      = fmt(doc.bankCard);
    document.getElementById("totalFiche").textContent    = fmt(doc.totalFiche);
    document.getElementById("bon").textContent           = fmt(doc.bon);
    document.getElementById("totalCash").textContent     =
      ((Number(doc.totalCash)||0) + (Number(doc.totalLoans)||0) + Math.abs(Number(doc.gainPayments)||0)).toLocaleString();

    // ── Stocks de cuves ───────────────────────────────────────
    document.getElementById("initialPms").textContent      = fmt(doc.initialPms);
    document.getElementById("initialAgo").textContent      = fmt(doc.initialAgo);
    document.getElementById("receivedPms").textContent     = fmt(doc.receivedPms);
    document.getElementById("receivedAgo").textContent     = fmt(doc.receivedAgo);
    document.getElementById("venteLitresPmsStock").textContent = ventePms.toLocaleString();
    document.getElementById("venteLitresAgoStock").textContent = venteAgo.toLocaleString();
    document.getElementById("theoryStockPms").textContent  = fmt(doc.theoryStockPms);
    document.getElementById("theoryStockAgo").textContent  = fmt(doc.theoryStockAgo);
    document.getElementById("physicalStockPms").textContent = fmt(doc.physicalStockPms);
    document.getElementById("physicalStockAgo").textContent = fmt(doc.physicalStockAgo);
    document.getElementById("gainFuelPms").textContent     = fmt(doc.gainFuelPms);
    document.getElementById("gainFuelAgo").textContent     = fmt(doc.gainFuelAgo);

    // Monthly cumulative gain/loss — missing on the first day of a new month
    document.getElementById("totalGainFuelPms").textContent = stockDoc ? fmt(stockDoc.totalGainFuelPms) : "—";
    document.getElementById("totalGainFuelAgo").textContent = stockDoc ? fmt(stockDoc.totalGainFuelAgo) : "—";

    // ── Done status ───────────────────────────────────────────
    document.getElementById("done").textContent = doc.done ? "Yes ✓" : "No";

  } catch (err) {
    console.error("Load situation error:", err);
    alert("Error loading situation: " + (err?.message || err));
  } finally {
    mainEl.classList.remove("sit-loading");
  }
}

// ── DOWNLOAD ──────────────────────────────────────────────────
async function download() {
  if (!activeDate) { alert("No situation loaded."); return; }
  try {
    const element = document.querySelector(".sheet");
    const opt = {
      margin:      [10, 10, 10, 10],
      filename:    `Situation_${activeDate}.pdf`,
      image:       { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
      jsPDF:       { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak:   { mode: ["css", "legacy"] },
    };
    await html2pdf().set(opt).from(element).save();
  } catch (err) {
    console.error("Download error:", err);
    alert("Download failed: " + (err?.message || err));
  }
}

// ── START ─────────────────────────────────────────────────────
initSituation();
