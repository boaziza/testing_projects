let initialPms, initialAgo;
let receivedPms, receivedAgo, physicalStockPms;
let physicalStockAgo, theoryStockPms, theoryStockAgo;
let gainFuelPms, gainFuelAgo;
let totalGainFuelPms, totalGainFuelAgo;
let totalReceivedPms, totalReceivedAgo;
let logDate, venteLitresAgo, venteLitresPms;
let totalVenteLitresAgo, totalVenteLitresPms;

const _SIT_ID = "68cd6b7f00330a840d96";


async function stock() {
    const situationId = _SIT_ID;

    try {
        logDate = document.getElementById("logDate").value;

        if (!logDate) {
            toast("Enter a date to continue", "warning");
            return;
        }

        const response = await _AW.db.listDocuments(_AW.DB_ID, situationId, [Appwrite.Query.equal("logDate", logDate)]);

        if (response.documents.length > 0) {
            const doc = response.documents[0];
            venteLitresAgo = parseInt(doc.venteLitresAgo, 10);
            venteLitresPms = parseInt(doc.venteLitresPms, 10);
        }
    } catch (err) {
        toast("Error fetching sales data: " + err.message, "error");
        return;
    }

    // I-5: Situation data is required to calculate theory stock.
    // If the day's situation hasn't been submitted yet, sales figures are undefined.
    if (venteLitresPms === undefined || venteLitresAgo === undefined) {
        toast("No sales data found for this date. Submit the day's situation first.", "warning");
        return;
    }

    initialPms = parseInt(document.getElementById("initialPms").value);
    initialAgo = parseInt(document.getElementById("initialAgo").value);
    receivedPms = parseInt(document.getElementById("receivedPms").value) || 0;
    receivedAgo = parseInt(document.getElementById("receivedAgo").value) || 0;
    physicalStockPms = parseInt(document.getElementById("physicalStockPms").value);
    physicalStockAgo = parseInt(document.getElementById("physicalStockAgo").value);

    theoryStockPms = initialPms + receivedPms - venteLitresPms;
    theoryStockAgo = initialAgo + receivedAgo - venteLitresAgo;

    gainFuelPms = physicalStockPms - theoryStockPms;
    gainFuelAgo = physicalStockAgo - theoryStockAgo;

    document.getElementById("theoryStockPms").textContent = theoryStockPms.toLocaleString();
    document.getElementById("theoryStockAgo").textContent = theoryStockAgo.toLocaleString();
    document.getElementById("gainFuelPms").textContent = gainFuelPms.toLocaleString();
    document.getElementById("gainFuelAgo").textContent = gainFuelAgo.toLocaleString();
    document.getElementById("venteLitresPms").textContent = venteLitresPms.toLocaleString();
    document.getElementById("venteLitresAgo").textContent = venteLitresAgo.toLocaleString();
}

