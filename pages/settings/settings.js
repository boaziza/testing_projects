const adminId    = "68d95af4003245ef87a7";
const settingsId = "69d3ed400021197ed76e";

// ── TABS ─────────────────────────────────────────────────────
function switchTab(tab, btn) {
    document.querySelectorAll(".tab-content").forEach(el => el.style.display = "none");
    document.querySelectorAll(".tab-btn").forEach(el => el.classList.remove("active"));
    document.getElementById("tab-" + tab).style.display = "block";
    btn.classList.add("active");
}

// ── FUEL PRICES ───────────────────────────────────────────────
async function loadFuelSettings() {
    try {
        const res = await _AW.db.listDocuments(_AW.DB_ID, settingsId);
        if (res.documents.length > 0) {
            const doc = res.documents[0];
            document.getElementById("pmsPriceInput").value = doc.pmsPrice       ?? "";
            document.getElementById("agoPriceInput").value = doc.agoPrice       ?? "";
            document.getElementById("stationName").value   = doc.stationName    ?? "";
            document.getElementById("momoFeeInput").value  = doc.momoFeePercent ?? "";
        }
    } catch (err) {
        console.error("Could not load settings:", err);
    }
}

// Wrapper: handles disable/re-enable even on validation failure
async function handleSavePrices(btn) {
    btn.disabled = true;
    try {
        await saveFuelPrices();
    } finally {
        btn.disabled = false;
    }
}

async function saveFuelPrices() {
    const pmsPrice       = parseInt(document.getElementById("pmsPriceInput").value);
    const agoPrice       = parseInt(document.getElementById("agoPriceInput").value);
    const stationName    = document.getElementById("stationName").value.trim();
    const momoFeePercent = parseFloat(document.getElementById("momoFeeInput").value);
    const statusEl       = document.getElementById("fuelStatus");

    if (!pmsPrice || !agoPrice) {
        showStatus(statusEl, "Both fuel prices are required.", "error");
        return;
    }

    if (isNaN(momoFeePercent) || momoFeePercent < 0) {
        showStatus(statusEl, "Enter a valid MoMo fee percentage.", "error");
        return;
    }

    try {
        const res = await _AW.db.listDocuments(_AW.DB_ID, settingsId);

        if (res.documents.length === 0) {
            await _AW.db.createDocument(_AW.DB_ID, settingsId, "unique()", {
                pmsPrice, agoPrice, stationName, momoFeePercent
            });
        } else {
            await _AW.db.updateDocument(_AW.DB_ID, settingsId, res.documents[0].$id, {
                pmsPrice, agoPrice, stationName, momoFeePercent
            });
        }

        showStatus(statusEl, "✓ Settings saved successfully.", "success");
    } catch (err) {
        console.error(err);
        showStatus(statusEl, "Error saving prices: " + err.message, "error");
    }
}

// ── ADMIN ACCESS ──────────────────────────────────────────────
async function loadAdmins() {
    const listEl = document.getElementById("adminList");
    try {
        const res = await _AW.db.listDocuments(_AW.DB_ID, adminId);

        if (res.documents.length === 0) {
            listEl.innerHTML = `<div class="loading">No admins found.</div>`;
            return;
        }

        listEl.innerHTML = res.documents.map(doc => `
            <div class="admin-row" id="row-${doc.$id}">
                <span class="admin-email">${doc.email}</span>
                <span class="admin-role">${doc.role ?? "admin"}</span>
                <button class="btn-remove" onclick="promptRemoveAdmin('${doc.$id}', '${doc.email}')">Remove</button>
            </div>
        `).join("");

    } catch (err) {
        listEl.innerHTML = `<div class="loading">Error loading admins.</div>`;
        console.error(err);
    }
}

// Wrapper: handles disable/re-enable even on validation failure
async function handleAddAdmin(btn) {
    btn.disabled = true;
    try {
        await addAdmin();
    } finally {
        btn.disabled = false;
    }
}

