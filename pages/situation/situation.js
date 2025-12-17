async function fetchSituation() {
  const client = new Appwrite.Client()
        .setEndpoint("https://cloud.appwrite.io/v1") 
        .setProject("68c3ec870024955539b0");

    const account = new Appwrite.Account(client);
    const databases = new Appwrite.Databases(client);

    const databaseId = "68c3f10d002b0dfc0b2d";
    const situationId = "68cd6b7f00330a840d96";
    const stockId = "6908ab260012e0412ca8"

    try {

        const logDate = document.getElementById("logDate").value;

        const selectedDate = new Date(logDate);
        
        const mm = String(selectedDate.getMonth() + 1).padStart(2, '0'); // Months are 0-based
        const yyyy = selectedDate.getFullYear();

        const monthYear = `${yyyy}-${mm}`;

        const response = await databases.listDocuments(databaseId, situationId, [Appwrite.Query.equal("logDate", logDate)]);
        const responseStock = await databases.listDocuments(databaseId, stockId, [Appwrite.Query.equal("monthYear", monthYear)]);

        if (response.documents.length > 0) {
            const doc = response.documents[0]; 
            const stockDoc = responseStock.documents[0];

            document.getElementById("receivedAgo").textContent = (doc.receivedAgo).toLocaleString() || "0";
            document.getElementById("receivedPms").textContent = (doc.receivedPms).toLocaleString() || "0";
            document.getElementById("initialPms").textContent = (doc.initialPms).toLocaleString() || "0";
            document.getElementById("initialAgo").textContent = (doc.initialAgo).toLocaleString() || "0";
            document.getElementById("physicalStockAgo").textContent = (doc.physicalStockAgo).toLocaleString() || "0";
            document.getElementById("physicalStockPms").textContent = (doc.physicalStockPms).toLocaleString() || "0";
            document.getElementById("theoryStockAgo").textContent = (doc.theoryStockAgo).toLocaleString() || "0";
            document.getElementById("theoryStockPms").textContent = (doc.theoryStockPms).toLocaleString() || "0";
            document.getElementById("gainFuelAgo").textContent = (doc.gainFuelAgo).toLocaleString() || "0";
            document.getElementById("gainFuelPms").textContent = (doc.gainFuelPms).toLocaleString() || "0";
            document.getElementById("momo").textContent = (doc.momo).toLocaleString() || "0";
            document.getElementById("momoLoss").textContent = (doc.momoLoss).toLocaleString() || "0";
            document.getElementById("totalFiche").textContent = (doc.totalFiche).toLocaleString() || "0";
            document.getElementById("bon").textContent = (doc.bon).toLocaleString() || "0";
            document.getElementById("spFuelCard").textContent = (doc.spFuelCard).toLocaleString() || "0";
            document.getElementById("bankCard").textContent = (doc.bankCard).toLocaleString() || "0";
            document.getElementById("totalCash").textContent = (doc.totalCash + doc.totalLoans + Math.abs(doc.gainPayments)).toLocaleString() || "0";
            document.getElementById("totalPayments").textContent = (doc.totalPayments) || "0";
            document.getElementById("pms1").textContent = (doc.pms1).toLocaleString() || "0";
            document.getElementById("pms2").textContent = (doc.pms2).toLocaleString() || "0";
            document.getElementById("pms3").textContent = (doc.pms3).toLocaleString() || "0";
            document.getElementById("pms4").textContent = (doc.pms4).toLocaleString() || "0";
            document.getElementById("ago1").textContent = (doc.ago1).toLocaleString() || "0";
            document.getElementById("ago2").textContent = (doc.ago2).toLocaleString() || "0";
            document.getElementById("ago3").textContent = (doc.ago3).toLocaleString() || "0";
            document.getElementById("ago4").textContent = (doc.ago4).toLocaleString() || "0";
            document.getElementById("pmsPrice").textContent = (doc.pmsPrice).toLocaleString() || "0";
            document.getElementById("agoPrice").textContent = (doc.agoPrice).toLocaleString() || "0";
            document.getElementById("totalAgo").textContent = (doc.totalAgo).toLocaleString() || "0";
            document.getElementById("totalPms").textContent = (doc.totalPms).toLocaleString() || "0";
            document.getElementById("totalVente").textContent = (Number(doc.totalVente)).toLocaleString() || "0";
            document.getElementById("venteLitresAgo").textContent = ((doc.venteLitresAgo).toFixed(2)).toLocaleString() || "0";
            document.getElementById("venteLitresPms").textContent = ((doc.venteLitresPms).toFixed(2)).toLocaleString() || "0";
            document.getElementById("done").textContent = doc.done || false;

            if (doc.done === true) {            
                document.getElementById("p1_essence").textContent = ((doc.pms2 - doc.pms1).toFixed(2)).toLocaleString() || "0";
                document.getElementById("p2_essence").textContent = ((doc.pms4 - doc.pms3).toFixed(2)).toLocaleString() || "0";
                document.getElementById("p3_gasoil").textContent = ((doc.ago2 - doc.ago1).toFixed(2)).toLocaleString() || "0";
                document.getElementById("p4_gasoil").textContent = ((doc.ago4 - doc.ago3).toFixed(2)).toLocaleString() || "0";
            }

            document.getElementById("venteLitresPmsStock").textContent = (parseInt(doc.venteLitresPms)).toLocaleString() || "0";
            document.getElementById("venteLitresAgoStock").textContent = (parseInt(doc.venteLitresAgo)).toLocaleString() || "0";
            document.getElementById("totalGainFuelPms").textContent = (stockDoc.totalGainFuelPms).toLocaleString();
            document.getElementById("totalGainFuelAgo").textContent = (stockDoc.totalGainFuelAgo).toLocaleString();           
            document.getElementById("pmsPrices").textContent = (doc.pmsPrice).toLocaleString() || "0";
            document.getElementById("agoPrices").textContent = (doc.agoPrice).toLocaleString() || "0";
        } else {
        console.log("No documents found for date:", logDate);
        }

        alert("Data fetched successfully");

    } catch (err) {
        console.error("Error fetching:", err);
    }
}

function download() {

    try {
        // Ensure data is up to date
        // If your displayDetails() fetches/fills data, call it here or make sure it's already run
        // displayDetails();

        // Choose the section to export: body, main, or a wrapper

        const logDate = document.getElementById("logDate").value;
        // const email = document.getElementById("email").value;

        const element = document.body;

        const opt = {
        margin:       0.4,
        filename:     "Situation "+logDate + ".pdf",
        image:        { type: "jpeg", quality: 0.98 },
        html2canvas:  { scale: 4, useCORS: true, scrollY: 0 },        
        jsPDF:        { unit: "px", format: [element.scrollWidth, element.scrollHeight], orientation: "portrait" },
        pagebreak:    { mode: ['css', 'legacy'] } 
        };

        html2pdf().set(opt).from(element).save();

    } catch (error) {
        console.log("This is the error ", error);
        
    }
}