async function storeStock() {
    if (!logDate) { toast("Select a date and calculate stock first.", "warning"); return; }
    if (isNaN(theoryStockPms) || isNaN(theoryStockAgo)) { toast("Calculate stock before storing.", "warning"); return; }

    const stockAgoId  = "68cbf2bb0017a7b210b1";
    const stockPmsId  = "68cd197e002096e31ed8";
    const situationId = _SIT_ID;
    const stockId     = "6908ab260012e0412ca8";

    const selectedDate = new Date(logDate);
    const mm   = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const yyyy = selectedDate.getFullYear();
    const monthYear = `${yyyy}-${mm}`;

    // C-7: Single try/catch covering all writes — only toast success after everything
    // succeeds, so the user never sees conflicting success + error messages.
    try {
        const user  = await _AW.account.get();
        const email = user.email;

        const dataAgo = {
            initialAgo,
            receivedAgo,
            venteLitresAgo,
            physicalStockAgo,
            theoryStockAgo,
            gainFuelAgo,
            email,
            logDate,
        };

        const dataPms = {
            initialPms,
            receivedPms,
            venteLitresPms,
            physicalStockPms,
            theoryStockPms,
            gainFuelPms,
            email,
            logDate,
        };

        const response = await _AW.db.listDocuments(_AW.DB_ID, stockId, [Appwrite.Query.equal("monthYear", monthYear)]);

        totalGainFuelPms    = gainFuelPms;
        totalGainFuelAgo    = gainFuelAgo;
        totalReceivedPms    = receivedPms;
        totalReceivedAgo    = receivedAgo;
        totalVenteLitresPms = venteLitresPms;
        totalVenteLitresAgo = venteLitresAgo;

        if (response.documents.length > 0) {
            const stockDoc = response.documents[0];
            const docId    = stockDoc.$id;

            totalGainFuelPms    += stockDoc.totalGainFuelPms;
            totalGainFuelAgo    += stockDoc.totalGainFuelAgo;
            totalReceivedPms    += stockDoc.totalReceivedPms;
            totalReceivedAgo    += stockDoc.totalReceivedAgo;
            totalVenteLitresPms += stockDoc.totalVenteLitresPms;
            totalVenteLitresAgo += stockDoc.totalVenteLitresAgo;

            await _AW.db.updateDocument(_AW.DB_ID, stockId, docId, {
                totalGainFuelPms,
                totalGainFuelAgo,
                totalReceivedPms,
                totalReceivedAgo,
                totalVenteLitresPms,
                totalVenteLitresAgo,
            });
        } else {
            await _AW.db.createDocument(_AW.DB_ID, stockId, "unique()", {
                totalGainFuelPms,
                totalGainFuelAgo,
                totalReceivedPms,
                totalReceivedAgo,
                totalVenteLitresPms,
                totalVenteLitresAgo,
                monthYear,
            });
        }

        await _AW.db.createDocument(_AW.DB_ID, stockAgoId, "unique()", dataAgo);
        await _AW.db.createDocument(_AW.DB_ID, stockPmsId, "unique()", dataPms);

        // Update the situation document with the stock fields
        const sitDocs = await _AW.db.listDocuments(
            _AW.DB_ID,
            situationId,
            [Appwrite.Query.equal("logDate", logDate)]
        );

        if (sitDocs.total > 0) {
            const sitDoc = sitDocs.documents[0];
            const nightSubmitted = sitDoc.pms2 != null;
            await _AW.db.updateDocument(_AW.DB_ID, situationId, sitDoc.$id, {
                initialAgo,
                receivedAgo,
                physicalStockAgo,
                theoryStockAgo,
                gainFuelAgo,
                initialPms,
                receivedPms,
                physicalStockPms,
                theoryStockPms,
                gainFuelPms,
                ...(nightSubmitted ? { done: true } : {}),
            });
        }

        toast("Stock saved successfully", "success");

        document.querySelectorAll(".output").forEach(el => { el.textContent = "0"; });
        document.getElementById("stockForm").reset();

    } catch (err) {
        toast("Error saving stock: " + err.message, "error");
    }
}

