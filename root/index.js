let totalVente,pms1,pms2,pms3,pms4,ago1,ago2,ago3,ago4;
let venteLitresPms, totalPms, venteLitresAgo, totalAgo;
let pmsPrice, agoPrice, logDate, shift;
let momoFeePercent = 0.5;

async function calculateIndex() {
    const client = new Appwrite.Client()
        .setEndpoint("https://cloud.appwrite.io/v1") 
        .setProject("68a9b3e90029e6a10ff5");

    const account = new Appwrite.Account(client);
    const databases = new Appwrite.Databases(client);

    const databaseId = "695f766c003a8dc2b3be";
    const indexId = "68cd1987002bae34ea4b";

    const settingsId = "69d3ed400021197ed76e"; 
    try {
        const settingsRes = await databases.listDocuments(databaseId, settingsId);
        if (settingsRes.documents.length > 0) {
            pmsPrice       = settingsRes.documents[0].pmsPrice       ?? 1989;
            agoPrice       = settingsRes.documents[0].agoPrice       ?? 1900;
            momoFeePercent = settingsRes.documents[0].momoFeePercent ?? 0.5;
        } else {
            pmsPrice = 1989;
            agoPrice = 1900;
            momoFeePercent = 0.5;
        }
    } catch {
        pmsPrice = 1989;
        agoPrice = 1900;
        momoFeePercent = 0.5;
    }

    pms1 =Number(document.getElementById("pms1").value);
    pms2 =Number(document.getElementById("pms2").value);
    pms3 =Number(document.getElementById("pms3").value);
    pms4 =Number(document.getElementById("pms4").value);
    ago1 =Number(document.getElementById("ago1").value);
    ago2 =Number(document.getElementById("ago2").value);
    ago3 =Number(document.getElementById("ago3").value);
    ago4 =Number(document.getElementById("ago4").value);
    logDate= document.getElementById("logDate").value;
    shift = document.getElementById("shift").value;

    venteLitresPms = (pms2 - pms1) + (pms4 - pms3);
    totalPms = parseInt(venteLitresPms*pmsPrice, 10);

    venteLitresAgo = (ago2 - ago1) + (ago4 - ago3);
    totalAgo = parseInt(venteLitresAgo*agoPrice, 10);

    totalVente = totalAgo + totalPms;

    document.getElementById("resultpms").textContent = `${totalPms.toLocaleString()} RWF`;
    document.getElementById("resultago").textContent = `${totalAgo.toLocaleString()} RWF`;
    document.getElementById("result").textContent = `${totalVente.toLocaleString()} RWF`;

    try {
        
        async function getDayBefore(logDate) {

            if (!logDate) return alert("Select a date!");

            const selectedDate = new Date(logDate);
            selectedDate.setDate(selectedDate.getDate() - 1);
            
            const mm = String(selectedDate.getMonth() + 1).padStart(2, '0'); // Months are 0-based
            const dd = String(selectedDate.getDate()).padStart(2, '0');
            const yyyy = selectedDate.getFullYear();

            return `${mm}/${dd}/${yyyy}`;

        }

        const dateBefore = await getDayBefore(logDate);
        let pmsMatch = false;
        let agoMatch = false;

        const response = await databases.listDocuments(databaseId, indexId, [Appwrite.Query.equal("logDate", logDate)]);

        for (const doc of response.documents) {
            // Check PMS match if values are provided
            if (pms1 && pms3) {
                if (pms1 === doc.pms2 && pms3 === doc.pms4) {
                    pmsMatch = true;
                }
            } else {
                // If PMS not provided, consider it as found
                pmsMatch = true;
            }
            
            // Check AGO match if values are provided
            if (ago1 && ago3) {
                if (ago1 === doc.ago2 && ago3 === doc.ago4) {
                    agoMatch = true;
                }
            } else {
                // If AGO not provided, consider it as found
                agoMatch = true;
            }
            
            // If both are found, we can break early
            if (pmsMatch && agoMatch) {
                break;
            }
        }

        let match = pmsMatch && agoMatch;

        if (!match) {
            pmsMatch = false;
            agoMatch = false;
            
            const beforeResponse = await databases.listDocuments(databaseId, indexId, [Appwrite.Query.equal("logDate", dateBefore)]);

            for (const doc of beforeResponse.documents) {
                // Check PMS match if values are provided
                if (pms1 && pms3) {
                    if (pms1 === doc.pms2 && pms3 === doc.pms4 && doc.shift === "Night") {
                        pmsMatch = true;
                    }
                } else {
                    pmsMatch = true;
                }
                
                // Check AGO match if values are provided
                if (ago1 && ago3) {
                    if (ago1 === doc.ago2 && ago3 === doc.ago4 && doc.shift === "Night") {
                        agoMatch = true;
                    }
                } else {
                    agoMatch = true;
                }
                
                // If both are found, we can break early
                if (pmsMatch && agoMatch) {
                    break;
                }
            }
            
            match = pmsMatch && agoMatch;
        }

        if (match) {
            alert("All index match");
        } else {
            alert("Check Index they do not match");
        }

    } catch (error) {
        console.log("The error is ", error);
        
    }
}

