let logDate, email;
let allDocuments = [];
let currentPage  = 0;

// ── HELPERS ───────────────────────────────────────────────────
function fmt(v) { return (Number(v) || 0).toLocaleString(); }

function setField(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  const n         = Number(value);
  const formatted = isNaN(n) ? (value ?? "—") : n.toLocaleString();
  if ("value" in el) el.value = formatted;
  else               el.textContent = formatted;
}

// ── FETCH REPORT ──────────────────────────────────────────────
async function displayDetails() {
  const indexId    = "68cd1987002bae34ea4b";
  const paymentsId = "68cd19990006cbb33843";

  logDate = document.getElementById("logDate").value;
  email   = document.getElementById("email").value;

  if (!logDate || !email) {
    toast("Please choose both a date and an employee email.", "warning");
    return;
  }

  try {
    clearSheetOutputs();
    allDocuments = [];
    currentPage  = 0;
    setMainBar("Fetching report…", null);
    setSidebarList([], true);

    const [responseIndex, responsePayments] = await Promise.all([
      _AW.db.listDocuments(_AW.DB_ID, indexId, [
        Appwrite.Query.equal("logDate", logDate),
        Appwrite.Query.equal("email",   email),
      ]),
      _AW.db.listDocuments(_AW.DB_ID, paymentsId, [
        Appwrite.Query.equal("logDate", logDate),
        Appwrite.Query.equal("email",   email),
      ]),
    ]);

    if (responseIndex.documents.length === 0) {
      toast("No records found for this date and employee.", "warning");
      setMainBar("No report loaded", null);
      setSidebarList([], false);
      return;
    }

    allDocuments = responseIndex.documents;

    // Attach payment data — one payment doc per employee per day
    const paymentDoc = responsePayments.documents[0] || null;
    allDocuments.forEach(doc => { doc.paymentData = paymentDoc; });

    currentPage = 1;
    setSidebarList(allDocuments, false);
    displayPage(currentPage);

  } catch (err) {
    console.error("Fetch error:", err);
    toast("Error fetching report: " + (err?.message || err), "error");
    setMainBar("Error loading report", null);
    setSidebarList([], false);
  }
}

// ── SIDEBAR ENTRY LIST ────────────────────────────────────────
function setSidebarList(docs, loading) {
  const listEl  = document.getElementById("entryList");
  const titleEl = document.getElementById("entryListTitle");

  if (loading) {
    titleEl.textContent = "";
    listEl.innerHTML = `<div class="pom-list-empty">Loading…</div>`;
    return;
  }

  if (!docs.length) {
    titleEl.textContent = "";
    listEl.innerHTML = `<div class="pom-list-empty">No report loaded yet.</div>`;
    return;
  }

  titleEl.textContent = `${docs.length} entr${docs.length === 1 ? "y" : "ies"} found`;

  listEl.innerHTML = docs.map((doc, i) => {
    const n   = i + 1;
    const gl  = doc.paymentData ? Number(doc.paymentData.gainPayments) : null;
    const glText   = gl !== null ? (gl >= 0 ? `+${fmt(gl)}` : fmt(gl)) : "—";
    const dotClass = gl === null ? "neutral-dot" : gl >= 0 ? "gain-dot" : "loss-dot";
    const amtClass = gl === null ? "" : gl >= 0 ? "gain" : "loss";
    const initial  = (email || "E").charAt(0).toUpperCase();

    // Use logDate for meta — strip to 10 chars to handle ISO timestamps
    const dateStr = String(doc.logDate || logDate).substring(0, 10);

    return `
      <div class="pom-entry-item${n === currentPage ? " pom-active" : ""}"
           onclick="selectEntry(${n})" data-entry="${n}">
        <div class="pom-entry-dot ${dotClass}">${initial}${n}</div>
        <div class="pom-entry-info">
          <div class="pom-entry-label">Entry ${n}</div>
          <div class="pom-entry-meta">${dateStr}</div>
        </div>
        <div class="pom-entry-amount ${amtClass}">${glText}</div>
      </div>
    `;
  }).join("");
}

function selectEntry(n) {
  currentPage = n;
  // Highlight active item
  document.querySelectorAll(".pom-entry-item").forEach(el => {
    el.classList.toggle("pom-active", Number(el.dataset.entry) === n);
  });
  displayPage(n);
}

// ── MAIN BAR (situation-style) ────────────────────────────────
function setMainBar(dateLabel, gainLoss) {
  const dateEl = document.getElementById("loadedDate");
  const pill   = document.getElementById("donePill");

  if (dateEl) dateEl.textContent = dateLabel;

  if (!pill) return;

  if (gainLoss === null || gainLoss === undefined) {
    pill.textContent = "";
    pill.className   = "done-pill";
    return;
  }

  const gl = Number(gainLoss);
  if (gl >= 0) {
    pill.textContent = `Gain +${fmt(gl)} RWF`;
    pill.className   = "done-pill pill-gain";
  } else {
    pill.textContent = `Loss ${fmt(gl)} RWF`;
    pill.className   = "done-pill pill-loss";
  }
}

