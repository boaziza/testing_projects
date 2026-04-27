(function () {

  const _STOCK_ID = "6908ab260012e0412ca8";

  let initialPms, initialAgo, receivedPms, receivedAgo;
  let physicalStockPms, physicalStockAgo, theoryStockPms, theoryStockAgo;
  let gainFuelPms, gainFuelAgo;
  let totalGainFuelPms, totalGainFuelAgo, totalReceivedPms, totalReceivedAgo;
  let logDate, venteLitresAgo, venteLitresPms, totalVenteLitresAgo, totalVenteLitresPms;

  async function stock() {
    const { toast, apiFetch } = window._dash;
    logDate = document.querySelector("#section-stock #logDate")?.value;
    if (!logDate) { toast("Enter a date to continue", "warning"); return; }
    try {
      // const resPms = await apiFetch(`/stock-daily/me?logDate=${logDate}&fuelType=PMS`).then(r => r.json());
      // const resAgo = await apiFetch(`/stock-daily/me?logDate=${logDate}&fuelType=AGO`).then(r => r.json());

      const resSituation = await apiFetch(`/situation/me?logDate=${logDate}`).then(r => r.json());
      
      const docSituation = resSituation.situation?.documents?.[0];

      if (docSituation) {
        venteLitresPms = parseInt(docSituation.venteLitresPms, 10);
        venteLitresAgo = parseInt(docSituation.venteLitresAgo, 10);
      }
    } catch (err) {
      toast("Error fetching sales data: " + err.message, "error");
      return;
    }
    if (isNaN(venteLitresPms) || isNaN(venteLitresAgo)) {
      toast("No sales data for this date. Submit the day's situation first.", "warning");
      return;
    }
    const stkInput = (id) => document.querySelector(`#section-stock #${id}`);
    initialPms       = parseInt(stkInput("initialPms")?.value,       10);
    initialAgo       = parseInt(stkInput("initialAgo")?.value,       10);
    receivedPms      = parseInt(stkInput("receivedPms")?.value,      10) || 0;
    receivedAgo      = parseInt(stkInput("receivedAgo")?.value,      10) || 0;
    physicalStockPms = parseInt(stkInput("physicalStockPms")?.value, 10);
    physicalStockAgo = parseInt(stkInput("physicalStockAgo")?.value, 10);
    theoryStockPms = initialPms + receivedPms - venteLitresPms;
    theoryStockAgo = initialAgo + receivedAgo - venteLitresAgo;
    gainFuelPms    = physicalStockPms - theoryStockPms;
    gainFuelAgo    = physicalStockAgo - theoryStockAgo;
    const stk = (id) => document.querySelector(`#section-stock #${id}`);
    stk("theoryStockPms").textContent = theoryStockPms.toLocaleString();
    stk("theoryStockAgo").textContent = theoryStockAgo.toLocaleString();
    stk("gainFuelPms").textContent    = gainFuelPms.toLocaleString();
    stk("gainFuelAgo").textContent    = gainFuelAgo.toLocaleString();
    stk("venteLitresPms").textContent = venteLitresPms.toLocaleString();
    stk("venteLitresAgo").textContent = venteLitresAgo.toLocaleString();
  }

  async function storeStock() {

    const { toast, apiFetch, state } = window._dash;
    const { companyId, stationId, name, email } = state.profile;

    const situationKey = `${stationId}_${logDate}`;

    // for stock-daily POST:
    const stockKeyPms = `${stationId}_PMS_${logDate}`;
    const stockKeyAgo = `${stationId}_AGO_${logDate}`;

    if (!logDate) { toast("Select a date and calculate stock first.", "warning"); return; }
    if (isNaN(theoryStockPms) || isNaN(theoryStockAgo)) { toast("Calculate stock before storing.", "warning"); return; }

    const stockAgoId = "68cbf2bb0017a7b210b1";
    const stockPmsId = "68cd197e002096e31ed8";
    const stockId    = "6908ab260012e0412ca8";
    const d          = new Date(logDate);
    const monthYear  = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

    // for stock (monthly) POST:
    const stockKeyMonthly = `${stationId}_${monthYear}`;

    try {
      const dataAgo = { 
        initialStock: initialAgo, 
        receivedLitres: receivedAgo, 
        venteLitres: venteLitresAgo, 
        physicalStock: physicalStockAgo, 
        theoryStock: theoryStockAgo, 
        gainFuel: gainFuelAgo, 
        employeeName: name,
        stockKey: stockKeyAgo,
        fuelType: "AGO",
        logDate, 
        companyId, 
        stationId, 
        email,
        situationKey
      };
      const dataPms = { 
        initialStock: initialPms, 
        receivedLitres: receivedPms, 
        venteLitres: venteLitresPms, 
        physicalStock: physicalStockPms, 
        theoryStock: theoryStockPms, 
        gainFuel: gainFuelPms, 
        employeeName: name,
        stockKey: stockKeyPms,
        fuelType: "PMS",
        logDate, 
        companyId, 
        stationId, 
        email,
        situationKey
      };
      // const response = await _AW.db.listDocuments(_AW.DB_ID, stockId, [Appwrite.Query.equal("monthYear", monthYear)]);
      const response = await apiFetch(`/stock/me?monthYear=${monthYear}`).then(r => r.json());

      totalGainFuelPms    = gainFuelPms;
      totalGainFuelAgo    = gainFuelAgo;
      totalReceivedPms    = receivedPms;
      totalReceivedAgo    = receivedAgo;
      totalVenteLitresPms = venteLitresPms;
      totalVenteLitresAgo = venteLitresAgo;

      if (response.stock?.documents.length > 0) {
        const sd = response.stock?.documents[0];
        totalGainFuelPms    += sd.totalGainFuelPms;
        totalGainFuelAgo    += sd.totalGainFuelAgo;
        totalReceivedPms    += sd.totalReceivedPms;
        totalReceivedAgo    += sd.totalReceivedAgo;
        totalVenteLitresPms += sd.totalVenteLitresPms;
        totalVenteLitresAgo += sd.totalVenteLitresAgo;
        // await _AW.db.updateDocument(_AW.DB_ID, stockId, sd.$id, {
        //   totalGainFuelPms, totalGainFuelAgo, totalReceivedPms, totalReceivedAgo, totalVenteLitresPms, totalVenteLitresAgo,
        // });
        await apiFetch(`/stock/${sd.$id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            totalGainFuelPms, totalGainFuelAgo, totalReceivedPms, totalReceivedAgo, totalVenteLitresPms, totalVenteLitresAgo,
          }),          
        });
      } else {
        // await _AW.db.createDocument(_AW.DB_ID, stockId, "unique()", {
        //   totalGainFuelPms, totalGainFuelAgo, totalReceivedPms, totalReceivedAgo, totalVenteLitresPms, totalVenteLitresAgo, monthYear,
        // });
        await apiFetch(`/stock`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stockKey: stockKeyMonthly,
            companyId, stationId,
            totalGainFuelPms, totalGainFuelAgo, totalReceivedPms, totalReceivedAgo, totalVenteLitresPms, totalVenteLitresAgo, monthYear,
          }),
        })
      }

      // await _AW.db.createDocument(_AW.DB_ID, stockAgoId, "unique()", dataAgo);
      // await _AW.db.createDocument(_AW.DB_ID, stockPmsId, "unique()", dataPms);

      const resAgo = await apiFetch(`/stock-daily`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataAgo),
      });
      if (!resAgo.ok) { const e = await resAgo.json(); throw new Error("AGO: " + e.error); }

      const resPms2 = await apiFetch(`/stock-daily`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataPms),
      });
      if (!resPms2.ok) { const e = await resPms2.json(); throw new Error("PMS: " + e.error); }
      
      toast("Stock saved successfully", "success");
      document.querySelectorAll(".output").forEach(el => { el.textContent = "0"; });
      document.getElementById("stockForm")?.reset();
    } catch (err) {
      toast("Error saving stock: " + err.message, "error");
    }
  }

  async function download() {
    const toast = window._dash.toast;
    const date  = document.getElementById("logDate")?.value;
    if (!date) { toast("Select a date before downloading.", "warning"); return; }
    try {
      const formEl = document.getElementById("stockForm");
      if (!formEl) throw new Error("Stock form not found.");
      await html2pdf().set({
        margin: [10,10,10,10], filename: `Stock_${date}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      }).from(formEl).save();
    } catch (err) {
      window._dash.toast("Download failed: " + err.message, "error");
    }
  }

  async function switchStockTab(tab, btn) {
    const submitEl = document.getElementById("stock-tab-submit");
    const historyEl = document.getElementById("stock-tab-history");
    if (submitEl) submitEl.style.display = tab === "submit" ? "block" : "none";
    if (historyEl) historyEl.style.display = tab === "history" ? "block" : "none";
    document.querySelectorAll("#section-stock .stock-tab-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    if (tab === "history") await loadStockHistory();
  }

  let _historyLoaded = false;
  let _stockDocs     = [];
  let _stockDates    = new Set();
  let _calYear, _calMonth, _selectedDate = null;

  async function loadStockHistory() {
    if (_historyLoaded) return;
    const { apiFetch } = window._dash;
    const listEl = document.getElementById("histEntryList");
    try {
      const data = await apiFetch(`/stock-daily?limit=100`).then(r => r.json());
      const docs  = data.stockDaily?.documents ?? data.stockDaily ?? [];

      // Group PMS + AGO docs by date into merged objects
      const byDate = {};
      docs.forEach(d => {
        const ds = String(d.logDate || "").substring(0, 10);
        if (!ds) return;
        if (!byDate[ds]) byDate[ds] = { logDate: ds };
        if (d.fuelType === "PMS") {
          byDate[ds].physicalStockPms = d.physicalStock;
          byDate[ds].gainFuelPms      = d.gainFuel;
          byDate[ds].initialPms       = d.initialStock;
          byDate[ds].receivedPms      = d.receivedLitres;
          byDate[ds].venteLitresPms   = d.venteLitres;
          byDate[ds].theoryStockPms   = d.theoryStock;
        } else {
          byDate[ds].physicalStockAgo = d.physicalStock;
          byDate[ds].gainFuelAgo      = d.gainFuel;
          byDate[ds].initialAgo       = d.initialStock;
          byDate[ds].receivedAgo      = d.receivedLitres;
          byDate[ds].venteLitresAgo   = d.venteLitres;
          byDate[ds].theoryStockAgo   = d.theoryStock;
        }
      });

      _stockDocs = Object.values(byDate)
        .filter(d => d.physicalStockPms != null || d.physicalStockAgo != null)
        .sort((a, b) => b.logDate.localeCompare(a.logDate));

      if (_stockDocs.length === 0) {
        if (listEl) listEl.innerHTML = '<div class="hist-list-empty">No stock entries found yet.</div>';
        _historyLoaded = true; _initCalendar(); return;
      }
      _stockDocs.forEach(d => _stockDates.add(d.logDate));
      _renderEntryList(); _historyLoaded = true; _initCalendar();
    } catch (err) {
      if (listEl) listEl.innerHTML = '<div class="hist-list-empty">Error loading history.</div>';
    }
  }

  function _renderEntryList() {
    const histEntryListEl = document.getElementById("histEntryList");
    if (!histEntryListEl) return;
    histEntryListEl.innerHTML = _stockDocs.map(doc => {
      const ds    = String(doc.logDate || "").substring(0, 10);
      const d     = new Date(ds + "T00:00:00");
      const label = isNaN(d.getTime()) ? ds : d.toLocaleString("default", { day: "numeric", month: "short", year: "numeric" });
      const gPms  = Number(doc.gainFuelPms) || 0;
      const gAgo  = Number(doc.gainFuelAgo) || 0;
      const net   = gPms + gAgo;
      const cls   = net > 0 ? "hist-pill-gain" : net < 0 ? "hist-pill-loss" : "hist-pill-neutral";
      return `<div class="hist-entry-item" data-date="${ds}" onclick="window._stock._selectDate('${ds}', this)">
        <span class="hist-dot"></span>
        <div class="hist-entry-info"><div class="hist-entry-date">${label}</div>
          <div class="hist-entry-sub">PMS ${(Number(doc.physicalStockPms)||0).toLocaleString()} L · AGO ${(Number(doc.physicalStockAgo)||0).toLocaleString()} L</div>
        </div>
        <span class="hist-pill ${cls}">${net >= 0 ? "+" : ""}${net.toLocaleString()} L</span>
      </div>`;
    }).join("");
  }

  function _initCalendar() {
    const now = new Date(); _calYear = now.getFullYear(); _calMonth = now.getMonth();
    _renderCalendar();
  }

  function _renderCalendar() {
    window._utils.renderCalendar({
      gridId:       "histCalGrid",
      labelId:      "histCalMonthLabel",
      year:         _calYear,
      month:        _calMonth + 1,
      entries:      [..._stockDates].map(date => ({ date })),
      selectedDate: _selectedDate,
      weekStart:    "mon",
      dayClass:     "hist-cal-day",
      headerClass:  "hist-cal-day cal-header",
      dataClass:    "has-stock",
      onDayClick:   _selectHistDate,
    });
  }

  function _calPrev() { _calMonth--; if (_calMonth < 0) { _calMonth = 11; _calYear--; } _renderCalendar(); }
  function _calNext() { _calMonth++; if (_calMonth > 11) { _calMonth = 0; _calYear++; } _renderCalendar(); }

  function _selectHistDate(dateStr, listItemEl) {
    _selectedDate = dateStr;
    document.querySelectorAll(".hist-entry-item").forEach(el => el.classList.remove("active"));
    if (listItemEl) listItemEl.classList.add("active");
    else {
      const match = document.querySelector(`.hist-entry-item[data-date="${dateStr}"]`);
      if (match) { match.classList.add("active"); match.scrollIntoView({ behavior: "smooth", block: "nearest" }); }
    }
    _renderCalendar();
    const doc = _stockDocs.find(d => String(d.logDate || "").substring(0, 10) === dateStr);
    if (doc) _renderHistDetail(doc, dateStr);
  }

  function _renderHistDetail(doc, dateStr) {
    const d     = new Date(dateStr + "T00:00:00");
    const label = isNaN(d.getTime()) ? dateStr : d.toLocaleString("default", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const gPms  = Number(doc.gainFuelPms) || 0;
    const gAgo  = Number(doc.gainFuelAgo) || 0;
    const net   = gPms + gAgo;
    const bdRow = (lbl, val) => `<div class="hist-bd-row"><span class="hist-bd-label">${lbl}</span><span class="hist-bd-value">${val != null ? Number(val).toLocaleString() + " L" : "—"}</span></div>`;
    const histDetailEl = document.getElementById("histDetail");
    if (histDetailEl) histDetailEl.innerHTML = `
      <div class="hist-detail-header">
        <div class="hist-detail-title">${label}</div>
        <div class="hist-summary-strip">
          <div class="hist-chip"><span class="hist-chip-label">PMS Physical</span><span class="hist-chip-value">${(Number(doc.physicalStockPms)||0).toLocaleString()} L</span></div>
          <div class="hist-chip"><span class="hist-chip-label">AGO Physical</span><span class="hist-chip-value">${(Number(doc.physicalStockAgo)||0).toLocaleString()} L</span></div>
          <div class="hist-chip"><span class="hist-chip-label">PMS Gain/Loss</span><span class="hist-chip-value ${gPms >= 0 ? "gain" : "loss"}">${gPms >= 0 ? "+" : ""}${gPms.toLocaleString()} L</span></div>
          <div class="hist-chip"><span class="hist-chip-label">AGO Gain/Loss</span><span class="hist-chip-value ${gAgo >= 0 ? "gain" : "loss"}">${gAgo >= 0 ? "+" : ""}${gAgo.toLocaleString()} L</span></div>
          <div class="hist-chip"><span class="hist-chip-label">Net</span><span class="hist-chip-value ${net >= 0 ? "gain" : "loss"}">${net >= 0 ? "+" : ""}${net.toLocaleString()} L</span></div>
        </div>
      </div>
      <div class="hist-breakdown-grid">
        <div class="hist-breakdown-card hist-bd-pms"><div class="hist-bd-title">Essence (PMS)</div>
          ${bdRow("Initial",doc.initialPms)}${bdRow("Received",doc.receivedPms)}${bdRow("Sold",doc.venteLitresPms)}${bdRow("Theory",doc.theoryStockPms)}${bdRow("Physical",doc.physicalStockPms)}
          <div class="hist-bd-row gain-row"><span class="hist-bd-label">Gain/Loss</span><span class="hist-bd-value ${gPms >= 0 ? "gain" : "loss"}">${gPms >= 0 ? "+" : ""}${gPms.toLocaleString()} L</span></div>
        </div>
        <div class="hist-breakdown-card hist-bd-ago"><div class="hist-bd-title">Mazout (AGO)</div>
          ${bdRow("Initial",doc.initialAgo)}${bdRow("Received",doc.receivedAgo)}${bdRow("Sold",doc.venteLitresAgo)}${bdRow("Theory",doc.theoryStockAgo)}${bdRow("Physical",doc.physicalStockAgo)}
          <div class="hist-bd-row gain-row"><span class="hist-bd-label">Gain/Loss</span><span class="hist-bd-value ${gAgo >= 0 ? "gain" : "loss"}">${gAgo >= 0 ? "+" : ""}${gAgo.toLocaleString()} L</span></div>
        </div>
      </div>`;
  }

  // Register
  window._sections.stock = function stock() {};  // section HTML is static forms; no data fetch on nav

  // Expose for onclick attributes
  window._stock = { stock, storeStock, download, switchStockTab, _calPrev, _calNext, _selectDate: _selectHistDate };

})();