let momo, momoLoss, totalFiche, bon, spFuelCard, bankCard;
let cash5000, cash2000, cash1000, cash500;
let totalCash, totalPayments, gainPayments, listBC, listSFC, totalLoans;

async function payments() {

    try {
        
    
        momo = Number(document.getElementById("momo").value);
        momoLoss = Number(document.getElementById("momoLoss").value);
        bon = Number(document.getElementById("bon").value);
        cash5000 = Number(document.getElementById("5000").value);
        cash2000 = Number(document.getElementById("2000").value);
        cash1000 = Number(document.getElementById("1000").value);
        cash500 = Number(document.getElementById("500").value);
        logDate= document.getElementById("logDate").value;
        shift = document.getElementById("shift").value;

        listSFC = [...spFuelCardList];
        listBC  = [...bankCardList];

        spFuelCard = listSFC.reduce((sum, n) => sum + n, 0);
        bankCard   = listBC.reduce((sum, n) => sum + n, 0);

        totalLoans = loans.reduce((sum, loan) => sum + loan.amount, 0);
        totalFiche = fiche.reduce((sum, item) => sum + item.amount, 0);

        totalCash = (cash5000*5000) + (cash2000*2000) + (cash1000*1000) + (cash500*500);
        totalPayments = momo+ momoLoss + totalFiche + bon + spFuelCard + bankCard + totalCash + totalLoans ;
        gainPayments = totalPayments - totalVente;

        
        document.getElementById("totalLoans").textContent = `${totalLoans.toLocaleString()} RWF`;
        document.getElementById("totalFiche").textContent = `${totalFiche.toLocaleString()} RWF`;
        document.getElementById("totalPayments").textContent = `${totalPayments.toLocaleString()} RWF`;
        const gainEl = document.getElementById("gainPayments");
        gainEl.textContent = `${gainPayments.toLocaleString()} RWF`;
        gainEl.className = `output result-value ${gainPayments >= 0 ? 'gain' : 'loss'}`;
        document.getElementById("totalCash").textContent = `${totalCash.toLocaleString()} RWF`;
    } catch (error) {
        console.log(error)  
    }
}

