(function () {

  const settingsId = "69d3ed400021197ed76e";
  const _statusTimers = new WeakMap();

  const { apiFetch, state } = window._dash;
  

  function showStatus(el, msg, type) {
    if (!el) return;
    if (_statusTimers.has(el)) clearTimeout(_statusTimers.get(el));
    el.textContent = msg; el.className = "status-msg " + type;
    const t = setTimeout(() => { el.textContent = ""; el.className = "status-msg"; _statusTimers.delete(el); }, 4000);
    _statusTimers.set(el, t);
  }

  function switchTab(tab, btn) {
    document.querySelectorAll(".tab-content").forEach(el => el.style.display = "none");
    document.querySelectorAll(".tab-btn").forEach(el => el.classList.remove("active"));
    const tabEl = document.getElementById("tab-" + tab);
    if (tabEl) tabEl.style.display = "block";
    btn.classList.add("active");
    if (tab === "teams")     loadTeams();
    if (tab === "employees") loadAllEmployees();
  }

  async function loadFuelSettings() {
    try {
      const stationRes = await apiFetch(`/stations`).then(res => res.json());
      const stationDocs = stationRes.stations?.documents ?? stationRes.stations ?? [];

      const fuelPrices = await apiFetch(`/fuel-prices/me`).then(res => res.json());
      const priceDocs = fuelPrices.fuelPriceHistory?.documents ?? fuelPrices.fuelPriceHistory ?? [];

      const sorted     = [...priceDocs].sort((a, b) => (b.effectiveFrom || "").localeCompare(a.effectiveFrom || ""));
      const pmsPriceDoc = sorted.find(p => p.fuelType === "PMS");
      const agoPriceDoc = sorted.find(p => p.fuelType === "AGO");

      const stationDoc = stationDocs[0];

      if (pmsPriceDoc || agoPriceDoc) {
        const pmsEl = document.getElementById("pmsPriceInput");
        if (pmsEl) pmsEl.value = pmsPriceDoc?.price ?? "";
        const agoEl = document.getElementById("agoPriceInput");
        if (agoEl) agoEl.value = agoPriceDoc?.price ?? "";
      }
      if (stationDoc) {
        const stationEl = document.getElementById("stationName");
        if (stationEl) stationEl.value = stationDoc.name ?? "";
        const momoEl = document.getElementById("momoFeeInput");
        if (momoEl) momoEl.value = stationDoc.momoFee ?? "";
      }
    } catch (err) { console.error("Could not load settings:", err); }
  }

  async function handleSavePrices(btn) {
    btn.disabled = true;
    try { await saveFuelPrices(); } finally { btn.disabled = false; }
  }

  async function saveFuelPrices() {
    const profile = state.profile;;
    console.log(profile.name);
    const stationId = profile.stationId;
    const userId = profile.userId;
    const pmsEl = document.getElementById("pmsPriceInput");
    const agoEl = document.getElementById("agoPriceInput");
    const stationEl = document.getElementById("stationName");
    const momoEl = document.getElementById("momoFeeInput");
    const pmsPrice = parseInt(pmsEl?.value || "");
    const agoPrice = parseInt(agoEl?.value || "");
    const stationName = stationEl?.value.trim() || "";
    const momoFeePercent = parseFloat(momoEl?.value || "");
    const statusEl = document.getElementById("fuelStatus");
    if (!pmsPrice || !agoPrice) { showStatus(statusEl, "Both fuel prices are required.", "error"); return; }
    if (isNaN(momoFeePercent) || momoFeePercent < 0) { showStatus(statusEl, "Enter a valid MoMo fee percentage.", "error"); return; }
    try {

      // const res = await _AW.db.listDocuments(_AW.DB_ID, settingsId);

      await apiFetch(`/stations/${stationId}`,{
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: stationName, momoFee: momoFeePercent })
      });      

      const now = new Date();
      const formattedDate = now.toLocaleDateString('en-CA');
      console.log(formattedDate);

      const fuelPrices = await apiFetch(`/fuel-prices/me`).then(res => res.json());
      const priceDocs = fuelPrices.fuelPriceHistory?.documents ?? fuelPrices.fuelPriceHistory ?? [];

      const sorted     = [...priceDocs].sort((a, b) => (b.effectiveFrom || "").localeCompare(a.effectiveFrom || ""));
      const pmsPriceDoc = sorted.find(p => p.fuelType === "PMS");
      const agoPriceDoc = sorted.find(p => p.fuelType === "AGO");

      if (sorted.length < 2) {
        // await _AW.db.createDocument(_AW.DB_ID, settingsId, "unique()", { pmsPrice, agoPrice });

        await apiFetch(`/fuel-prices`,{
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stationId, effectiveFrom: formattedDate, fuelType: "PMS", price: pmsPrice, setByUserId: userId })
        });

        await apiFetch(`/fuel-prices`,{
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stationId, effectiveFrom: formattedDate, fuelType: "AGO", price: agoPrice, setByUserId: userId })
        });

      } else if ( pmsPriceDoc.price !== pmsPrice && agoPriceDoc.price !== agoPrice){

        await apiFetch(`/fuel-prices/${pmsPriceDoc.$id}`,{
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ effectiveTo: formattedDate })
        });

        await apiFetch(`/fuel-prices`,{
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stationId, effectiveFrom: formattedDate, fuelType: "PMS", price: pmsPrice, setByUserId: userId })
        });

        await apiFetch(`/fuel-prices/${agoPriceDoc.$id}`,{
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({  effectiveTo: formattedDate})
        });

        await apiFetch(`/fuel-prices`,{
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stationId, effectiveFrom: formattedDate, fuelType: "AGO", price: agoPrice, setByUserId: userId })
        });

      } else if (pmsPriceDoc.price !== pmsPrice ) {
        // await _AW.db.updateDocument(_AW.DB_ID, settingsId, res.documents[0].$id, { pmsPrice, agoPrice, stationName, momoFeePercent });
        await apiFetch(`/fuel-prices/${pmsPriceDoc.$id}`,{
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ effectiveTo: formattedDate })
        });

        await apiFetch(`/fuel-prices`,{
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stationId, effectiveFrom: formattedDate, fuelType: "PMS", price: pmsPrice, setByUserId: userId })
        });

      } else if (agoPriceDoc.price !== agoPrice ) {

        await apiFetch(`/fuel-prices/${agoPriceDoc.$id}`,{
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({  effectiveTo: formattedDate})
        });

        await apiFetch(`/fuel-prices`,{
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stationId, effectiveFrom: formattedDate, fuelType: "AGO", price: agoPrice, setByUserId: userId })
        });
      }
      showStatus(statusEl, "✓ Settings saved successfully.", "success");
    } catch (err) {
      showStatus(statusEl, "Error saving prices: " + err.message, "error");
    }
  }

  async function loadTeams() {
    const { apiFetch } = window._dash;
    const listEl = document.getElementById("teamsList");
    listEl.innerHTML = `<div class="loading">Loading...</div>`;
    try {
      // const res  = await fetch(`${_AW.SERVER_URL}/teams`);
      const res = await apiFetch(`/teams`);
      // const data = await res.json();
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.teams.length === 0) { listEl.innerHTML = `<div class="loading">No teams yet. Create one below.</div>`; return; }
      listEl.innerHTML = data.teams.map(t => renderTeamCard(t)).join("");
    } catch { listEl.innerHTML = `<div class="loading">Error loading teams.</div>`; }
  }

  function renderTeamCard(team) {
    return `
      <div class="team-card" id="team-${team.$id}">
        <div class="team-header" onclick="window._set.toggleTeam('${team.$id}')" role="button" tabindex="0" aria-expanded="false" id="team-header-${team.$id}">
          <span class="team-chevron">▶</span>
          <span class="team-name">${team.name}</span>
          <button class="btn-remove" onclick="event.stopPropagation(); window._set.promptDeleteTeam('${team.$id}', '${team.name.replace(/'/g, "\\'")}')">Delete</button>
        </div>
        <div class="team-body" id="team-body-${team.$id}" style="display:none;">
          <div class="team-members" id="members-${team.$id}"><div class="loading">Loading members...</div></div>
          <div class="add-member-row">
            <input type="email" id="memberEmail-${team.$id}" placeholder="Enter email to add">
            <button class="btn-primary" onclick="window._set.promptAddMember('${team.$id}', '${team.name.replace(/'/g, "\\'")}', this)">Add Member</button>
          </div>
          <div id="teamStatus-${team.$id}" class="status-msg" aria-live="polite"></div>
        </div>
      </div>`;
  }

  function toggleTeam(teamId) {
    const body = document.getElementById(`team-body-${teamId}`);
    const header = document.getElementById(`team-header-${teamId}`);
    const chevron = header?.querySelector(".team-chevron");
    const isOpen = body.style.display !== "none";
    if (isOpen) { body.style.display = "none"; chevron.textContent = "▶"; header.setAttribute("aria-expanded", "false"); }
    else {
      body.style.display = "block"; chevron.textContent = "▼"; header.setAttribute("aria-expanded", "true");
      const membersEl = document.getElementById(`members-${teamId}`);
      if (membersEl?.querySelector(".loading")) loadTeamMembers(teamId);
    }
  }

  async function loadTeamMembers(teamId) {
    const { apiFetch } = window._dash;
    const el = document.getElementById(`members-${teamId}`);
    if (!el) return;
    try {
      const res = await apiFetch(`/teams/${teamId}/members`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.memberships.length === 0) { el.innerHTML = `<div class="loading">No members yet.</div>`; return; }
      el.innerHTML = data.memberships.map(m => `
        <div class="admin-row" id="membership-${m.$id}">
          <span class="admin-email">${m.userName || "—"}</span>
          <span class="admin-role">${m.userEmail}</span>
          <button class="btn-remove" onclick="window._set.promptRemoveMember('${teamId}', '${m.$id}', '${(m.userName || m.userEmail).replace(/'/g, "\\'")}')">Remove</button>
        </div>`).join("");
    } catch { el.innerHTML = `<div class="loading">Error loading members.</div>`; }
  }

  let _pendingDeleteTeamId = null;

  function promptCreateTeam() {
    const nameEl = document.getElementById("newTeamName");
    const name = nameEl?.value.trim();
    const statusEl = document.getElementById("teamsStatus");
    if (!name) { showStatus(statusEl, "Enter a team name.", "error"); return; }
    const subEl = document.getElementById("createTeamPopupSub");
    if (subEl) subEl.textContent = `Create team "${name}"?`;
    openDialog("confirmCreateTeamPopup");
  }

  async function handleCreateTeam(btn) {
    const nameEl = document.getElementById("newTeamName");
    const name = nameEl?.value.trim();
    btn.disabled = true;
    try {
      // const res = await fetch(`${_AW.SERVER_URL}/teams`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ name }) });
      const res = await apiFetch(`/teams`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ name }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (nameEl) nameEl.value = "";
      const statusEl = document.getElementById("teamsStatus");
      showStatus(statusEl, `✓ Team "${name}" created.`, "success");
      loadTeams();
    } catch (err) { 
      const statusEl = document.getElementById("teamsStatus");
      showStatus(statusEl, "Error: " + err.message, "error"); 
    }
    finally { btn.disabled = false; }
  }

  function promptDeleteTeam(teamId, teamName) {
    _pendingDeleteTeamId = teamId;
    const subEl = document.getElementById("deleteTeamPopupSub");
    if (subEl) subEl.textContent = `Delete "${teamName}"? All memberships will be removed.`;
    openDialog("confirmDeleteTeamPopup");
  }

  async function handleDeleteTeam(btn) {
    closeDialog("confirmDeleteTeamPopup");
    if (!_pendingDeleteTeamId) return;
    const teamId = _pendingDeleteTeamId; _pendingDeleteTeamId = null; btn.disabled = true;
    try {
      const res = await apiFetch(`/teams/${teamId}`, { method:"DELETE" });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      document.getElementById(`team-${teamId}`)?.remove();
      const listEl = document.getElementById("teamsList");
      if (listEl && !listEl.querySelector(".team-card")) listEl.innerHTML = `<div class="loading">No teams yet. Create one below.</div>`;
      const statusEl = document.getElementById("teamsStatus");
      showStatus(statusEl, "Team deleted.", "success");
    } catch (err) { 
      const statusEl = document.getElementById("teamsStatus");
      showStatus(statusEl, "Error: " + err.message, "error"); 
    }
    finally { btn.disabled = false; }
  }

  let _pendingAddMember = null;

  function promptAddMember(teamId, teamName, btn) {
    const emailEl = document.getElementById(`memberEmail-${teamId}`);
    const email = emailEl?.value.trim();
    const statusEl = document.getElementById(`teamStatus-${teamId}`);
    if (!email) { showStatus(statusEl, "Enter an email address.", "error"); return; }
    _pendingAddMember = { teamId, email, btn };
    const subEl = document.getElementById("addMemberPopupSub");
    if (subEl) subEl.textContent = `Add ${email} to team "${teamName}"?`;
    openDialog("confirmAddMemberPopup");
  }

  async function handleAddMember(confirmBtn) {
    closeDialog("confirmAddMemberPopup");
    if (!_pendingAddMember) return;
    const { teamId, email, btn } = _pendingAddMember; _pendingAddMember = null;
    const statusEl = document.getElementById(`teamStatus-${teamId}`);
    if (btn) btn.disabled = true;
    try {
      const res = await apiFetch(`/teams/${teamId}/members`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ email }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const inputEl = document.getElementById(`memberEmail-${teamId}`);
      if (inputEl) inputEl.value = "";
      showStatus(statusEl, `✓ ${email} added.`, "success");
      loadTeamMembers(teamId);
    } catch (err) { showStatus(statusEl, "Error: " + err.message, "error"); }
    finally { if (btn) btn.disabled = false; }
  }

  let _pendingRemoveMember = null;

  function promptRemoveMember(teamId, membershipId, name) {
    _pendingRemoveMember = { teamId, membershipId };
    const subEl = document.getElementById("removeMemberPopupSub");
    if (subEl) subEl.textContent = `Remove ${name} from this team?`;
    openDialog("confirmRemoveMemberPopup");
  }

  async function handleRemoveMember(btn) {
    closeDialog("confirmRemoveMemberPopup");
    if (!_pendingRemoveMember) return;
    const { teamId, membershipId } = _pendingRemoveMember; _pendingRemoveMember = null; btn.disabled = true;
    try {
      const res = await apiFetch(`/teams/${teamId}/members/${membershipId}`, { method:"DELETE" });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      document.getElementById(`membership-${membershipId}`)?.remove();
      const membersEl = document.getElementById(`members-${teamId}`);
      if (membersEl && !membersEl.querySelector(".admin-row")) membersEl.innerHTML = `<div class="loading">No members yet.</div>`;
    } catch (err) { 
      const statusEl = document.getElementById("teamsStatus");
      showStatus(statusEl, "Error: " + err.message, "error"); 
    }
    finally { btn.disabled = false; }
  }

  function promptCreateEmployee() {
    const nameEl = document.getElementById("empName");
    const emailEl = document.getElementById("empEmail");
    const passwordEl = document.getElementById("empPassword");
    const name = nameEl?.value.trim();
    const email = emailEl?.value.trim();
    const password = passwordEl?.value;
    const statusEl = document.getElementById("empStatus");
    if (!name || !email || !password) { showStatus(statusEl, "Name, email, and password are all required.", "error"); return; }
    if (password.length < 8) { showStatus(statusEl, "Password must be at least 8 characters.", "error"); return; }
    const subEl = document.getElementById("createEmpPopupSub");
    if (subEl) subEl.textContent = `Create account for ${name} (${email})?`;
    openDialog("confirmCreateEmpPopup");
  }

  async function handleCreateEmployee(btn) {
    const nameEl = document.getElementById("empName");
    const emailEl = document.getElementById("empEmail");
    const passwordEl = document.getElementById("empPassword");
    const name = nameEl?.value.trim();
    const email = emailEl?.value.trim();
    const password = passwordEl?.value;
    const statusEl = document.getElementById("empStatus");
    btn.disabled = true;
    try {
      const res = await apiFetch(`/accounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role: "pompiste" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create employee");
      if (nameEl) nameEl.value = "";
      if (emailEl) emailEl.value = "";
      if (passwordEl) passwordEl.value = "";
      showStatus(statusEl, `✓ Account created for ${name} (${email}).`, "success");
      loadAllEmployees();
    } catch (err) { showStatus(statusEl, "Error: " + err.message, "error"); }
    finally { btn.disabled = false; }
  }

  async function loadAllEmployees() {
    const listEl = document.getElementById("allEmployeesList");
    listEl.innerHTML = `<div class="loading">Loading...</div>`;
    const now = new Date();
    const monthYear  = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const monthLabel = now.toLocaleString("default", { month: "long", year: "numeric" });
    const hintEl = document.getElementById("perfMonthLabel");
    if (hintEl) hintEl.textContent = monthLabel;
    try {
      const [usersRes, gainRes] = await Promise.all([
        apiFetch(`/users`),
        apiFetch(`/gain-pompiste?monthYear=${monthYear}`),
      ]);
      const usersData = await usersRes.json();
      const gainData  = await gainRes.json();
      if (!usersRes.ok) throw new Error(usersData.error);

      const gainMap = {};
      if (gainData.gains) {
        gainData.gains.forEach(d => { gainMap[d.email] = d.gainPayments ?? 0; });
      }

      if (usersData.users.length === 0) { listEl.innerHTML = `<div class="loading">No accounts found.</div>`; return; }
      listEl.innerHTML = usersData.users.map(u => {
        const hasGain  = u.email in gainMap;
        const gain     = gainMap[u.email] ?? 0;
        const gainHtml = hasGain
          ? `<span class="emp-gain ${gain >= 0 ? "gain-pos" : "gain-neg"}">${gain >= 0 ? "+" : ""}${gain.toLocaleString()} RWF</span>`
          : `<span class="emp-gain emp-gain-none">No shifts</span>`;
        const station    = u.stationId || "";
        const safeName   = (u.name || "").replace(/'/g, "\\'");
        const safeStation = station.replace(/'/g, "\\'");
        return `<div class="admin-row">
          <span class="admin-email">${u.name || "—"}</span>
          <span class="admin-role">${u.email}</span>
          ${station ? `<span class="emp-station">${station}</span>` : ""}
          ${gainHtml}
          <button class="btn-edit btn-primary" onclick="window._set.openEditEmployee('${u.$id}', '${safeName}', '${safeStation}')">Edit</button>
          <button class="btn-reset-pwd" onclick="window._set.promptResetPassword('${u.$id}', '${safeName}')">Reset Pwd</button>
        </div>`;
      }).join("");
    } catch { listEl.innerHTML = `<div class="loading">Error loading accounts.</div>`; }
  }

  let _setEditUserId = null;

  function openEditEmployee(userId, name, station) {
    _setEditUserId = userId;
    const nameEl = document.getElementById("editEmpName");
    if (nameEl) nameEl.value = name;
    const stationEl = document.getElementById("editEmpStation");
    if (stationEl) stationEl.value = station;
    openDialog("editEmployeePopup");
  }

  async function handleEditEmployee(btn) {
    if (!_setEditUserId) return;
    const nameEl = document.getElementById("editEmpName");
    const stationEl = document.getElementById("editEmpStation");
    const name = nameEl?.value.trim();
    const station = stationEl?.value.trim();
    const userId = _setEditUserId;
    btn.disabled = true;
    try {
      // const res  = await fetch(`${_AW.SERVER_URL}/users/${encodeURIComponent(_setEditUserId)}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ name, prefs:{ station } }) });
      const res = await apiFetch(`/users/${userId}`, {
        method: "PATCH",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, stationId:  station  })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      closeDialog("editEmployeePopup"); _setEditUserId = null; loadAllEmployees();
    } catch (err) { window._dash.toast(err.message, "error"); }
    finally { btn.disabled = false; }
  }

  let _setResetPwdUserId = null;

  function promptResetPassword(userId, name) {
    _setResetPwdUserId = userId;
    const subEl = document.getElementById("resetPwdPopupSub");
    if (subEl) subEl.textContent = `Set a new password for ${name || "this account"}.`;
    const pwdEl = document.getElementById("set-resetPwdInput");
    if (pwdEl) pwdEl.value = "";
    openDialog("resetPasswordPopup");
  }

  async function handleResetPassword(btn) {
    if (!_setResetPwdUserId) return;
    const pwdEl = document.getElementById("set-resetPwdInput");
    const password = pwdEl?.value || "";
    if (!password || password.length < 8) { window._dash.toast("Password must be at least 8 characters.", "warning"); btn.disabled = false; return; }
    const userId = _setResetPwdUserId; _setResetPwdUserId = null;
    try {
      const res = await apiFetch(`/accounts/${encodeURIComponent(userId)}/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      closeDialog("resetPasswordPopup");
      window._dash.toast("Password reset. User will be prompted to change it on next login.", "success");
    } catch (err) { window._dash.toast("Error: " + err.message, "error"); }
    finally { btn.disabled = false; }
  }

  async function handleChangeOwnPassword(btn) {
    const currentPwdEl = document.getElementById("ownCurrentPwd");
    const newPwdEl = document.getElementById("ownNewPwd");
    const confirmPwdEl = document.getElementById("ownConfirmPwd");
    const currentPwd = currentPwdEl?.value;
    const newPwd = newPwdEl?.value;
    const confirmPwd = confirmPwdEl?.value;
    const statusEl = document.getElementById("ownPwdStatus");
    if (!currentPwd || !newPwd || !confirmPwd) { showStatus(statusEl, "All three fields are required.", "error"); btn.disabled = false; return; }
    if (newPwd.length < 8) { showStatus(statusEl, "New password must be at least 8 characters.", "error"); btn.disabled = false; return; }
    if (newPwd !== confirmPwd) { showStatus(statusEl, "New passwords do not match.", "error"); btn.disabled = false; return; }
    try {
      await _AW.account.updatePassword(newPwd, currentPwd);
      if (currentPwdEl) currentPwdEl.value = "";
      if (newPwdEl) newPwdEl.value = "";
      if (confirmPwdEl) confirmPwdEl.value = "";
      showStatus(statusEl, "✓ Password changed successfully.", "success");
    } catch (err) { showStatus(statusEl, "Error: " + err.message, "error"); }
    finally { btn.disabled = false; }
  }

  // Register
  window._sections.settings = function loadSettings() {
    const { state } = window._dash;
    if (state.company) {
      const el = document.getElementById("companyName");
      if (el) el.value = state.company.name || "";
    }
    loadFuelSettings();
  };

  // Expose for onclick attributes in HTML
  window._set = {
    switchTab, handleSavePrices, promptCreateTeam, handleCreateTeam,
    promptDeleteTeam, handleDeleteTeam, toggleTeam,
    promptAddMember, handleAddMember, promptRemoveMember, handleRemoveMember,
    promptCreateEmployee, handleCreateEmployee, openEditEmployee, handleEditEmployee,
    promptResetPassword, handleResetPassword, handleChangeOwnPassword,
  };

})();
