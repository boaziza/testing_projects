function fmt(value) {
    return (Number(value) || 0).toLocaleString();
}

async function fetchSituation() {
    const logDate = document.getElementById("logDate").value;
    if (!logDate) { alert("Select a date to fetch the situation."); return; }

    const client = new Appwrite.Client()
        .setEndpoint("https://cloud.appwrite.io/v1")
        .setProject("68a9b3e90029e6a10ff5");

    const databases = new Appwrite.Databases(client);

    const databaseId = "695f766c003a8dc2b3be";
    const situationId = "68cd6b7f00330a840d96";
    const stockId = "6908ab260012e0412ca8";

    try {
        const selectedDate = new Date(logDate);
        const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const yyyy = selectedDate.getFullYear();
        const monthYear = `${yyyy}-${mm}`;

        const response = await databases.listDocuments(databaseId, situationId, [Appwrite.Query.equal("logDate", logDate)]);
        const responseStock = await databases.listDocuments(databaseId, stockId, [Appwrite.Query.equal("monthYear", monthYear)]);

        if (response.documents.length === 0) {
            alert("No situation found for " + logDate);
            return;
        }

        const doc = response.documents[0];
        const stockDoc = responseStock.documents[0] || null;

        // Stocks de cuves
        document.getElementById("receivedAgo").textContent = fmt(doc.receivedAgo);
        document.getElementById("receivedPms").textContent = fmt(doc.receivedPms);
        document.getElementById("initialPms").textContent = fmt(doc.initialPms);
        document.getElementById("initialAgo").textContent = fmt(doc.initialAgo);
        document.getElementById("physicalStockAgo").textContent = fmt(doc.physicalStockAgo);
        document.getElementById("physicalStockPms").textContent = fmt(doc.physicalStockPms);
        document.getElementById("theoryStockAgo").textContent = fmt(doc.theoryStockAgo);
        document.getElementById("theoryStockPms").textContent = fmt(doc.theoryStockPms);
        document.getElementById("gainFuelAgo").textContent = fmt(doc.gainFuelAgo);
        document.getElementById("gainFuelPms").textContent = fmt(doc.gainFuelPms);

        // Payments
        document.getElementById("momo").textContent = fmt(doc.momo);
        document.getElementById("momoLoss").textContent = fmt(doc.momoLoss);
        document.getElementById("totalFiche").textContent = fmt(doc.totalFiche);
        document.getElementById("bon").textContent = fmt(doc.bon);
        document.getElementById("spFuelCard").textContent = fmt(doc.spFuelCard);
        document.getElementById("bankCard").textContent = fmt(doc.bankCard);
        document.getElementById("totalCash").textContent = ((Number(doc.totalCash) || 0) + (Number(doc.totalLoans) || 0) + Math.abs(Number(doc.gainPayments) || 0)).toLocaleString();
        document.getElementById("totalPayments").textContent = fmt(doc.totalPayments);

        // Pump indices
        document.getElementById("pms1").textContent = fmt(doc.pms1);
        document.getElementById("pms2").textContent = fmt(doc.pms2);
        document.getElementById("pms3").textContent = fmt(doc.pms3);
        document.getElementById("pms4").textContent = fmt(doc.pms4);
        document.getElementById("ago1").textContent = fmt(doc.ago1);
        document.getElementById("ago2").textContent = fmt(doc.ago2);
        document.getElementById("ago3").textContent = fmt(doc.ago3);
        document.getElementById("ago4").textContent = fmt(doc.ago4);

        // Sales totals
        document.getElementById("totalAgo").textContent = fmt(doc.totalAgo);
        document.getElementById("totalPms").textContent = fmt(doc.totalPms);
        document.getElementById("totalVente").textContent = fmt(doc.totalVente);

        // Indices: Total litres A and Sold C (B = 0 → C = A)
        const venteLitresPms = Number(doc.venteLitresPms) || 0;
        const venteLitresAgo = Number(doc.venteLitresAgo) || 0;
        document.getElementById("litresAPms").textContent = venteLitresPms.toLocaleString();
        document.getElementById("litresAAgo").textContent = venteLitresAgo.toLocaleString();
        document.getElementById("litresCPms").textContent = venteLitresPms.toLocaleString();
        document.getElementById("litresCAgo").textContent = venteLitresAgo.toLocaleString();

        // Per-pump sales (only if the day was completed)
        if (doc.done === true) {
            document.getElementById("p1_essence").textContent = (((doc.pms2 || 0) - (doc.pms1 || 0))).toLocaleString();
            document.getElementById("p2_essence").textContent = (((doc.pms4 || 0) - (doc.pms3 || 0))).toLocaleString();
            document.getElementById("p3_gasoil").textContent = (((doc.ago2 || 0) - (doc.ago1 || 0))).toLocaleString();
            document.getElementById("p4_gasoil").textContent = (((doc.ago4 || 0) - (doc.ago3 || 0))).toLocaleString();
        }

        document.getElementById("done").textContent = doc.done ? "Yes" : "No";

        // Stock-table sales
        document.getElementById("venteLitresPmsStock").textContent = venteLitresPms.toLocaleString();
        document.getElementById("venteLitresAgoStock").textContent = venteLitresAgo.toLocaleString();

        // Monthly running gain/loss (may be missing for the very first day of a new month)
        document.getElementById("totalGainFuelPms").textContent = stockDoc ? fmt(stockDoc.totalGainFuelPms) : "—";
        document.getElementById("totalGainFuelAgo").textContent = stockDoc ? fmt(stockDoc.totalGainFuelAgo) : "—";

        // Snapshot prices for the day (table only — header keeps live prices)
        document.getElementById("pmsPrices").textContent = fmt(doc.pmsPrice);
        document.getElementById("agoPrices").textContent = fmt(doc.agoPrice);

    } catch (err) {
        console.error("Error fetching:", err);
        alert("Error fetching situation: " + (err?.message || err));
    }
}

async function download() {
    const logDate = document.getElementById("logDate").value;
    if (!logDate) { alert("Select a date before downloading."); return; }

    try {
        const element = document.querySelector(".sheet");
        if (!element) { alert("Nothing to export."); return; }

        const opt = {
            margin:      [10, 10, 10, 10],
            filename:    `Situation_${logDate}.pdf`,
            image:       { type: "jpeg", quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
            jsPDF:       { unit: "mm", format: "a4", orientation: "portrait" },
            pagebreak:   { mode: ['css', 'legacy'] }
        };

        await html2pdf().set(opt).from(element).save();
    } catch (error) {
        console.error("Download error:", error);
        alert("Download failed: " + (error?.message || error));
    }
}