let dataSituation; 
async function situation() {
    const client = new Appwrite.Client()
        .setEndpoint("https://cloud.appwrite.io/v1") 
        .setProject("68a9b3e90029e6a10ff5");

    const account = new Appwrite.Account(client);
    const databases = new Appwrite.Databases(client);

    const databaseId = "695f766c003a8dc2b3be";
    const indexId = "68cd1987002bae34ea4b";
    const paymentsId = "68cd19990006cbb33843";
    const situationId = "68cd6b7f00330a840d96";

    try {
        
        const user = await account.get();
        const email = await user.email;          
        const employee = user.name;

        function generateShiftId(employee, logDate) {
            return `${employee}_${logDate}_${crypto.randomUUID()}`;
        }

        const id = generateShiftId(employee,logDate);

        const selectedDate = new Date(logDate);
        
        const mm = String(selectedDate.getMonth() + 1).padStart(2, '0'); // Months are 0-based
        const yyyy = selectedDate.getFullYear();

        const monthYear = `${yyyy}-${mm}`;


        const gainPompisteId = "68dbbb760034fb10a518"
        const gainDocs = await databases.listDocuments(databaseId, gainPompisteId, [Appwrite.Query.equal("email", email), Appwrite.Query.equal("monthYear", monthYear)]);
        const doc = gainDocs.documents;     


        if ( doc.length === 0) {

            const newData = {
               employee,
               email,
               gainPayments,
               logDate,
               monthYear
            };
            
            await databases.createDocument(
                databaseId,
                gainPompisteId,
                "unique()",
                newData
            );

        } else {

            const docId = doc[0].$id;
            const newGain = gainPayments + doc[0].gainPayments;
            
            const oldData = {
               employee,
               email,
               gainPayments: newGain,
               logDate,
               monthYear
            };

            await databases.updateDocument(
                databaseId,
                gainPompisteId,
                docId,
                oldData
            );
            
        }
        

        const dataIndex = {
            venteLitresPms, 
            totalPms, 
            venteLitresAgo, 
            totalAgo,
            totalVente,
            pms1,
            pms2,
            pms3,
            pms4,
            ago1,
            ago2,
            ago3,
            ago4,
            pmsPrice,
            agoPrice,
            email,
            logDate,
            shift,
            employee,
            id,
        };

        const dataPayments = {
            momo, 
            momoLoss, 
            totalFiche,
            bon, 
            listBC,
            listSFC,
            bankCard,
            spFuelCard,
            cash5000, 
            cash2000, 
            cash1000, 
            cash500,
            totalCash, 
            totalPayments, 
            gainPayments,
            email,
            logDate,
            shift,
            employee,
            id,
            loans : JSON.stringify(loans),
            fiche : JSON.stringify(fiche),
            totalLoans,
            totalVente
        };

        const response = await databases.listDocuments(databaseId, situationId, [Appwrite.Query.equal("logDate", logDate)]);

        if (shift === "Morning") {
            
            if ( response.documents.length === 0 ) {
                
                dataSituation = {
                    momo, 
                    momoLoss, 
                    totalFiche, 
                    bon,
                    spFuelCard,
                    bankCard,
                    totalCash, 
                    totalLoans,
                    totalPayments, 
                    gainPayments,
                    venteLitresPms, 
                    totalPms, 
                    venteLitresAgo, 
                    totalAgo,
                    totalVente,
                    pms1,
                    pms3,
                    ago1,
                    ago3,
                    pmsPrice,
                    agoPrice,
                    logDate,
                };

                await databases.createDocument(
                    databaseId,
                    situationId,
                    "unique()", // Appwrite generates an ID
                    dataSituation
                ) 
            } else {
                const doc = response.documents[0];

                const docId = doc.$id;

                momo += doc.momo;
                momoLoss += doc.momoLoss;
                totalFiche += doc.totalFiche;
                bon += doc.bon;
                spFuelCard += doc.spFuelCard;
                bankCard += doc.bankCard;
                totalCash += doc.totalCash;
                totalLoans += doc.totalLoans;
                totalPayments += doc.totalPayments;
                gainPayments += doc.gainPayments;
                venteLitresPms += doc.venteLitresPms;
                totalPms += doc.totalPms;
                venteLitresAgo += doc.venteLitresAgo;
                totalAgo += doc.totalAgo;
                totalVente += doc.totalVente;
                
                dataSituation = {
                    momo, 
                    momoLoss,
                    totalFiche,
                    bon,
                    spFuelCard,
                    bankCard,
                    totalCash, 
                    totalLoans,
                    totalPayments, 
                    gainPayments,
                    venteLitresPms, 
                    totalPms, 
                    venteLitresAgo, 
                    totalAgo,
                    totalVente,
                }

                const updated = await databases.updateDocument(
                databaseId,
                situationId,
                docId,
                dataSituation)
            }

        } else if ( (shift === "Afternoon" || shift === "Evening") && response.documents.length !== 0) {
            const doc = response.documents[0];

            const docId = doc.$id;

            momo += doc.momo;
            momoLoss += doc.momoLoss;
            totalFiche += doc.totalFiche;
            bon += doc.bon;
            spFuelCard += doc.spFuelCard;
            bankCard += doc.bankCard;
            totalCash += doc.totalCash;
            totalLoans += doc.totalLoans;
            totalPayments += doc.totalPayments;
            gainPayments += doc.gainPayments;
            venteLitresPms += doc.venteLitresPms;
            totalPms += doc.totalPms;
            venteLitresAgo += doc.venteLitresAgo;
            totalAgo += doc.totalAgo;
            totalVente += doc.totalVente;
            
            dataSituation = {
                momo, 
                momoLoss,
                totalFiche,
                bon,
                spFuelCard,
                bankCard,
                totalCash, 
                totalLoans,
                totalPayments, 
                gainPayments,
                venteLitresPms, 
                totalPms, 
                venteLitresAgo, 
                totalAgo,
                totalVente,
            }

            const updated = await databases.updateDocument(
            databaseId,
            situationId,
            docId,
            dataSituation)
            
        } else if(shift === "Night" && response.documents.length !== 0 ){
            const doc = response.documents[0];

            const docId = doc.$id;
            const done = true;

            momo += doc.momo;
            momoLoss += doc.momoLoss;
            totalFiche += doc.totalFiche;
            bon += doc.bon;
            spFuelCard += doc.spFuelCard;
            bankCard += doc.bankCard;
            totalCash += doc.totalCash;
            totalLoans += doc.totalLoans;
            totalPayments += doc.totalPayments;
            gainPayments += doc.gainPayments;
            venteLitresPms += doc.venteLitresPms;
            totalPms += doc.totalPms;
            venteLitresAgo += doc.venteLitresAgo;
            totalAgo += doc.totalAgo;
            totalVente += doc.totalVente;
            
            dataSituation = {
                momo, 
                momoLoss, 
                totalFiche,
                bon, 
                spFuelCard,
                bankCard,
                totalCash, 
                totalLoans,
                totalPayments, 
                gainPayments,
                venteLitresPms, 
                totalPms, 
                venteLitresAgo, 
                totalAgo,
                totalVente,
                pms2,
                pms4,
                ago2,
                ago4,
                done,
            }

            const updated = await databases.updateDocument(
            databaseId,
            situationId,
            docId,
            dataSituation)
            
        }
        
        
        

        await databases.createDocument(
            databaseId,
            indexId,
            "unique()", // Appwrite generates an ID
            dataIndex
        );

        await databases.createDocument(
            databaseId,
            paymentsId,
            "unique()", // Appwrite generates an ID
            dataPayments
        );

        alert("Data saved successfully"); 

        function clearOutputs() {

            const outputs = document.querySelectorAll(".output");
            outputs.forEach(el => { el.textContent = "0"; });

            document.getElementById("momo").value = "";
            clearFiche();
            clearLoan();

            loans = [];
            fiche = [];
            spFuelCardList = [];
            bankCardList = [];
            document.getElementById("spFuelCardChips").innerHTML = "";
            document.getElementById("bankCardChips").innerHTML = "";
        }

        clearOutputs();
        
        document.getElementById("rapportForm").reset();
        document.getElementById("paymentsForm").reset();

    } catch (err) {
        console.error("Error:", err.message);

        // If user is not logged in, redirect them to login
        if (err.message.includes("Unauthorized")) {
            alert("You must log in first!");
            // window.location.href = "/sign-in/sign-in";
        } else {
            alert("Error: " + err.message);
        }
    } 
}

