// ── INDEX STATE (set by calculateIndex) ───────────────────────
let totalVente, pms1, pms2, pms3, pms4, ago1, ago2, ago3, ago4;
let venteLitresPms, totalPms, venteLitresAgo, totalAgo;
let pmsPrice, agoPrice, logDate, shift;

// ── SETTINGS STATE (set by initSettings on load) ──────────────
let momoFeePercent = 0;

// ── LOAD SETTINGS ON PAGE OPEN ────────────────────────────────
// Reads pmsPrice, agoPrice, momoFeePercent from the single fixed
// settings document so MomoLoss() always uses the correct rate,
// even before the pompiste clicks "Calculate Index".
const _SETTINGS_ID  = "69d3ed400021197ed76e";
const _SETTINGS_DOC = "69d7db7ed8d5d2b73d66";

async function initSettings() {
    try {
        const doc = await _AW.db.getDocument(_AW.DB_ID, _SETTINGS_ID, _SETTINGS_DOC);
        pmsPrice       = doc.pmsPrice       ?? 2303;
        agoPrice       = doc.agoPrice       ?? 2205;
        momoFeePercent = doc.momoFeePercent ?? 0.5;
    } catch {
        // No settings saved yet — use safe defaults
        pmsPrice       = 2303;
        agoPrice       = 2205;
        momoFeePercent = 0.5;
    }
}
initSettings();

async function calculateIndex() {
    const indexId = "68cd1987002bae34ea4b";

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

    if (pms1 && pms2 && pms2 < pms1) { toast("P1: End value must be ≥ Start value", "warning"); return; }
    if (pms3 && pms4 && pms4 < pms3) { toast("P2: End value must be ≥ Start value", "warning"); return; }
    if (ago1 && ago2 && ago2 < ago1) { toast("P3: End value must be ≥ Start value", "warning"); return; }
    if (ago3 && ago4 && ago4 < ago3) { toast("P4: End value must be ≥ Start value", "warning"); return; }

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

            if (!logDate) { toast("Select a date!", "warning"); return; }

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

        const response = await _AW.db.listDocuments(_AW.DB_ID, indexId, [Appwrite.Query.equal("logDate", logDate)]);

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

            const beforeResponse = await _AW.db.listDocuments(_AW.DB_ID, indexId, [Appwrite.Query.equal("logDate", dateBefore)]);

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
            toast("All indices match", "success");
        } else {
            toast("Check index — values do not match", "error");
        }

    } catch (error) {
        toast("Error checking index: " + error.message, "error");
    }
}

// ── PAYMENT STATE (set by payments) ───────────────────────────
let momo, momoLoss, totalFiche, bon, spFuelCard, bankCard;
let cash5000, cash2000, cash1000, cash500;
let totalCash, totalPayments, gainPayments, listBC, listSFC, totalLoans;

async function payments() {

    // I-12: Must run calculateIndex first so totalVente is defined
    if (totalVente === undefined) {
        toast("Run Calculate Index first.", "warning");
        return;
    }

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
        totalPayments = momo + momoLoss + totalFiche + bon + spFuelCard + bankCard + totalCash + totalLoans;
        gainPayments = totalPayments - totalVente;


        document.getElementById("totalLoans").textContent = `${totalLoans.toLocaleString()} RWF`;
        document.getElementById("totalFiche").textContent = `${totalFiche.toLocaleString()} RWF`;
        document.getElementById("totalPayments").textContent = `${totalPayments.toLocaleString()} RWF`;
        const gainEl = document.getElementById("gainPayments");
        gainEl.textContent = `${gainPayments.toLocaleString()} RWF`;
        gainEl.className = `output result-value ${gainPayments >= 0 ? 'gain' : 'loss'}`;
        document.getElementById("totalCash").textContent = `${totalCash.toLocaleString()} RWF`;
    } catch (error) {
        toast("Error calculating payments: " + error.message, "error");
    }
}