async function addAdmin() {
    const email    = document.getElementById("newAdminEmail").value.trim();
    const role     = document.getElementById("newAdminRole").value;
    const statusEl = document.getElementById("staffStatus");

    if (!email) {
        showStatus(statusEl, "Enter an email address.", "error");
        return;
    }

    try {
        await _AW.db.createDocument(_AW.DB_ID, adminId, "unique()", { email, role });
        document.getElementById("newAdminEmail").value = "";
        showStatus(statusEl, `${email} added as ${role}.`, "success");
        loadAdmins();
    } catch (err) {
        console.error(err);
        showStatus(statusEl, "Error adding admin: " + err.message, "error");
    }
}

// ── REMOVE ADMIN (popup-based) ────────────────────────────────
let _pendingRemoveId = null;

function promptRemoveAdmin(docId, email) {
    _pendingRemoveId = docId;
    document.getElementById("removePopupSub").textContent =
        `${email} will lose admin access immediately.`;
    openDialog("confirmRemovePopup");
}

async function confirmRemoveAdmin() {
    closeDialog("confirmRemovePopup");
    if (!_pendingRemoveId) return;

    const docId    = _pendingRemoveId;
    _pendingRemoveId = null;
    const statusEl = document.getElementById("staffStatus");

    try {
        await _AW.db.deleteDocument(_AW.DB_ID, adminId, docId);
        document.getElementById("row-" + docId)?.remove();
        showStatus(statusEl, "Access removed.", "success");
    } catch (err) {
        console.error(err);
        showStatus(statusEl, "Error removing admin: " + err.message, "error");
    }
}

// ── STATUS MESSAGES ───────────────────────────────────────────
const _statusTimers = new WeakMap();

function showStatus(el, msg, type) {
    // Cancel any existing auto-clear for this element
    if (_statusTimers.has(el)) clearTimeout(_statusTimers.get(el));

    el.textContent = msg;
    el.className   = "status-msg " + type;

    const t = setTimeout(() => {
        el.textContent = "";
        el.className   = "status-msg";
        _statusTimers.delete(el);
    }, 4000);

    _statusTimers.set(el, t);
}

// ── EMPLOYEE CREATION ─────────────────────────────────────────
// Uses the Express server's /api/create-employee endpoint, which
// calls the Appwrite Users API (server-side only). This is the
// only way to create accounts for other users — the browser SDK
// cannot do it.

async function handleCreateEmployee(btn) {
    btn.disabled = true;
    try {
        await createEmployee();
    } finally {
        btn.disabled = false;
    }
}

async function createEmployee() {
    const name      = document.getElementById("empName").value.trim();
    const email     = document.getElementById("empEmail").value.trim();
    const password  = document.getElementById("empPassword").value;
    const statusEl  = document.getElementById("empStatus");

    if (!name || !email || !password) {
        showStatus(statusEl, "Name, email, and password are all required.", "error");
        return;
    }
    if (password.length < 8) {
        showStatus(statusEl, "Password must be at least 8 characters.", "error");
        return;
    }

    try {
        const res = await fetch(`${_AW.SERVER_URL}/create-employee`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": _AW.SERVER_KEY,
            },
            body: JSON.stringify({ name, email, password }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create employee");

        document.getElementById("empName").value     = "";
        document.getElementById("empEmail").value    = "";
        document.getElementById("empPassword").value = "";
        showStatus(statusEl, `✓ Account created for ${name} (${email}).`, "success");
    } catch (err) {
        showStatus(statusEl, "Error: " + err.message, "error");
    }
}

// ── INIT ──────────────────────────────────────────────────────
loadFuelSettings();
loadAdmins();

window.switchTab              = switchTab;
window.handleSavePrices       = handleSavePrices;
window.handleAddAdmin         = handleAddAdmin;
window.promptRemoveAdmin      = promptRemoveAdmin;
window.confirmRemoveAdmin     = confirmRemoveAdmin;
window.handleCreateEmployee   = handleCreateEmployee;