// I-1: async so the caller can use .finally() to re-enable the button
async function download() {
    try {
        const date = document.getElementById("logDate").value;
        if (!date) { toast("Select a date before downloading.", "warning"); return; }

        const element = document.getElementById("stockForm");

        const opt = {
            margin:      [10, 10, 10, 10],
            filename:    `Stock_${date}.pdf`,
            image:       { type: "jpeg", quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
            jsPDF:       { unit: "mm", format: "a4", orientation: "portrait" },
        };

        await html2pdf().set(opt).from(element).save();

    } catch (error) {
        toast("Download failed: " + error.message, "error");
    }
}

// ── TABS ──────────────────────────────────────────────────────
function switchStockTab(tab, btn) {
    document.getElementById("stock-tab-submit").style.display  = tab === "submit"  ? "block" : "none";
    document.getElementById("stock-tab-history").style.display = tab === "history" ? "block" : "none";
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    if (tab === "history") loadStockHistory();
}

// ── STOCK HISTORY ─────────────────────────────────────────────
let _historyLoaded = false;
let _stockDocs     = [];
let _stockDates    = new Set();
let _calYear, _calMonth;
let _selectedDate  = null;

async function loadStockHistory() {
    if (_historyLoaded) return;
    const listEl = document.getElementById("histEntryList");
    try {
        const res  = await _AW.db.listDocuments(_AW.DB_ID, _SIT_ID, [
            Appwrite.Query.orderDesc("logDate"),
            Appwrite.Query.limit(50),
        ]);
        _stockDocs = res.documents.filter(d => d.physicalStockPms != null);

        if (_stockDocs.length === 0) {
            listEl.innerHTML = '<div class="hist-list-empty">No stock entries found yet.</div>';
            _historyLoaded = true;
            _initCalendar();
            return;
        }

        _stockDocs.forEach(d => {
            const ds = String(d.logDate || "").substring(0, 10);
            if (ds) _stockDates.add(ds);
        });

        _renderEntryList();
        _historyLoaded = true;
        _initCalendar();

    } catch {
        listEl.innerHTML = '<div class="hist-list-empty">Error loading history.</div>';
    }
}

function _renderEntryList() {
    const listEl = document.getElementById("histEntryList");
    listEl.innerHTML = _stockDocs.map(doc => {
        const dateStr = String(doc.logDate || "").substring(0, 10);
        const d       = new Date(dateStr + "T00:00:00");
        const label   = isNaN(d.getTime()) ? dateStr : d.toLocaleString("default", { day: "numeric", month: "short", year: "numeric" });
        const gPms    = Number(doc.gainFuelPms) || 0;
        const gAgo    = Number(doc.gainFuelAgo) || 0;
        const net     = gPms + gAgo;
        const pillCls = net > 0 ? "hist-pill-gain" : net < 0 ? "hist-pill-loss" : "hist-pill-neutral";
        const pillTxt = net > 0 ? "+" + net.toLocaleString() + " L" : net.toLocaleString() + " L";
        return `<div class="hist-entry-item" data-date="${dateStr}" onclick="_selectHistDate('${dateStr}', this)">
            <span class="hist-dot"></span>
            <div class="hist-entry-info">
                <div class="hist-entry-date">${label}</div>
                <div class="hist-entry-sub">PMS ${(Number(doc.physicalStockPms)||0).toLocaleString()} L &middot; AGO ${(Number(doc.physicalStockAgo)||0).toLocaleString()} L</div>
            </div>
            <span class="hist-pill ${pillCls}">${pillTxt}</span>
        </div>`;
    }).join("");
}

function _initCalendar() {
    const now = new Date();
    _calYear  = now.getFullYear();
    _calMonth = now.getMonth();
    _renderCalendar();
}

function _renderCalendar() {
    const label   = new Date(_calYear, _calMonth, 1).toLocaleString("default", { month: "long", year: "numeric" });
    document.getElementById("histCalMonthLabel").textContent = label;

    const today   = new Date().toISOString().substring(0, 10);
    const grid    = document.getElementById("histCalGrid");
    const headers = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
    let html      = headers.map(h => `<div class="hist-cal-day cal-header">${h}</div>`).join("");

    const firstDay  = new Date(_calYear, _calMonth, 1).getDay();
    const daysInMon = new Date(_calYear, _calMonth + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
        html += `<div class="hist-cal-day"></div>`;
    }
    for (let day = 1; day <= daysInMon; day++) {
        const ds      = `${_calYear}-${String(_calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const hasData = _stockDates.has(ds);
        const isSel   = ds === _selectedDate;
        const isToday = ds === today;
        let cls = "hist-cal-day";
        if (hasData) cls += " has-stock";
        if (isSel)   cls += " cal-selected";
        else if (isToday) cls += " cal-today";
        const onclick = hasData ? `onclick="_selectHistDate('${ds}')"` : "";
        html += `<div class="${cls}" ${onclick}>${day}</div>`;
    }
    grid.innerHTML = html;
}

function _calPrev() {
    _calMonth--;
    if (_calMonth < 0) { _calMonth = 11; _calYear--; }
    _renderCalendar();
}

function _calNext() {
    _calMonth++;
    if (_calMonth > 11) { _calMonth = 0; _calYear++; }
    _renderCalendar();
}

function _selectHistDate(dateStr, listItemEl) {
    _selectedDate = dateStr;

    document.querySelectorAll(".hist-entry-item").forEach(el => el.classList.remove("active"));
    if (listItemEl) {
        listItemEl.classList.add("active");
    } else {
        const match = document.querySelector(`.hist-entry-item[data-date="${dateStr}"]`);
        if (match) {
            match.classList.add("active");
            match.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
    }

    _renderCalendar();

    const doc = _stockDocs.find(d => String(d.logDate || "").substring(0, 10) === dateStr);
    if (doc) {
        _renderHistDetail(doc, dateStr);
    } else {
        document.getElementById("histDetail").innerHTML = '<div class="hist-list-empty" style="padding:40px;text-align:center;">No entry for this date.</div>';
    }
}

function _renderHistDetail(doc, dateStr) {
    const d     = new Date(dateStr + "T00:00:00");
    const label = isNaN(d.getTime()) ? dateStr : d.toLocaleString("default", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const gPms  = Number(doc.gainFuelPms) || 0;
    const gAgo  = Number(doc.gainFuelAgo) || 0;
    const net   = gPms + gAgo;

    function bdRow(lbl, val) {
        const v = val != null ? Number(val).toLocaleString() + " L" : "—";
        return `<div class="hist-bd-row"><span class="hist-bd-label">${lbl}</span><span class="hist-bd-value">${v}</span></div>`;
    }

    document.getElementById("histDetail").innerHTML = `
        <div class="hist-detail-header">
            <div class="hist-detail-title">${label}</div>
            <div class="hist-summary-strip">
                <div class="hist-chip">
                    <span class="hist-chip-label">PMS Physical</span>
                    <span class="hist-chip-value">${(Number(doc.physicalStockPms)||0).toLocaleString()} L</span>
                </div>
                <div class="hist-chip">
                    <span class="hist-chip-label">AGO Physical</span>
                    <span class="hist-chip-value">${(Number(doc.physicalStockAgo)||0).toLocaleString()} L</span>
                </div>
                <div class="hist-chip">
                    <span class="hist-chip-label">PMS Gain/Loss</span>
                    <span class="hist-chip-value ${gPms >= 0 ? "gain" : "loss"}">${gPms >= 0 ? "+" : ""}${gPms.toLocaleString()} L</span>
                </div>
                <div class="hist-chip">
                    <span class="hist-chip-label">AGO Gain/Loss</span>
                    <span class="hist-chip-value ${gAgo >= 0 ? "gain" : "loss"}">${gAgo >= 0 ? "+" : ""}${gAgo.toLocaleString()} L</span>
                </div>
                <div class="hist-chip">
                    <span class="hist-chip-label">Net Gain/Loss</span>
                    <span class="hist-chip-value ${net >= 0 ? "gain" : "loss"}">${net >= 0 ? "+" : ""}${net.toLocaleString()} L</span>
                </div>
            </div>
        </div>
        <div class="hist-breakdown-grid">
            <div class="hist-breakdown-card hist-bd-pms">
                <div class="hist-bd-title">Essence (PMS)</div>
                ${bdRow("Initial Stock",  doc.initialPms)}
                ${bdRow("Received",       doc.receivedPms)}
                ${bdRow("Sold (Ventes)",  doc.venteLitresPms)}
                ${bdRow("Theory Stock",   doc.theoryStockPms)}
                ${bdRow("Physical Stock", doc.physicalStockPms)}
                <div class="hist-bd-row gain-row">
                    <span class="hist-bd-label">Gain / Loss</span>
                    <span class="hist-bd-value ${gPms >= 0 ? "gain" : "loss"}">${gPms >= 0 ? "+" : ""}${gPms.toLocaleString()} L</span>
                </div>
            </div>
            <div class="hist-breakdown-card hist-bd-ago">
                <div class="hist-bd-title">Mazout (AGO)</div>
                ${bdRow("Initial Stock",  doc.initialAgo)}
                ${bdRow("Received",       doc.receivedAgo)}
                ${bdRow("Sold (Ventes)",  doc.venteLitresAgo)}
                ${bdRow("Theory Stock",   doc.theoryStockAgo)}
                ${bdRow("Physical Stock", doc.physicalStockAgo)}
                <div class="hist-bd-row gain-row">
                    <span class="hist-bd-label">Gain / Loss</span>
                    <span class="hist-bd-value ${gAgo >= 0 ? "gain" : "loss"}">${gAgo >= 0 ? "+" : ""}${gAgo.toLocaleString()} L</span>
                </div>
            </div>
        </div>`;
}
