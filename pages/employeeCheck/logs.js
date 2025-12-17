import { setField } from "../../utils/utils.js";

let logDate, email;
let allDocuments = []; // Store all fetched documents
let currentPage = 0;

export async function displayDetails() {
    const client = new Appwrite.Client()
        .setEndpoint("https://cloud.appwrite.io/v1") 
        .setProject("68c3ec870024955539b0");

    const account = new Appwrite.Account(client);
    const databases = new Appwrite.Databases(client);

    const databaseId = "68c3f10d002b0dfc0b2d";
    const indexId = "68cd1987002bae34ea4b";
    const paymentsId = "68cd19990006cbb33843";    

    logDate = document.getElementById("logDate").value;
    email = document.getElementById("email").value;

    if (!logDate && !email) {
        return alert("Choose a date and an employee")
    }
    
    try {
        clearSheetOutputs();

        // Reset documents array and page counter
        allDocuments = [];
        currentPage = 0;

        const responseIndex = await databases.listDocuments(databaseId, indexId, [Appwrite.Query.equal("logDate", logDate)]);
        console.log("Here are the dates", responseIndex);

        // Collect all matching documents
        for (let i = 0; i < responseIndex.documents.length; i++) {
            const doc = responseIndex.documents[i];

            if (doc.email === email) {
                allDocuments.push(doc);
            }
        }

        if (allDocuments.length === 0) {
            alert("No records found for this date and employee");
            return;
        }

        // Fetch payment data for all documents
        const responsePayments = await databases.listDocuments(databaseId, paymentsId, [Appwrite.Query.equal("logDate", logDate)]);

        // Attach payment data to corresponding documents
        for (let doc of allDocuments) {
            const paymentDoc = responsePayments.documents.find(p => p.id === doc.id);
            if (paymentDoc) {
                doc.paymentData = paymentDoc;
            }
        }

        // Display first page
        currentPage = 1;
        displayPage(currentPage);

    } catch (error) {
        console.log("Error is this", error);        
    }
}

function displayPage(pageNumber) {
    if (pageNumber < 1 || pageNumber > allDocuments.length) {
        return;
    }

    clearSheetOutputs();

    const doc = allDocuments[pageNumber - 1];

    document.getElementById("pms1").textContent = (doc.pms1).toLocaleString() || "0";
    document.getElementById("pms2").textContent = (doc.pms2).toLocaleString() || "0";
    document.getElementById("pms3").textContent = (doc.pms3).toLocaleString() || "0";
    document.getElementById("pms4").textContent = (doc.pms4).toLocaleString() || "0";
    document.getElementById("ago1").textContent = (doc.ago1).toLocaleString() || "0";
    document.getElementById("ago2").textContent = (doc.ago2).toLocaleString() || "0";
    document.getElementById("ago3").textContent = (doc.ago3).toLocaleString() || "0";
    document.getElementById("ago4").textContent = (doc.ago4).toLocaleString() || "0"; 
    document.getElementById("pmsPrice").textContent = `${(doc.pmsPrice).toLocaleString()} RWF` || "0";
    document.getElementById("agoPrice").textContent = `${(doc.agoPrice).toLocaleString()} RWF` || "0";
    document.getElementById("totalAgo").textContent = `${(doc.totalAgo).toLocaleString()} RWF` || "0";
    document.getElementById("totalPms").textContent = `${(doc.totalPms).toLocaleString()} RWF` || "0";
    document.getElementById("totalVente").textContent = `${(doc.totalVente).toLocaleString()} RWF` || "0";
    document.getElementById("venteLitresAgo").textContent = ((doc.venteLitresAgo || 0).toFixed(2)).toLocaleString();
    document.getElementById("venteLitresPms").textContent = ((doc.venteLitresPms || 0).toFixed(2)).toLocaleString();

    document.getElementById("p1_essence").textContent = ((doc.pms2 - doc.pms1).toFixed(2)).toLocaleString() || "0";
    document.getElementById("p2_essence").textContent = ((doc.pms4 - doc.pms3).toFixed(2)).toLocaleString() || "0";
    document.getElementById("p3_gasoil").textContent = ((doc.ago2 - doc.ago1).toFixed(2)).toLocaleString() || "0";
    document.getElementById("p4_gasoil").textContent = ((doc.ago4 - doc.ago3).toFixed(2)).toLocaleString() || "0";

    document.getElementById("pmsPrices").textContent = (doc.pmsPrice).toLocaleString() || "0";
    document.getElementById("agoPrices").textContent = (doc.agoPrice).toLocaleString() || "0";

    if (doc.paymentData) {
        const paymentDoc = doc.paymentData;
        
        try {
            const loans = JSON.parse(paymentDoc.loans || "[]");
            const fiche = JSON.parse(paymentDoc.fiche || "[]");
            
            const fields = [
                "momo", "momoLoss", "totalFiche", "bon", "spFuelCard", 
                "bankCard", "listSFC", "listBC", "totalCash", "totalPayments", 
                "gainPayments", "totalLoans"
            ];

            fields.forEach(f => setField(f, paymentDoc[f]));      

            document.getElementById("loans").textContent = loans.map(loan => `${loan.company}: ${(loan.amount).toLocaleString()}`).join(", ");
            document.getElementById("fiche").textContent = fiche.map(item => `${item.company}: ${(item.amount).toLocaleString()}`).join(", ");
        } catch (error) {
            console.error("Error parsing payment data:", error);
        }
    }

    updatePaginationUI();
}

function updatePaginationUI() {
    const totalPages = allDocuments.length;

    document.getElementById("prevPage").disabled = currentPage === 1;
    document.getElementById("nextPage").disabled = currentPage === totalPages;

    document.getElementById("pageNumber").textContent = `Page ${currentPage} of ${totalPages}`;
}

function clearSheetOutputs() {
    const spans = document.querySelectorAll("main.sheet span");
    spans.forEach(span => {
        span.textContent = "";
    });
}

// Navigation handlers
export function goToPreviousPage() {
    if (currentPage > 1) {
        currentPage--;
        displayPage(currentPage);
    }
}

export function goToNextPage() {
    if (currentPage < allDocuments.length) {
        currentPage++;
        displayPage(currentPage);
    }
}

window.displayDetails = displayDetails;
window.goToPreviousPage = goToPreviousPage;
window.goToNextPage = goToNextPage;

export function download() {
    try {
        const logDate = document.getElementById("logDate").value;
        const email = document.getElementById("email").value;

        const element = document.body;

        const opt = {
            margin: 0.4,
            filename: email + logDate + ".pdf",
            image: { type: "jpeg", quality: 0.98 },
            html2canvas: { scale: 4, useCORS: true, scrollY: 0 },        
            jsPDF: { unit: "px", format: [element.scrollWidth, element.scrollHeight], orientation: "portrait" },
            pagebreak: { mode: ['css', 'legacy'] } 
        };

        html2pdf().set(opt).from(element).save();

    } catch (error) {
        console.log("This is the error ", error);
    }
}

window.download = download;