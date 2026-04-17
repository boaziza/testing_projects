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
    document.querySelectorAll(".stock-tab-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    if (tab === "history") loadStockHistory();
}

// ── STOCK HISTORY ─────────────────────────────────────────────
let _historyLoaded = false;

async function loadStockHistory() {
    if (_historyLoaded) return;
    const wrap = document.getElementById("historyTableWrap");
    try {
        const res  = await _AW.db.listDocuments(_AW.DB_ID, _SIT_ID, [
            Appwrite.Query.orderDesc("logDate"),
            Appwrite.Query.limit(30),
        ]);
        const docs = res.documents.filter(d => d.physicalStockPms != null);
        if (docs.length === 0) {
            wrap.innerHTML = '<div class="history-empty">No stock entries found yet.</div>';
            _historyLoaded = true;
            return;
        }
        wrap.innerHTML = `
            <table class="stock-history-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th class="align-right">PMS Physical</th>
                        <th class="align-right">PMS Gain/Loss</th>
                        <th class="align-right">AGO Physical</th>
                        <th class="align-right">AGO Gain/Loss</th>
                    </tr>
                </thead>
                <tbody>
                    ${docs.map(doc => {
                        const dateStr  = String(doc.logDate || "").substring(0, 10);
                        const d        = new Date(dateStr + "T00:00:00");
                        const label    = isNaN(d.getTime()) ? dateStr : d.toLocaleString("default", { day: "numeric", month: "short", year: "numeric" });
                        const gPms     = Number(doc.gainFuelPms) || 0;
                        const gAgo     = Number(doc.gainFuelAgo) || 0;
                        return `
                            <tr onclick="lookupStockDate('${dateStr}')" style="cursor:pointer;" title="Click to see full details">
                                <td class="date-cell">${label}</td>
                                <td class="align-right">${(Number(doc.physicalStockPms) || 0).toLocaleString()} L</td>
                                <td class="align-right ${gPms >= 0 ? "gain" : "loss"}">${gPms >= 0 ? "+" : ""}${gPms.toLocaleString()} L</td>
                                <td class="align-right">${(Number(doc.physicalStockAgo) || 0).toLocaleString()} L</td>
                                <td class="align-right ${gAgo >= 0 ? "gain" : "loss"}">${gAgo >= 0 ? "+" : ""}${gAgo.toLocaleString()} L</td>
                            </tr>`;
                    }).join("")}
                </tbody>
            </table>`;
        _historyLoaded = true;
    } catch {
        wrap.innerHTML = '<div class="history-empty">Error loading history.</div>';
    }
}

async function lookupStockDate(dateStr) {
    if (dateStr) document.getElementById("historyDate").value = dateStr;
    const date    = document.getElementById("historyDate").value;
    if (!date) { toast("Select a date to look up.", "warning"); return; }

    const resultEl = document.getElementById("lookupResult");
    resultEl.style.display = "block";
    resultEl.innerHTML     = '<div class="history-loading">Loading…</div>';

    try {
        const res = await _AW.db.listDocuments(_AW.DB_ID, _SIT_ID, [
            Appwrite.Query.equal("logDate", date),
        ]);
        if (res.documents.length === 0 || res.documents[0].physicalStockPms == null) {
            resultEl.innerHTML = '<div class="history-empty">No stock entry found for this date.</div>';
            return;
        }
        _renderLookupResult(res.documents[0], date);
        resultEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch {
        resultEl.innerHTML = '<div class="history-empty">Error loading entry.</div>';
    }
}

function _renderLookupResult(doc, date) {
    const d     = new Date(String(date) + "T00:00:00");
    const label = isNaN(d.getTime()) ? date : d.toLocaleString("default", { day: "numeric", month: "long", year: "numeric" });
    const gPms  = Number(doc.gainFuelPms) || 0;
    const gAgo  = Number(doc.gainFuelAgo) || 0;

    function row(lbl, val) {
        const v = val != null ? Number(val).toLocaleString() + " L" : "—";
        return `<div class="lookup-row"><span class="lookup-label">${lbl}</span><span class="lookup-value">${v}</span></div>`;
    }

    document.getElementById("lookupResult").innerHTML = `
        <div class="lookup-result-title">Stock entry — ${label}</div>
        <div class="lookup-result-grid">
            <div class="lookup-section pms-lookup">
                <div class="lookup-section-title pms-label">Essence (PMS)</div>
                ${row("Initial Stock",   doc.initialPms)}
                ${row("Received",        doc.receivedPms)}
                ${row("Sold (Ventes)",   doc.venteLitresPms)}
                ${row("Theory Stock",    doc.theoryStockPms)}
                ${row("Physical Stock",  doc.physicalStockPms)}
                <div class="lookup-row gain-row">
                    <span class="lookup-label">Gain / Loss</span>
                    <span class="lookup-value ${gPms >= 0 ? "gain" : "loss"}">${gPms >= 0 ? "+" : ""}${gPms.toLocaleString()} L</span>
                </div>
            </div>
            <div class="lookup-section ago-lookup">
                <div class="lookup-section-title ago-label">Mazout (AGO)</div>
                ${row("Initial Stock",   doc.initialAgo)}
                ${row("Received",        doc.receivedAgo)}
                ${row("Sold (Ventes)",   doc.venteLitresAgo)}
                ${row("Theory Stock",    doc.theoryStockAgo)}
                ${row("Physical Stock",  doc.physicalStockAgo)}
                <div class="lookup-row gain-row">
                    <span class="lookup-label">Gain / Loss</span>
                    <span class="lookup-value ${gAgo >= 0 ? "gain" : "loss"}">${gAgo >= 0 ? "+" : ""}${gAgo.toLocaleString()} L</span>
                </div>
            </div>
        </div>`;
}
