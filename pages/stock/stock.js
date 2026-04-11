let initialPms, initialAgo;
let receivedPms, receivedAgo, physicalStockPms;
let physicalStockAgo, theoryStockPms, theoryStockAgo;
let gainFuelPms, gainFuelAgo;
let totalGainFuelPms, totalGainFuelAgo;
let totalReceivedPms, totalReceivedAgo;
let logDate, venteLitresAgo, venteLitresPms;
let totalVenteLitresAgo, totalVenteLitresPms;


async function stock() {
    const client = new Appwrite.Client()
        .setEndpoint("https://cloud.appwrite.io/v1") 
        .setProject("68a9b3e90029e6a10ff5");

    const account = new Appwrite.Account(client);
    const databases = new Appwrite.Databases(client);

    const databaseId = "695f766c003a8dc2b3be";
    const indexId = "68cd1987002bae34ea4b";
    const situationId = "68cd6b7f00330a840d96";

  try {

    
    logDate = document.getElementById("logDate").value;
     
    if (!logDate) {
        toast("Enter a date to continue", "warning");
        return;
    }

    const user = await account.get();
    const response = await databases.listDocuments(databaseId, situationId,[ Appwrite.Query.equal("logDate", logDate) ]);

    if (response.documents.length > 0) {
      const doc = response.documents[0];

      venteLitresAgo = parseInt(doc.venteLitresAgo, 10);
      venteLitresPms = parseInt(doc.venteLitresPms, 10);
    }
  } catch (err) {
    toast("Error fetching sales data: " + err.message, "error");
  }

    initialPms = parseInt(document.getElementById("initialPms").value);
    initialAgo = parseInt(document.getElementById("initialAgo").value);
    receivedPms = parseInt(document.getElementById("receivedPms").value) || 0;
    receivedAgo = parseInt(document.getElementById("receivedAgo").value) || 0;
    physicalStockPms = parseInt(document.getElementById("physicalStockPms").value);
    physicalStockAgo = parseInt(document.getElementById("physicalStockAgo").value);

    theoryStockPms = initialPms + receivedPms - venteLitresPms ;
    theoryStockAgo = initialAgo + receivedAgo - venteLitresAgo ;

    gainFuelPms = physicalStockPms - theoryStockPms ;
    gainFuelAgo = physicalStockAgo - theoryStockAgo ;

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

    const client = new Appwrite.Client()
        .setEndpoint("https://cloud.appwrite.io/v1")
        .setProject("68a9b3e90029e6a10ff5");

    const account = new Appwrite.Account(client);
    const databases = new Appwrite.Databases(client);

    const databaseId = "695f766c003a8dc2b3be";
    const stockAgoId = "68cbf2bb0017a7b210b1";
    const stockPmsId = "68cd197e002096e31ed8";
    const situationId = "68cd6b7f00330a840d96";
    const stockId = "6908ab260012e0412ca8";

    const selectedDate = new Date(logDate);
    
    const mm = String(selectedDate.getMonth() + 1).padStart(2, '0'); // Months are 0-based
    const yyyy = selectedDate.getFullYear();

    const monthYear = `${yyyy}-${mm}`;
    
    try {
        
        const user = await account.get();
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

        const response = await databases.listDocuments(databaseId, stockId,[ Appwrite.Query.equal("monthYear", monthYear) ]);

        
        totalGainFuelPms = gainFuelPms; 
        totalGainFuelAgo = gainFuelAgo;
        totalReceivedPms = receivedPms;
        totalReceivedAgo = receivedAgo;
        totalVenteLitresPms = venteLitresPms;
        totalVenteLitresAgo = venteLitresAgo;       

        if (response.documents.length > 0) {
            const stockDoc = response.documents[0];       

            const docId = stockDoc.$id;

            totalGainFuelPms += stockDoc.totalGainFuelPms;
            totalGainFuelAgo += stockDoc.totalGainFuelAgo;
            totalReceivedPms += stockDoc.totalReceivedPms;
            totalReceivedAgo += stockDoc.totalReceivedAgo;
            totalVenteLitresPms += stockDoc.totalVenteLitresPms;
            totalVenteLitresAgo += stockDoc.totalVenteLitresAgo;

            const stockData = {
                totalGainFuelPms, 
                totalGainFuelAgo,
                totalReceivedPms,
                totalReceivedAgo,
                totalVenteLitresPms,
                totalVenteLitresAgo                     
            }

            await databases.updateDocument(
                databaseId,
                stockId,
                docId,
                stockData
            );
    
        } else {

            const stockData = {
                totalGainFuelPms, 
                totalGainFuelAgo,
                totalReceivedPms,
                totalReceivedAgo,
                totalVenteLitresPms,
                totalVenteLitresAgo,
                monthYear                    
            }

            await databases.createDocument(
                databaseId,
                stockId,
                "unique()",
                stockData
            );

        }

        const res = await databases.listDocuments(databaseId,stockAgoId);
        
        await databases.createDocument(
        databaseId,
        stockAgoId,
        "unique()", // Appwrite generates an ID
        dataAgo
        );

        await databases.createDocument(
        databaseId,
        stockPmsId,
        "unique()", // Appwrite generates an ID
        dataPms
        );

        toast("Stock saved", "success");

        document.getElementById("stockForm").reset();

    } catch (err) {
        toast("Error: " + err.message, "error");
    }


    try {
        // 1. Find the document by attribute
        const docs = await databases.listDocuments(
            databaseId,
            situationId,
            [ Appwrite.Query.equal("logDate", logDate) ] // filter by your known attribute
        );

        if (docs.total === 0) {
            return;
        }

        const docId = docs.documents[0].$id; // get the first match

        // 2. Update the null fields
        const updated = await databases.updateDocument(
            databaseId,
            situationId,
            docId,
            {
                initialAgo: initialAgo,
                receivedAgo: receivedAgo,
                physicalStockAgo: physicalStockAgo,
                theoryStockAgo: theoryStockAgo,
                gainFuelAgo: gainFuelAgo,
                initialPms: initialPms,
                receivedPms: receivedPms,
                physicalStockPms: physicalStockPms,
                theoryStockPms: theoryStockPms,
                gainFuelPms: gainFuelPms,
            }
        );
        
        toast("Situation updated", "success");

        function clearOutputs() {

            const outputs = document.querySelectorAll(".output");
            outputs.forEach(el => {
                el.textContent = "0";
            });
        }

        clearOutputs();

    } catch (error) {
        toast("Error updating situation", "error");
    }
}

function download() {
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

        html2pdf().set(opt).from(element).save();

    } catch (error) {
        toast("Download failed: " + error.message, "error");
    }
}

async function saveData(collection, data) {
  return fetch(`https://testing-projects-4ttw.onrender.com/api/create/${collection}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then(r => r.json());
}