function clearFiche() {
    document.getElementById("fiche-plate").value = "";
    document.getElementById("fiche-company").value = "";
    document.getElementById("fiche-amount").value = "";
}

function clearLoan() {
    document.getElementById("loan-plate").value = "";
    document.getElementById("loan-company").value = "";
    document.getElementById("loan-amount").value = "";
}


function mapTypeToInput(appwriteType) {
  switch (appwriteType) {
    case "integer":
      return "number";
    case "float":
      return "number";
    case "boolean":
      return "checkbox";
    case "email":
      return "email";
    case "url":
      return "url";
    case "datetime":
      return "date";
    default:
      return "text"; // for string, enum, etc.
  }
}

let spFuelCardList = [];
let bankCardList = [];

function renderChips(containerId, list, removeFn) {
    const container = document.getElementById(containerId);
    container.innerHTML = "";
    list.forEach((amt, i) => {
        const chip = document.createElement("span");
        chip.className = "chip";
        chip.textContent = amt.toLocaleString() + " RWF";
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "chip-remove";
        btn.textContent = "×";
        btn.onclick = () => removeFn(i);
        chip.appendChild(btn);
        container.appendChild(chip);
    });
}

function addSpCard() {
    const input = document.getElementById("spFuelCardInput");
    const val = parseInt(input.value);
    if (!val || val <= 0) return;
    spFuelCardList.push(val);
    renderChips("spFuelCardChips", spFuelCardList, removeSpCard);
    input.value = "";
    input.focus();
}
function removeSpCard(i) {
    spFuelCardList.splice(i, 1);
    renderChips("spFuelCardChips", spFuelCardList, removeSpCard);
}

function addBankCard() {
    const input = document.getElementById("bankCardInput");
    const val = parseInt(input.value);
    if (!val || val <= 0) return;
    bankCardList.push(val);
    renderChips("bankCardChips", bankCardList, removeBankCard);
    input.value = "";
    input.focus();
}
function removeBankCard(i) {
    bankCardList.splice(i, 1);
    renderChips("bankCardChips", bankCardList, removeBankCard);
}

