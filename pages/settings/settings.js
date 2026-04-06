const client = new Appwrite.Client()
    .setEndpoint("https://cloud.appwrite.io/v1")
    .setProject("68a9b3e90029e6a10ff5");

const databases = new Appwrite.Databases(client);

const databaseId  = "695f766c003a8dc2b3be";
const adminId     = "68d95af4003245ef87a7";
const settingsId  = "69d3ed400021197ed76e";

// ── TABS ─────────────────────────────────────────
function switchTab(tab) {
    document.querySelectorAll(".tab-content").forEach(el => el.style.display = "none");
    document.querySelectorAll(".tab-btn").forEach(el => el.classList.remove("active"));

    document.getElementById("tab-" + tab).style.display = "block";
    event.target.classList.add("active");
}

// ── FUEL PRICES ───────────────────────────────────
async function loadFuelSettings() {
    try {
        const res = await databases.listDocuments(databaseId, settingsId);
        if (res.documents.length > 0) {
            const doc = res.documents[0];
            document.getElementById("pmsPriceInput").value = doc.pmsPrice ?? "";
            document.getElementById("agoPriceInput").value = doc.agoPrice ?? "";
            document.getElementById("stationName").value   = doc.stationName ?? "";
        }
    } catch (err) {
        console.error("Could not load settings:", err);
    }
}

async function saveFuelPrices() {
    const pmsPrice    = parseInt(document.getElementById("pmsPriceInput").value);
    const agoPrice    = parseInt(document.getElementById("agoPriceInput").value);
    const stationName = document.getElementById("stationName").value.trim();
    const statusEl    = document.getElementById("fuelStatus");

    if (!pmsPrice || !agoPrice) {
        showStatus(statusEl, "Both fuel prices are required.", "error");
        return;
    }

    try {
        const res = await databases.listDocuments(databaseId, settingsId);

        if (res.documents.length === 0) {
            await databases.createDocument(databaseId, settingsId, "unique()", {
                pmsPrice, agoPrice, stationName
            });
        } else {
            await databases.updateDocument(databaseId, settingsId, res.documents[0].$id, {
                pmsPrice, agoPrice, stationName
            });
        }

        showStatus(statusEl, "Prices saved successfully.", "success");
    } catch (err) {
        console.error(err);
        showStatus(statusEl, "Error saving prices: " + err.message, "error");
    }
}

// ── ADMIN ACCESS ──────────────────────────────────
async function loadAdmins() {
    const listEl = document.getElementById("adminList");
    try {
        const res = await databases.listDocuments(databaseId, adminId);

        if (res.documents.length === 0) {
            listEl.innerHTML = `<div class="loading">No admins found.</div>`;
            return;
        }

        listEl.innerHTML = res.documents.map(doc => `
            <div class="admin-row" id="row-${doc.$id}">
                <span class="admin-email">${doc.email}</span>
                <span class="admin-role">${doc.role ?? "admin"}</span>
                <button class="btn-remove" onclick="removeAdmin('${doc.$id}')">Remove</button>
            </div>
        `).join("");

    } catch (err) {
        listEl.innerHTML = `<div class="loading">Error loading admins.</div>`;
        console.error(err);
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
        await databases.createDocument(databaseId, adminId, "unique()", { email, role });
        document.getElementById("newAdminEmail").value = "";
        showStatus(statusEl, `${email} added as ${role}.`, "success");
        loadAdmins();
    } catch (err) {
        console.error(err);
        showStatus(statusEl, "Error adding admin: " + err.message, "error");
    }
}

async function removeAdmin(docId) {
    if (!confirm("Remove this admin's access?")) return;
    const statusEl = document.getElementById("staffStatus");
    try {
        await databases.deleteDocument(databaseId, adminId, docId);
        document.getElementById("row-" + docId)?.remove();
        showStatus(statusEl, "Access removed.", "success");
    } catch (err) {
        console.error(err);
        showStatus(statusEl, "Error removing admin: " + err.message, "error");
    }
}

// ── HELPERS ───────────────────────────────────────
function showStatus(el, msg, type) {
    el.textContent = msg;
    el.className = "status-msg " + type;
    setTimeout(() => { el.textContent = ""; el.className = "status-msg"; }, 4000);
}

// ── INIT ──────────────────────────────────────────
loadFuelSettings();
loadAdmins();

window.switchTab     = switchTab;
window.saveFuelPrices = saveFuelPrices;
window.addAdmin      = addAdmin;
window.removeAdmin   = removeAdmin;
