const settingsId = "69d3ed400021197ed76e";

// ── TABS ──────────────────────────────────────────────────────
function switchTab(tab, btn) {
    document.querySelectorAll(".tab-content").forEach(el => el.style.display = "none");
    document.querySelectorAll(".tab-btn").forEach(el => el.classList.remove("active"));
    document.getElementById("tab-" + tab).style.display = "block";
    btn.classList.add("active");
    if (tab === "teams")     loadTeams();
    if (tab === "employees") loadAllEmployees();
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
        showStatus(document.getElementById("fuelStatus"), "✓ Settings saved successfully.", "success");
    } catch (err) {
        showStatus(document.getElementById("fuelStatus"), "Error saving prices: " + err.message, "error");
    }
}

// ── TEAMS ──────────────────────────────────────────────────────
async function loadTeams() {
    const listEl = document.getElementById("teamsList");
    listEl.innerHTML = `<div class="loading">Loading...</div>`;
    try {
        const res  = await fetch(`${_AW.SERVER_URL}/teams`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        if (data.teams.length === 0) {
            listEl.innerHTML = `<div class="loading">No teams yet. Create one below.</div>`;
            return;
        }
        listEl.innerHTML = data.teams.map(t => renderTeamCard(t)).join("");
    } catch (err) {
        listEl.innerHTML = `<div class="loading">Error loading teams.</div>`;
    }
}

function renderTeamCard(team) {
    return `
    <div class="team-card" id="team-${team.$id}">
      <div class="team-header" onclick="toggleTeam('${team.$id}')" role="button" tabindex="0" aria-expanded="false" id="team-header-${team.$id}">
        <span class="team-chevron">▶</span>
        <span class="team-name">${team.name}</span>
        <button class="btn-remove" onclick="event.stopPropagation(); promptDeleteTeam('${team.$id}', '${team.name.replace(/'/g, "\\'")}')">Delete</button>
      </div>
      <div class="team-body" id="team-body-${team.$id}" style="display:none;">
        <div class="team-members" id="members-${team.$id}">
          <div class="loading">Loading members...</div>
        </div>
        <div class="add-member-row">
          <input type="email" id="memberEmail-${team.$id}" placeholder="Enter email to add">
          <button class="action-btn" onclick="promptAddMember('${team.$id}', '${team.name.replace(/'/g, "\\'")}', this)">Add Member</button>
        </div>
        <div id="teamStatus-${team.$id}" class="status-msg" aria-live="polite"></div>
      </div>
    </div>`;
}

function toggleTeam(teamId) {
    const body   = document.getElementById(`team-body-${teamId}`);
    const header = document.getElementById(`team-header-${teamId}`);
    const chevron = header.querySelector(".team-chevron");
    const isOpen = body.style.display !== "none";

    if (isOpen) {
        body.style.display = "none";
        chevron.textContent = "▶";
        header.setAttribute("aria-expanded", "false");
    } else {
        body.style.display = "block";
        chevron.textContent = "▼";
        header.setAttribute("aria-expanded", "true");
        // Load members only on first open
        const membersEl = document.getElementById(`members-${teamId}`);
        if (membersEl.querySelector(".loading")) loadTeamMembers(teamId);
    }
}

async function loadTeamMembers(teamId) {
    const el = document.getElementById(`members-${teamId}`);
    if (!el) return;
    try {
        const res  = await fetch(`${_AW.SERVER_URL}/teams/${encodeURIComponent(teamId)}/members`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        if (data.memberships.length === 0) {
            el.innerHTML = `<div class="loading">No members yet.</div>`;
            return;
        }
        el.innerHTML = data.memberships.map(m => `
          <div class="admin-row" id="membership-${m.$id}">
            <span class="admin-email">${m.userName || "—"}</span>
            <span class="admin-role">${m.userEmail}</span>
            <button class="btn-remove" onclick="promptRemoveMember('${teamId}', '${m.$id}', '${(m.userName || m.userEmail).replace(/'/g, "\\'")}')">Remove</button>
          </div>`).join("");
    } catch {
        el.innerHTML = `<div class="loading">Error loading members.</div>`;
    }
}

// ── CREATE TEAM ────────────────────────────────────────────────
function promptCreateTeam() {
    const name     = document.getElementById("newTeamName").value.trim();
    const statusEl = document.getElementById("teamsStatus");
    if (!name) { showStatus(statusEl, "Enter a team name.", "error"); return; }
    document.getElementById("createTeamPopupSub").textContent = `Create team "${name}"?`;
    openDialog("confirmCreateTeamPopup");
}

async function handleCreateTeam(btn) {
    const name     = document.getElementById("newTeamName").value.trim();
    const statusEl = document.getElementById("teamsStatus");
    btn.disabled   = true;
    try {
        const res  = await fetch(`${_AW.SERVER_URL}/teams`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ name }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        document.getElementById("newTeamName").value = "";
        showStatus(statusEl, `✓ Team "${name}" created.`, "success");
        loadTeams();
    } catch (err) {
        showStatus(statusEl, "Error: " + err.message, "error");
    } finally {
        btn.disabled = false;
    }
}

// ── DELETE TEAM ────────────────────────────────────────────────
let _pendingDeleteTeamId = null;

function promptDeleteTeam(teamId, teamName) {
    _pendingDeleteTeamId = teamId;
    document.getElementById("deleteTeamPopupSub").textContent =
        `Delete "${teamName}"? All memberships will be removed.`;
    openDialog("confirmDeleteTeamPopup");
}

async function handleDeleteTeam(btn) {
    closeDialog("confirmDeleteTeamPopup");
    if (!_pendingDeleteTeamId) return;
    const teamId = _pendingDeleteTeamId;
    _pendingDeleteTeamId = null;
    btn.disabled = true;
    try {
        const res = await fetch(`${_AW.SERVER_URL}/teams/${encodeURIComponent(teamId)}`, {
            method: "DELETE",
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
        document.getElementById(`team-${teamId}`)?.remove();
        const listEl = document.getElementById("teamsList");
        if (!listEl.querySelector(".team-card")) {
            listEl.innerHTML = `<div class="loading">No teams yet. Create one below.</div>`;
        }
        showStatus(document.getElementById("teamsStatus"), "Team deleted.", "success");
    } catch (err) {
        showStatus(document.getElementById("teamsStatus"), "Error: " + err.message, "error");
    } finally {
        btn.disabled = false;
    }
}

// ── ADD MEMBER ─────────────────────────────────────────────────
let _pendingAddMember = null;

function promptAddMember(teamId, teamName, btn) {
    const email    = document.getElementById(`memberEmail-${teamId}`)?.value.trim();
    const statusEl = document.getElementById(`teamStatus-${teamId}`);
    if (!email) { showStatus(statusEl, "Enter an email address.", "error"); return; }
    _pendingAddMember = { teamId, email, btn };
    document.getElementById("addMemberPopupSub").textContent =
        `Add ${email} to team "${teamName}"?`;
    openDialog("confirmAddMemberPopup");
}

async function handleAddMember(confirmBtn) {
    closeDialog("confirmAddMemberPopup");
    if (!_pendingAddMember) return;
    const { teamId, email, btn } = _pendingAddMember;
    _pendingAddMember = null;
    const statusEl = document.getElementById(`teamStatus-${teamId}`);
    if (btn) btn.disabled = true;
    try {
        const res  = await fetch(`${_AW.SERVER_URL}/teams/${encodeURIComponent(teamId)}/members`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ email }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        const inputEl = document.getElementById(`memberEmail-${teamId}`);
        if (inputEl) inputEl.value = "";
        showStatus(statusEl, `✓ ${email} added.`, "success");
        loadTeamMembers(teamId);
    } catch (err) {
        showStatus(statusEl, "Error: " + err.message, "error");
    } finally {
        if (btn) btn.disabled = false;
    }
}

// ── REMOVE MEMBER ──────────────────────────────────────────────
let _pendingRemoveMember = null;

function promptRemoveMember(teamId, membershipId, name) {
    _pendingRemoveMember = { teamId, membershipId };
    document.getElementById("removeMemberPopupSub").textContent =
        `Remove ${name} from this team?`;
    openDialog("confirmRemoveMemberPopup");
}

async function handleRemoveMember(btn) {
    closeDialog("confirmRemoveMemberPopup");
    if (!_pendingRemoveMember) return;
    const { teamId, membershipId } = _pendingRemoveMember;
    _pendingRemoveMember = null;
    btn.disabled = true;
    try {
        const res = await fetch(
            `${_AW.SERVER_URL}/teams/${encodeURIComponent(teamId)}/members/${encodeURIComponent(membershipId)}`,
            { method: "DELETE" }
        );
        if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
        document.getElementById(`membership-${membershipId}`)?.remove();
        const membersEl = document.getElementById(`members-${teamId}`);
        if (membersEl && !membersEl.querySelector(".admin-row")) {
            membersEl.innerHTML = `<div class="loading">No members yet.</div>`;
        }
    } catch (err) {
        showStatus(document.getElementById("teamsStatus"), "Error: " + err.message, "error");
    } finally {
        btn.disabled = false;
    }
}

// ── STATUS MESSAGES ───────────────────────────────────────────
const _statusTimers = new WeakMap();

function showStatus(el, msg, type) {
    if (!el) return;
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

// ── CREATE EMPLOYEE ────────────────────────────────────────────
function promptCreateEmployee() {
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
    document.getElementById("createEmpPopupSub").textContent =
        `Create account for ${name} (${email})?`;
    openDialog("confirmCreateEmpPopup");
}

async function handleCreateEmployee(btn) {
    const name      = document.getElementById("empName").value.trim();
    const email     = document.getElementById("empEmail").value.trim();
    const password  = document.getElementById("empPassword").value;
    const statusEl  = document.getElementById("empStatus");
    btn.disabled    = true;
    try {
        const res  = await fetch(`${_AW.SERVER_URL}/create-employee`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ name, email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create employee");
        document.getElementById("empName").value     = "";
        document.getElementById("empEmail").value    = "";
        document.getElementById("empPassword").value = "";
        showStatus(statusEl, `✓ Account created for ${name} (${email}).`, "success");
        loadAllEmployees();
    } catch (err) {
        showStatus(statusEl, "Error: " + err.message, "error");
    } finally {
        btn.disabled = false;
    }
}

// ── ALL EMPLOYEES ──────────────────────────────────────────────
async function loadAllEmployees() {
    const listEl = document.getElementById("allEmployeesList");
    listEl.innerHTML = `<div class="loading">Loading...</div>`;
    try {
        const res  = await fetch(`${_AW.SERVER_URL}/users`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        if (data.users.length === 0) {
            listEl.innerHTML = `<div class="loading">No accounts found.</div>`;
            return;
        }
        listEl.innerHTML = data.users.map(u => {
            const station = u.prefs?.station || "";
            return `
            <div class="admin-row">
              <span class="admin-email">${u.name || "—"}</span>
              <span class="admin-role">${u.email}</span>
              ${station ? `<span class="emp-station">${station}</span>` : ""}
              <button class="action-btn btn-edit" onclick="openEditEmployee('${u.$id}', '${(u.name || "").replace(/'/g, "\\'")}', '${station.replace(/'/g, "\\'")}')">Edit</button>
            </div>`;
        }).join("");
    } catch (err) {
        listEl.innerHTML = `<div class="loading">Error loading accounts.</div>`;
    }
}

// ── EDIT EMPLOYEE ──────────────────────────────────────────────
let _editingUserId = null;

function openEditEmployee(userId, name, station) {
    _editingUserId = userId;
    document.getElementById("editEmpName").value    = name;
    document.getElementById("editEmpStation").value = station;
    openDialog("editEmployeePopup");
}

async function handleEditEmployee(btn) {
    if (!_editingUserId) return;
    const name    = document.getElementById("editEmpName").value.trim();
    const station = document.getElementById("editEmpStation").value.trim();
    btn.disabled  = true;
    try {
        const res  = await fetch(`${_AW.SERVER_URL}/users/${encodeURIComponent(_editingUserId)}`, {
            method:  "PATCH",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ name, prefs: { station } }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        closeDialog("editEmployeePopup");
        _editingUserId = null;
        loadAllEmployees();
    } catch (err) {
        toast(err.message, "error");
    } finally {
        btn.disabled = false;
    }
}

// ── INIT ──────────────────────────────────────────────────────
loadFuelSettings();

window.toggleTeam           = toggleTeam;
window.switchTab            = switchTab;
window.handleSavePrices     = handleSavePrices;
window.promptCreateTeam     = promptCreateTeam;
window.handleCreateTeam     = handleCreateTeam;
window.promptDeleteTeam     = promptDeleteTeam;
window.handleDeleteTeam     = handleDeleteTeam;
window.promptAddMember      = promptAddMember;
window.handleAddMember      = handleAddMember;
window.promptRemoveMember   = promptRemoveMember;
window.handleRemoveMember   = handleRemoveMember;
window.promptCreateEmployee = promptCreateEmployee;
window.handleCreateEmployee = handleCreateEmployee;
window.openEditEmployee     = openEditEmployee;
window.handleEditEmployee   = handleEditEmployee;