let loans = [];
async function storeLoan() {
    const client = new Appwrite.Client()
    .setEndpoint("https://cloud.appwrite.io/v1") 
    .setProject("68a9b3e90029e6a10ff5");
    
    const account = new Appwrite.Account(client);
    const databases = new Appwrite.Databases(client);

    const databaseId = "695f766c003a8dc2b3be";
    const loansId = "68fbe6f80019b53fb32f";
    const paymentsId = "68cd19990006cbb33843";
    
    const user = await account.get();        
    const employee = user.name;  
    
    const today = new Date();

    const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-11
    const day = String(today.getDate()).padStart(2, '0');        // Days 1-31
    const year = today.getFullYear();

    logDate = document.getElementById("logDate").value;
    const monthYear = `${year}-${month}`;

    const plate = document.getElementById("loan-plate").value;
    const amount = parseInt(document.getElementById("loan-amount").value);
    const company = document.getElementById("loan-company").value;

    try {

        const loanData = {
            plate,
            company,
            logDate,
            monthYear,
            employee,
            amount
        };

        await databases.createDocument(
        databaseId,
        loansId,
        "unique()",
        loanData
        );

        alert("Data saved successfully");

    } catch (err) {
      console.error("Error:", err.message);
      alert("Error: " + err.message);
    }

    clearLoan();

    loans.push({company, amount});
    
    

    // try {
    //     // 1. Find the document by attribute
    //     const docs = await databases.listDocuments(
    //         databaseId,
    //         paymentsId,
    //         [ Appwrite.Query.equal("logDate", logDate) ] // filter by your known attribute
    //     );

    //     if (docs.total === 0) {
    //         console.log("No document found!");
    //         return;
    //     }

    //     const docId = docs.documents[0].$id; // get the first match

    //     // 2. Update the null fields
    //     const updated = await databases.updateDocument(
    //         databaseId,
    //         situationId,
    //         docId,
    //         {
    //             initialAgo: initialAgo,
    //             receivedAgo: receivedAgo,
    //             physicalStockAgo: physicalStockAgo,
    //             theoryStockAgo: theoryStockAgo,
    //             gainFuelAgo: gainFuelAgo,
    //             initialPms: initialPms,
    //             receivedPms: receivedPms,
    //             physicalStockPms: physicalStockPms,
    //             theoryStockPms: theoryStockPms,
    //             gainFuelPms: gainFuelPms,
    //         }
    //     );

    //     alert("Data saved successfully");

    // } catch (error) {
    //     alert("Error updating:", error);
    // }
}
let fiche = [];
async function storeFiche() {
    const client = new Appwrite.Client()
    .setEndpoint("https://cloud.appwrite.io/v1") 
    .setProject("68a9b3e90029e6a10ff5");
    
    const account = new Appwrite.Account(client);
    const databases = new Appwrite.Databases(client);

    const databaseId = "695f766c003a8dc2b3be";
    const ficheId = "69007206001aed40d6f4";

    const user = await account.get();        
    const employee = user.name;  

    logDate = document.getElementById("logDate").value;

    const plate = document.getElementById("fiche-plate").value;
    const amount = parseInt(document.getElementById("fiche-amount").value);
    const company = document.getElementById("fiche-company").value;

    try {

        const ficheData = {
            plate,
            company,
            logDate,
            employee,
            amount
        };

        await databases.createDocument(
        databaseId,
        ficheId,
        "unique()",
        ficheData
        );

        alert("Data saved successfully");

    } catch (err) {
      console.error("Error:", err.message);
      alert("Error: " + err.message);
    }

    clearFiche();

    fiche.push({company, amount});
    
    

    // try {
    //     // 1. Find the document by attribute
    //     const docs = await databases.listDocuments(
    //         databaseId,
    //         paymentsId,
    //         [ Appwrite.Query.equal("logDate", logDate) ] // filter by your known attribute
    //     );

    //     if (docs.total === 0) {
    //         console.log("No document found!");
    //         return;
    //     }

    //     const docId = docs.documents[0].$id; // get the first match

    //     // 2. Update the null fields
    //     const updated = await databases.updateDocument(
    //         databaseId,
    //         situationId,
    //         docId,
    //         {
    //             initialAgo: initialAgo,
    //             receivedAgo: receivedAgo,
    //             physicalStockAgo: physicalStockAgo,
    //             theoryStockAgo: theoryStockAgo,
    //             gainFuelAgo: gainFuelAgo,
    //             initialPms: initialPms,
    //             receivedPms: receivedPms,
    //             physicalStockPms: physicalStockPms,
    //             theoryStockPms: theoryStockPms,
    //             gainFuelPms: gainFuelPms,
    //         }
    //     );

    //     alert("Data saved successfully");

    // } catch (error) {
    //     alert("Error updating:", error);
    // }
}

async function MomoLoss() {
    const momo = Number(document.getElementById("momo").value);
    document.getElementById("momoLoss").value = parseInt((momo / 100) * momoFeePercent) || 0;
}

function cancel(id) {
    document.getElementById(id).innerHTML = "";
}