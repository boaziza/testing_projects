let initialPms, initialAgo;
let receivedPms, receivedAgo, physicalStockPms;
let physicalStockAgo, theoryStockPms, theoryStockAgo;
let gainFuelPms, gainFuelAgo;
let totalGainFuelPms, totalGainFuelAgo;
let totalReceivedPms, totalReceivedAgo;
let logDate, venteLitresAgo, venteLitresPms;
let totalVenteLitresAgo, totalVenteLitresPms;


async function stock() {
    const situationId = "68cd6b7f00330a840d96";

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
    const situationId = "68cd6b7f00330a840d96";
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
            await _AW.db.updateDocument(_AW.DB_ID, situationId, sitDocs.documents[0].$id, {
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
