async function fetchSituation() {
  const client = new Appwrite.Client()
        .setEndpoint("https://cloud.appwrite.io/v1") 
        .setProject("68a9b3e90029e6a10ff5");

    const account = new Appwrite.Account(client);
    const databases = new Appwrite.Databases(client);

    const databaseId = "695f766c003a8dc2b3be";
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

            document.getElementById("receivedAgo").textContent = (doc.receivedAgo || 0).toLocaleString();
            document.getElementById("receivedPms").textContent = (doc.receivedPms || 0).toLocaleString();
            document.getElementById("initialPms").textContent = (doc.initialPms || 0).toLocaleString();
            document.getElementById("initialAgo").textContent = (doc.initialAgo || 0).toLocaleString();
            document.getElementById("physicalStockAgo").textContent = (doc.physicalStockAgo || 0).toLocaleString();
            document.getElementById("physicalStockPms").textContent = (doc.physicalStockPms || 0).toLocaleString();
            document.getElementById("theoryStockAgo").textContent = (doc.theoryStockAgo || 0).toLocaleString();
            document.getElementById("theoryStockPms").textContent = (doc.theoryStockPms || 0).toLocaleString();
            document.getElementById("gainFuelAgo").textContent = (doc.gainFuelAgo || 0).toLocaleString();
            document.getElementById("gainFuelPms").textContent = (doc.gainFuelPms || 0).toLocaleString();
            document.getElementById("momo").textContent = (doc.momo || 0).toLocaleString();
            document.getElementById("momoLoss").textContent = (doc.momoLoss || 0).toLocaleString();
            document.getElementById("totalFiche").textContent = (doc.totalFiche || 0).toLocaleString();
            document.getElementById("bon").textContent = (doc.bon || 0).toLocaleString();
            document.getElementById("spFuelCard").textContent = (doc.spFuelCard || 0).toLocaleString();
            document.getElementById("bankCard").textContent = (doc.bankCard || 0).toLocaleString();
            document.getElementById("totalCash").textContent = ((doc.totalCash || 0) + (doc.totalLoans || 0) + Math.abs(doc.gainPayments || 0)).toLocaleString();
            document.getElementById("totalPayments").textContent = (doc.totalPayments) || "0";
            document.getElementById("pms1").textContent = (doc.pms1 || 0).toLocaleString();
            document.getElementById("pms2").textContent = (doc.pms2 || 0).toLocaleString();
            document.getElementById("pms3").textContent = (doc.pms3 || 0).toLocaleString();
            document.getElementById("pms4").textContent = (doc.pms4 || 0).toLocaleString();
            document.getElementById("ago1").textContent = (doc.ago1 || 0).toLocaleString();
            document.getElementById("ago2").textContent = (doc.ago2 || 0).toLocaleString();
            document.getElementById("ago3").textContent = (doc.ago3 || 0).toLocaleString();
            document.getElementById("ago4").textContent = (doc.ago4 || 0).toLocaleString();
            document.getElementById("pmsPrice").textContent = (doc.pmsPrice || 0).toLocaleString();
            document.getElementById("agoPrice").textContent = (doc.agoPrice || 0).toLocaleString();
            document.getElementById("totalAgo").textContent = (doc.totalAgo || 0).toLocaleString();
            document.getElementById("totalPms").textContent = (doc.totalPms || 0).toLocaleString();
            document.getElementById("totalVente").textContent = (Number(doc.totalVente) || 0).toLocaleString();
            document.getElementById("venteLitresAgo").textContent = ((doc.venteLitresAgo || 0).toFixed(2)).toLocaleString();
            document.getElementById("venteLitresPms").textContent = ((doc.venteLitresPms || 0).toFixed(2)).toLocaleString();
            document.getElementById("done").textContent = doc.done || false;

            if (doc.done === true) {            
                document.getElementById("p1_essence").textContent = (((doc.pms2 || 0) - (doc.pms1 || 0)).toFixed(2)).toLocaleString();
                document.getElementById("p2_essence").textContent = (((doc.pms4 || 0) - (doc.pms3 || 0)).toFixed(2)).toLocaleString();
                document.getElementById("p3_gasoil").textContent = (((doc.ago2 || 0) - (doc.ago1 || 0)).toFixed(2)).toLocaleString();
                document.getElementById("p4_gasoil").textContent = (((doc.ago4 || 0) - (doc.ago3 || 0)).toFixed(2)).toLocaleString();
            }

            document.getElementById("venteLitresPmsStock").textContent = (parseInt(doc.venteLitresPms) || 0).toLocaleString();
            document.getElementById("venteLitresAgoStock").textContent = (parseInt(doc.venteLitresAgo) || 0).toLocaleString();
            document.getElementById("totalGainFuelPms").textContent = (stockDoc.totalGainFuelPms || 0).toLocaleString();
            document.getElementById("totalGainFuelAgo").textContent = (stockDoc.totalGainFuelAgo || 0).toLocaleString();           
            document.getElementById("pmsPrices").textContent = (doc.pmsPrice || 0).toLocaleString();
            document.getElementById("agoPrices").textContent = (doc.agoPrice || 0).toLocaleString();
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