// ── DISPLAY PAGE ──────────────────────────────────────────────
function displayPage(pageNumber) {
  if (pageNumber < 1 || pageNumber > allDocuments.length) return;

  clearSheetOutputs();

  const doc       = allDocuments[pageNumber - 1];
  const dateStr   = String(doc.logDate || logDate).substring(0, 10);
  const entryLabel = `Entry ${pageNumber} of ${allDocuments.length} — ${dateStr} · ${email}`;

  // Pump indices
  document.getElementById("pms1").textContent = fmt(doc.pms1);
  document.getElementById("pms2").textContent = fmt(doc.pms2);
  document.getElementById("pms3").textContent = fmt(doc.pms3);
  document.getElementById("pms4").textContent = fmt(doc.pms4);
  document.getElementById("ago1").textContent = fmt(doc.ago1);
  document.getElementById("ago2").textContent = fmt(doc.ago2);
  document.getElementById("ago3").textContent = fmt(doc.ago3);
  document.getElementById("ago4").textContent = fmt(doc.ago4);

  // Per-pump litre deltas
  document.getElementById("p1_essence").textContent = ((doc.pms2||0) - (doc.pms1||0)).toLocaleString();
  document.getElementById("p2_essence").textContent = ((doc.pms4||0) - (doc.pms3||0)).toLocaleString();
  document.getElementById("p3_gasoil").textContent  = ((doc.ago2||0) - (doc.ago1||0)).toLocaleString();
  document.getElementById("p4_gasoil").textContent  = ((doc.ago4||0) - (doc.ago3||0)).toLocaleString();

  // Litres sold
  document.getElementById("venteLitresPms").textContent = fmt(doc.venteLitresPms);
  document.getElementById("venteLitresAgo").textContent = fmt(doc.venteLitresAgo);

  // Snapshot prices for the table
  document.getElementById("pmsPrices").textContent = fmt(doc.pmsPrice);
  document.getElementById("agoPrices").textContent = fmt(doc.agoPrice);

  // Sales totals
  document.getElementById("totalPms").textContent   = fmt(doc.totalPms)   + " RWF";
  document.getElementById("totalAgo").textContent   = fmt(doc.totalAgo)   + " RWF";
  document.getElementById("totalVente").textContent = fmt(doc.totalVente) + " RWF";

  // Payments
  let gainLoss = null;
  if (doc.paymentData) {
    const p = doc.paymentData;

    try {
      const loans = JSON.parse(p.loans || "[]");
      const fiche = JSON.parse(p.fiche || "[]");

      const fields = [
        "momo", "momoLoss", "totalFiche", "bon",
        "spFuelCard", "bankCard", "totalCash",
        "totalPayments", "totalLoans",
      ];
      fields.forEach(f => setField(f, p[f]));

      // Gain/Loss with colour
      const gainEl = document.getElementById("gainPayments");
      if (gainEl) {
        gainEl.textContent = fmt(p.gainPayments);
        gainEl.className   = (Number(p.gainPayments) >= 0) ? "gain" : "loss";
      }

      gainLoss = p.gainPayments;

      // Chip lists — join as readable text
      const listSFC = document.getElementById("listSFC");
      const listBC  = document.getElementById("listBC");
      const loansEl = document.getElementById("loans");
      const ficheEl = document.getElementById("fiche");

      if (listSFC) listSFC.textContent = Array.isArray(p.listSFC)
        ? p.listSFC.join(", ") : (p.listSFC || "—");

      if (listBC) listBC.textContent = Array.isArray(p.listBC)
        ? p.listBC.join(", ") : (p.listBC || "—");

      if (loansEl) loansEl.textContent = loans.length
        ? loans.map(l => `${l.company}: ${fmt(l.amount)}`).join(" · ") : "—";

      if (ficheEl) ficheEl.textContent = fiche.length
        ? fiche.map(f => `${f.company}: ${fmt(f.amount)}`).join(" · ") : "—";

    } catch (err) {
      console.error("Error parsing payment data:", err);
    }
  }

  // Update sticky bar
  setMainBar(entryLabel, gainLoss);
}

// ── CLEAR SHEET ───────────────────────────────────────────────
function clearSheetOutputs() {
  document.querySelectorAll("main .sheet span").forEach(s => s.textContent = "");
}

// ── DOWNLOAD ──────────────────────────────────────────────────
async function download() {
  if (!allDocuments.length) { toast("Fetch a report before downloading.", "warning"); return; }

  try {
    const element = document.getElementById("reportSheet");
    const safeEmail = (email || "employee").replace(/[^a-zA-Z0-9]/g, "_");
    const opt = {
      margin:      [10, 10, 10, 10],
      filename:    `Pompiste_${safeEmail}_${logDate}.pdf`,
      image:       { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
      jsPDF:       { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak:   { mode: ["css", "legacy"] },
    };
    await html2pdf().set(opt).from(element).save();
  } catch (err) {
    console.error("Download error:", err);
    toast("Download failed: " + (err?.message || err), "error");
  }
}

// ── EXPOSE TO HTML ────────────────────────────────────────────
window.displayDetails = displayDetails;
window.selectEntry    = selectEntry;
window.download       = download;