let dataSituation;
async function situation() {
    const indexId = "68cd1987002bae34ea4b";
    const paymentsId = "68cd19990006cbb33843";
    const situationId = "68cd6b7f00330a840d96";

    if (totalVente === undefined || totalPayments === undefined) {
        toast("Run Calculate Index and Calculate Payments first.", "warning");
        return;
    }

    try {
        logDate = document.getElementById("logDate").value;
        shift   = document.getElementById("shift").value;

        // I-2: Require date and shift before writing anything
        if (!logDate) { toast("Select a date before storing.", "warning"); return; }
        if (!shift)   { toast("Select a shift before storing.", "warning"); return; }

        const user = await _AW.account.get();
        const email = user.email;
        const employee = user.name;

        const selectedDate = new Date(logDate);
        const mm   = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const yyyy = selectedDate.getFullYear();
        const monthYear = `${yyyy}-${mm}`;

        // I-4: Check for duplicate submission before writing anything
        const dupCheck = await _AW.db.listDocuments(_AW.DB_ID, indexId, [
            Appwrite.Query.equal("logDate", logDate),
            Appwrite.Query.equal("email",   email),
            Appwrite.Query.equal("shift",   shift),
        ]);
        if (dupCheck.documents.length > 0) {
            toast("You already submitted this shift. Contact admin if a resubmission is needed.", "warning");
            return;
        }

        const gainRes = await fetch(`${_AW.SERVER_URL}/upsert-gain`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": _AW.SERVER_KEY,
            },
            body: JSON.stringify({ email, employee, gainPayments, logDate, monthYear }),
        });
        if (!gainRes.ok) throw new Error("Failed to save gain: " + (await gainRes.text()));

        // Shared reference ID stored on both index and payments records
        const id = `${employee}_${logDate}_${shift}`;

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

        const response = await _AW.db.listDocuments(_AW.DB_ID, situationId, [Appwrite.Query.equal("logDate", logDate)]);

        // C-3: Track whether a situation document was written.
        // Index and payments must NOT be written if situation was skipped.
        let situationWritten = false;

        if (shift === "Morning") {

            if (response.documents.length === 0) {

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

                await _AW.db.createDocument(
                    _AW.DB_ID,
                    situationId,
                    "unique()",
                    dataSituation
                );

            } else {
                const doc   = response.documents[0];
                const docId = doc.$id;

                // I-8: Build accumulated totals without mutating module-level variables
                dataSituation = {
                    momo:           momo           + (doc.momo           || 0),
                    momoLoss:       momoLoss       + (doc.momoLoss       || 0),
                    totalFiche:     totalFiche     + (doc.totalFiche     || 0),
                    bon:            bon            + (doc.bon            || 0),
                    spFuelCard:     spFuelCard     + (doc.spFuelCard     || 0),
                    bankCard:       bankCard       + (doc.bankCard       || 0),
                    totalCash:      totalCash      + (doc.totalCash      || 0),
                    totalLoans:     totalLoans     + (doc.totalLoans     || 0),
                    totalPayments:  totalPayments  + (doc.totalPayments  || 0),
                    gainPayments:   gainPayments   + (doc.gainPayments   || 0),
                    venteLitresPms: venteLitresPms + (doc.venteLitresPms || 0),
                    totalPms:       totalPms       + (doc.totalPms       || 0),
                    venteLitresAgo: venteLitresAgo + (doc.venteLitresAgo || 0),
                    totalAgo:       totalAgo       + (doc.totalAgo       || 0),
                    totalVente:     totalVente     + (doc.totalVente     || 0),
                };

                await _AW.db.updateDocument(_AW.DB_ID, situationId, docId, dataSituation);
            }

            situationWritten = true;

        } else if ((shift === "Afternoon" || shift === "Evening") && response.documents.length !== 0) {
            const doc   = response.documents[0];
            const docId = doc.$id;

            // I-8: Accumulate without mutating module-level variables
            dataSituation = {
                momo:           momo           + (doc.momo           || 0),
                momoLoss:       momoLoss       + (doc.momoLoss       || 0),
                totalFiche:     totalFiche     + (doc.totalFiche     || 0),
                bon:            bon            + (doc.bon            || 0),
                spFuelCard:     spFuelCard     + (doc.spFuelCard     || 0),
                bankCard:       bankCard       + (doc.bankCard       || 0),
                totalCash:      totalCash      + (doc.totalCash      || 0),
                totalLoans:     totalLoans     + (doc.totalLoans     || 0),
                totalPayments:  totalPayments  + (doc.totalPayments  || 0),
                gainPayments:   gainPayments   + (doc.gainPayments   || 0),
                venteLitresPms: venteLitresPms + (doc.venteLitresPms || 0),
                totalPms:       totalPms       + (doc.totalPms       || 0),
                venteLitresAgo: venteLitresAgo + (doc.venteLitresAgo || 0),
                totalAgo:       totalAgo       + (doc.totalAgo       || 0),
                totalVente:     totalVente     + (doc.totalVente     || 0),
            };

            await _AW.db.updateDocument(_AW.DB_ID, situationId, docId, dataSituation);
            situationWritten = true;

        } else if (shift === "Night" && response.documents.length !== 0) {
            const doc   = response.documents[0];
            const docId = doc.$id;

            // I-8: Accumulate without mutating module-level variables
            dataSituation = {
                momo:           momo           + (doc.momo           || 0),
                momoLoss:       momoLoss       + (doc.momoLoss       || 0),
                totalFiche:     totalFiche     + (doc.totalFiche     || 0),
                bon:            bon            + (doc.bon            || 0),
                spFuelCard:     spFuelCard     + (doc.spFuelCard     || 0),
                bankCard:       bankCard       + (doc.bankCard       || 0),
                totalCash:      totalCash      + (doc.totalCash      || 0),
                totalLoans:     totalLoans     + (doc.totalLoans     || 0),
                totalPayments:  totalPayments  + (doc.totalPayments  || 0),
                gainPayments:   gainPayments   + (doc.gainPayments   || 0),
                venteLitresPms: venteLitresPms + (doc.venteLitresPms || 0),
                totalPms:       totalPms       + (doc.totalPms       || 0),
                venteLitresAgo: venteLitresAgo + (doc.venteLitresAgo || 0),
                totalAgo:       totalAgo       + (doc.totalAgo       || 0),
                totalVente:     totalVente     + (doc.totalVente     || 0),
                pms2,
                pms4,
                ago2,
                ago4,
                done: true,
            };

            await _AW.db.updateDocument(_AW.DB_ID, situationId, docId, dataSituation);
            situationWritten = true;
        }

        // C-3: If no situation was written (Afternoon/Evening/Night with no Morning),
        // abort here — do not write orphaned index or payments records.
        if (!situationWritten) {
            toast(`No situation record found for ${logDate}. Submit Morning shift first.`, "error");
            return;
        }

        // C-4: Write index first, then payments. If payments fails, roll back
        // the index write so the database stays consistent and the user can retry.
        let indexDocId = null;
        try {
            const indexDoc = await _AW.db.createDocument(
                _AW.DB_ID,
                indexId,
                "unique()",
                dataIndex
            );
            indexDocId = indexDoc.$id;

            await _AW.db.createDocument(
                _AW.DB_ID,
                paymentsId,
                "unique()",
                dataPayments
            );
        } catch (writeErr) {
            if (indexDocId) {
                // Compensate: undo the index write so the state stays clean for a retry
                try { await _AW.db.deleteDocument(_AW.DB_ID, indexId, indexDocId); } catch {}
            }
            throw writeErr;
        }

        // Bulk-write each fiche entry to its own collection document
        const ficheId = "69007206001aed40d6f4";
        await Promise.all(fiche.map(item =>
            _AW.db.createDocument(_AW.DB_ID, ficheId, "unique()", {
                plate:    item.plate,
                company:  item.company,
                amount:   item.amount,
                logDate,
                employee,
            })
        ));

        // Bulk-write each loan entry to its own collection document
        const loansId = "68fbe6f80019b53fb32f";
        await Promise.all(loans.map(item =>
            _AW.db.createDocument(_AW.DB_ID, loansId, "unique()", {
                plate:     item.plate,
                company:   item.company,
                amount:    item.amount,
                logDate,
                monthYear,
                employee,
            })
        ));

        toast("Report saved successfully", "success");

        function clearOutputs() {
            const outputs = document.querySelectorAll(".output");
            outputs.forEach(el => { el.textContent = "0"; });

            document.getElementById("momo").value = "";
            clearFiche();
            clearLoan();

            fiche = [];
            loans = [];
            spFuelCardList = [];
            bankCardList = [];
            document.getElementById("ficheChips").innerHTML = "";
            document.getElementById("loanChips").innerHTML = "";
            document.getElementById("spFuelCardChips").innerHTML = "";
            document.getElementById("bankCardChips").innerHTML = "";
        }

        clearOutputs();

        document.getElementById("rapportForm").reset();
        document.getElementById("paymentsForm").reset();

    } catch (err) {
        if (err.message.includes("Unauthorized")) {
            toast("You must be logged in.", "error");
        } else {
            toast("Error: " + err.message, "error");
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

let fiche = [];

function renderFicheChips() {
    const container = document.getElementById("ficheChips");
    container.innerHTML = "";
    fiche.forEach((item, i) => {
        const chip = document.createElement("span");
        chip.className = "chip";
        const label = [item.plate, item.company].filter(Boolean).join(" · ") + ` · ${item.amount.toLocaleString()} RWF`;
        chip.textContent = label;
        chip.style.cursor = "pointer";
        chip.title = "Click to edit";
        chip.onclick = () => editFiche(i);
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "chip-remove";
        btn.textContent = "×";
        btn.onclick = (e) => { e.stopPropagation(); removeFiche(i); };
        chip.appendChild(btn);
        container.appendChild(chip);
    });
}

const _plateRegex = /^R[A-Z]{2}\s?\d{3}\s?[A-Z]$/;
function _normalizePlate(p) {
    const m = p.match(/^(R[A-Z]{2})\s?(\d{3})\s?([A-Z])$/);
    return m ? `${m[1]} ${m[2]} ${m[3]}` : p;
}

function addFiche() {
    const plate   = document.getElementById("fiche-plate").value.trim();
    const company = document.getElementById("fiche-company").value.trim();
    const amount  = parseInt(document.getElementById("fiche-amount").value);
    if (!plate && !company) { toast("Enter a plate or company", "warning"); return; }
    if (plate && !_plateRegex.test(plate)) { toast("Plate format must be: RAB 123A", "warning"); return; }
    if (!amount || amount <= 0) { toast("Enter a valid amount", "warning"); return; }
    fiche.push({ plate: plate ? _normalizePlate(plate) : "", company, amount });
    renderFicheChips();
    clearFiche();
    document.getElementById("fiche-amount").focus();
}

function editFiche(i) {
    const item = fiche[i];
    document.getElementById("fiche-plate").value   = item.plate;
    document.getElementById("fiche-company").value = item.company;
    document.getElementById("fiche-amount").value  = item.amount;
    fiche.splice(i, 1);
    renderFicheChips();
    document.getElementById("fiche-amount").focus();
}

function removeFiche(i) {
    fiche.splice(i, 1);
    renderFicheChips();
}

let loans = [];

function renderLoanChips() {
    const container = document.getElementById("loanChips");
    container.innerHTML = "";
    loans.forEach((item, i) => {
        const chip = document.createElement("span");
        chip.className = "chip";
        const label = [item.plate, item.company].filter(Boolean).join(" · ") + ` · ${item.amount.toLocaleString()} RWF`;
        chip.textContent = label;
        chip.style.cursor = "pointer";
        chip.title = "Click to edit";
        chip.onclick = () => editLoan(i);
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "chip-remove";
        btn.textContent = "×";
        btn.onclick = (e) => { e.stopPropagation(); removeLoan(i); };
        chip.appendChild(btn);
        container.appendChild(chip);
    });
}

function addLoan() {
    const plate   = document.getElementById("loan-plate").value.trim();
    const company = document.getElementById("loan-company").value.trim();
    const amount  = parseInt(document.getElementById("loan-amount").value);
    if (!plate && !company) { toast("Enter a plate or company", "warning"); return; }
    if (plate && !_plateRegex.test(plate)) { toast("Plate format must be: RAB 123A", "warning"); return; }
    if (!amount || amount <= 0) { toast("Enter a valid amount", "warning"); return; }
    loans.push({ plate: plate ? _normalizePlate(plate) : "", company, amount });
    renderLoanChips();
    clearLoan();
    document.getElementById("loan-amount").focus();
}

function editLoan(i) {
    const item = loans[i];
    document.getElementById("loan-plate").value   = item.plate;
    document.getElementById("loan-company").value = item.company;
    document.getElementById("loan-amount").value  = item.amount;
    loans.splice(i, 1);
    renderLoanChips();
    document.getElementById("loan-amount").focus();
}

function removeLoan(i) {
    loans.splice(i, 1);
    renderLoanChips();
}

async function MomoLoss() {
    const momo = Number(document.getElementById("momo").value);
    document.getElementById("momoLoss").value = parseInt((momo / 100) * momoFeePercent) || 0;
}
