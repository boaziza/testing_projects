// Unified Dashboard — Owner + Manager in one page.
//
// How it works:
//   1. requireAuth() returns the user's profile (includes .role)
//   2. applyRoleVisibility(role) hides nav items and sections the role can't see
//   3. Each section loader checks the role when building its content
//
// Owner sees:  Overview | Stations | Managers | Reports | Settings
// Manager sees: Overview | Pompistes | Reports | Account

(function () {

  // ── TOAST ─────────────────────────────────────────────────────────────────
  function toast(msg, type = "info") {
    let c = document.getElementById("toast-container");
    if (!c) { c = document.createElement("div"); c.id = "toast-container"; document.body.appendChild(c); }
    const el = document.createElement("div");
    el.className = `toast toast-${type}`;
    el.textContent = msg;
    c.appendChild(el);
    requestAnimationFrame(() => el.classList.add("show"));
    setTimeout(() => { el.classList.remove("show"); setTimeout(() => el.remove(), 300); }, 3500);
  }

  // ── STATE ──────────────────────────────────────────────────────────────────
  let _profile   = null;   // { userId, role, name, email, companyId, stationId, ... }
  let _role      = null;   // 'owner' | 'manager' — shortcut
  let _stations  = [];
  let _managers  = [];
  let _pompistes = [];
  let _company   = null;
  let _station   = null;   // manager's assigned station object

  // For modals
  let _editUserId     = null;
  let _resetPwdUserId = null;
  let _deleteTarget   = null;
  let _addingRole     = null;  // 'manager' | 'pompiste' — what the add-user modal is creating

  // ── ROLE VISIBILITY ───────────────────────────────────────────────────────
  // Reads data-roles="owner,manager" on nav items and sections.
  // Hides anything the current role is not listed in.
  function applyRoleVisibility(role) {
    document.querySelectorAll("[data-roles]").forEach(el => {
      const allowed = el.dataset.roles.split(",");
      el.style.display = allowed.includes(role) ? "" : "none";
    });
    document.getElementById("sidebarRole").textContent =
      role === "owner" ? "Owner Portal" : "Manager Portal";
  }

  // ── NAV ───────────────────────────────────────────────────────────────────
  function showSection(name) {
    document.querySelectorAll(".section").forEach(s => s.style.display = "none");
    document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
    const sec = document.getElementById(`section-${name}`);
    if (sec) sec.style.display = "block";
    const nav = document.querySelector(`.nav-item[data-section="${name}"]`);
    if (nav) nav.classList.add("active");
  }

  document.querySelectorAll(".nav-item").forEach(item => {
    item.addEventListener("click", e => {
      e.preventDefault();
      const sec = item.dataset.section;
      showSection(sec);
      if (sec === "overview")   loadOverview();
      if (sec === "stations")   loadStations();
      if (sec === "managers")   loadManagers();
      if (sec === "pompistes")  loadPompistes();
      if (sec === "situation")  loadSituation();
      if (sec === "stock")      loadStock();
      if (sec === "history")    loadHistory();
      if (sec === "report")     loadReport();
      if (sec === "logs")       loadLogs();
      if (sec === "settings")   loadSettings();
    });
  });

  // ── MODAL HELPERS ─────────────────────────────────────────────────────────
  function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = "flex";
  }
  function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  }
  document.querySelectorAll("[data-close]").forEach(btn =>
    btn.addEventListener("click", () => closeModal(btn.dataset.close))
  );
  document.querySelectorAll(".modal-overlay").forEach(overlay =>
    overlay.addEventListener("click", e => { if (e.target === overlay) closeModal(overlay.id); })
  );

  // ── OVERVIEW ──────────────────────────────────────────────────────────────
  // Owner sees: stations count, managers count, pompistes count, company name
  // Manager sees: pompistes count, station PMS price, station AGO price, MoMo fee
  function loadOverview() {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    document.getElementById("overviewTitle").textContent = `${greeting}, ${(_profile.name || "").split(" ")[0]}`;

    if (_role === "owner") {
      document.getElementById("overviewSub").textContent = _company?.name || "Your company";
      document.getElementById("overviewStats").innerHTML = `
        <div class="stat-card"><div class="stat-val">${_stations.length}</div><div class="stat-label">Stations</div></div>
        <div class="stat-card"><div class="stat-val">${_managers.length}</div><div class="stat-label">Managers</div></div>
        <div class="stat-card"><div class="stat-val">${_pompistes.length}</div><div class="stat-label">Pompistes</div></div>
      `;
    } else {
      document.getElementById("overviewSub").textContent = _station?.name || "No station assigned";
      document.getElementById("overviewStats").innerHTML = `
        <div class="stat-card"><div class="stat-val">${_pompistes.length}</div><div class="stat-label">Pompistes</div></div>
        <div class="stat-card"><div class="stat-val">${_station?.pmsPrice ?? "—"}</div><div class="stat-label">PMS (RWF/L)</div></div>
        <div class="stat-card"><div class="stat-val">${_station?.agoPrice ?? "—"}</div><div class="stat-label">AGO (RWF/L)</div></div>
        <div class="stat-card"><div class="stat-val">${_station?.momoFee ?? "—"}%</div><div class="stat-label">MoMo Fee</div></div>
      `;
    }
  }

  // ── STATIONS (owner only) ─────────────────────────────────────────────────
  async function loadStations() {
    const el = document.getElementById("stationsList");
    el.innerHTML = "<div class='loading-state'>Loading…</div>";
    try {
      const res  = await apiFetch("/stations");
      const data = await res.json();
      _stations  = data.stations || [];
      if (_stations.length === 0) {
        el.innerHTML = "<div class='empty-state'>No stations yet. Click + Add Station.</div>";
        return;
      }
      el.innerHTML = _stations.map(s => `
        <div class="station-card">
          <div class="station-card-name">${s.name}</div>
          <div class="station-card-address">${s.address || "No address"}</div>
          <div class="station-card-actions">
            <button class="btn-ghost btn-sm" data-action="edit-station" data-id="${s.$id}">Edit</button>
            <button class="btn-danger btn-sm" data-action="delete-station" data-id="${s.$id}">Delete</button>
          </div>
        </div>
      `).join("");
    } catch {
      toast("Could not load stations.", "error");
    }
  }

  document.getElementById("addStationBtn")?.addEventListener("click", () => {
    // Owner adds a station — reuse addUserModal with station fields
    // (implement station-specific modal as needed)
    toast("Add Station — coming soon", "info");
  });

  // ── MANAGERS (owner only) ─────────────────────────────────────────────────
  async function loadManagers() {
    const el = document.getElementById("managersList");
    el.innerHTML = "<div class='loading-state'>Loading…</div>";
    try {
      const res  = await apiFetch("/managers");
      const data = await res.json();
      _managers  = data.managers || [];
      if (_managers.length === 0) {
        el.innerHTML = "<div class='empty-state'>No managers yet.</div>";
        return;
      }
      el.innerHTML = `
        <table class="data-table">
          <thead><tr><th>Name</th><th>Email</th><th>Station</th><th>Status</th><th></th></tr></thead>
          <tbody>${_managers.map(m => {
            const station = _stations.find(s => s.$id === m.stationId);
            return `<tr>
              <td>${m.name}</td>
              <td>${m.email}</td>
              <td>${station?.name || "—"}</td>
              <td>${m.mustChangePassword ? '<span class="badge badge-warn">Temp pwd</span>' : '<span class="badge badge-ok">Active</span>'}</td>
              <td class="row-actions">
                <button class="btn-ghost btn-sm" data-action="edit" data-uid="${m.userId}">Edit</button>
                <button class="btn-ghost btn-sm" data-action="reset-pwd" data-uid="${m.userId}" data-name="${m.name}">Reset pwd</button>
                <button class="btn-danger btn-sm" data-action="delete" data-uid="${m.userId}">Delete</button>
              </td>
            </tr>`;
          }).join("")}</tbody>
        </table>`;
      el.querySelectorAll("[data-action='edit']").forEach(btn =>
        btn.addEventListener("click", () => openEditUser(btn.dataset.uid))
      );
      el.querySelectorAll("[data-action='reset-pwd']").forEach(btn =>
        btn.addEventListener("click", () => openResetPwd(btn.dataset.uid, btn.dataset.name))
      );
    } catch {
      toast("Could not load managers.", "error");
    }
  }

  document.getElementById("addManagerBtn")?.addEventListener("click", () => {
    _addingRole = "manager";
    document.getElementById("addUserModalTitle").textContent = "Add Manager";
    document.getElementById("stationSelectRow").style.display = "";
    // Populate station dropdown
    const sel = document.getElementById("newUserStation");
    sel.innerHTML = _stations.map(s => `<option value="${s.$id}">${s.name}</option>`).join("");
    document.getElementById("newUserName").value = "";
    document.getElementById("newUserEmail").value = "";
    document.getElementById("newUserPassword").value = "";
    openModal("addUserModal");
  });

  // ── POMPISTES (manager only) ──────────────────────────────────────────────
  async function loadPompistes() {
    const el = document.getElementById("pompistesList");
    el.innerHTML = "<div class='loading-state'>Loading…</div>";
    try {
      const res  = await apiFetch("/pompistes");
      const data = await res.json();
      _pompistes = data.pompistes || [];
      if (_pompistes.length === 0) {
        el.innerHTML = "<div class='empty-state'>No pompistes yet. Click + Add Pompiste.</div>";
        return;
      }
      el.innerHTML = `
        <table class="data-table">
          <thead><tr><th>Name</th><th>Email</th><th>Status</th><th></th></tr></thead>
          <tbody>${_pompistes.map(p => `<tr>
            <td>${p.name}</td>
            <td>${p.email}</td>
            <td>${p.mustChangePassword ? '<span class="badge badge-warn">Temp pwd</span>' : '<span class="badge badge-pompiste">Active</span>'}</td>
            <td class="row-actions">
              <button class="btn-ghost btn-sm" data-action="edit" data-uid="${p.userId}">Edit</button>
              <button class="btn-ghost btn-sm" data-action="reset-pwd" data-uid="${p.userId}" data-name="${p.name}">Reset pwd</button>
              <button class="btn-danger btn-sm" data-action="delete" data-uid="${p.userId}">Delete</button>
            </td>
          </tr>`).join("")}</tbody>
        </table>`;
      el.querySelectorAll("[data-action='edit']").forEach(btn =>
        btn.addEventListener("click", () => openEditUser(btn.dataset.uid))
      );
      el.querySelectorAll("[data-action='reset-pwd']").forEach(btn =>
        btn.addEventListener("click", () => openResetPwd(btn.dataset.uid, btn.dataset.name))
      );
    } catch {
      toast("Could not load pompistes.", "error");
    }
  }

  document.getElementById("addPompisteBtn")?.addEventListener("click", () => {
    _addingRole = "pompiste";
    document.getElementById("addUserModalTitle").textContent = "Add Pompiste";
    document.getElementById("stationSelectRow").style.display = "none";
    document.getElementById("newUserName").value = "";
    document.getElementById("newUserEmail").value = "";
    document.getElementById("newUserPassword").value = "";
    openModal("addUserModal");
  });

  // ── ADD USER (shared modal for manager + pompiste creation) ───────────────
  document.getElementById("confirmAddUserBtn").addEventListener("click", async () => {
    const name     = document.getElementById("newUserName").value.trim();
    const email    = document.getElementById("newUserEmail").value.trim();
    const password = document.getElementById("newUserPassword").value.trim();
    const stationId = _addingRole === "manager"
      ? document.getElementById("newUserStation").value
      : _profile.stationId;

    if (!name || !email || !password) { toast("All fields are required.", "warning"); return; }
    if (password.length < 8)          { toast("Password must be at least 8 characters.", "warning"); return; }

    try {
      const res  = await apiFetch(`/${_addingRole}s`, {
        method: "POST",
        body: JSON.stringify({ name, email, password, stationId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");

      closeModal("addUserModal");
      document.getElementById("credEmail").textContent    = email;
      document.getElementById("credPassword").textContent = password;
      openModal("credentialModal");

      if (_addingRole === "pompiste") loadPompistes();
      else loadManagers();
    } catch (err) {
      toast(err.message || `Could not create ${_addingRole}.`, "error");
    }
  });

  document.getElementById("credDoneBtn").addEventListener("click", () => closeModal("credentialModal"));

  // ── EDIT USER (shared) ────────────────────────────────────────────────────
  function openEditUser(userId) {
    const list = _role === "owner" ? _managers : _pompistes;
    const user = list.find(u => u.userId === userId);
    if (!user) return;
    _editUserId = userId;
    document.getElementById("editUserName").value = user.name;
    openModal("editUserModal");
  }

  document.getElementById("confirmEditUserBtn").addEventListener("click", async () => {
    const name = document.getElementById("editUserName").value.trim();
    if (!name) { toast("Name is required.", "warning"); return; }
    try {
      const res = await apiFetch(`/users/${_editUserId}`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      closeModal("editUserModal");
      toast("Name updated.", "success");
      if (_role === "manager") loadPompistes(); else loadManagers();
    } catch (err) {
      toast(err.message || "Update failed.", "error");
    }
  });

  // ── RESET PASSWORD (shared) ───────────────────────────────────────────────
  function openResetPwd(userId, name) {
    _resetPwdUserId = userId;
    document.getElementById("resetPwdHint").textContent = `Set a new temporary password for ${name}.`;
    document.getElementById("resetPwdInput").value = "";
    openModal("resetPwdModal");
  }

  document.getElementById("confirmResetPwdBtn").addEventListener("click", async () => {
    const password = document.getElementById("resetPwdInput").value.trim();
    if (password.length < 8) { toast("Password must be at least 8 characters.", "warning"); return; }
    try {
      const res = await apiFetch(`/users/${_resetPwdUserId}/password`, {
        method: "PATCH",
        body: JSON.stringify({ password }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      closeModal("resetPwdModal");
      toast("Password reset.", "success");
    } catch (err) {
      toast(err.message || "Reset failed.", "error");
    }
  });

  // ── SITUATION (owner + manager) ───────────────────────────────────────────
  async function loadSituation() {
    // TODO: implement situation section
  }

  // ── STOCK (manager only) ──────────────────────────────────────────────────
  async function loadStock() {
    // TODO: implement stock section
  }

  // ── HISTORY (owner + manager) ─────────────────────────────────────────────
  async function loadHistory() {
    // TODO: implement history section
  }

  // ── REPORT (owner + manager) ──────────────────────────────────────────────
  async function loadReport() {
    // TODO: implement report section
  }

  // ── EMPLOYEE LOGS (manager only) ──────────────────────────────────────────
  async function loadLogs() {
    // TODO: implement employee logs section
  }

  // ── SETTINGS (owner only) ─────────────────────────────────────────────────
  async function loadSettings() {
    if (_company) {
      document.getElementById("companyName").value = _company.name || "";
    }
  }

  document.getElementById("saveCompanyBtn")?.addEventListener("click", async () => {
    const name = document.getElementById("companyName").value.trim();
    if (!name) { toast("Company name is required.", "warning"); return; }
    try {
      const res = await apiFetch("/company", { method: "PATCH", body: JSON.stringify({ name }) });
      if (!res.ok) throw new Error((await res.json()).error);
      if (_company) _company.name = name;
      toast("Company name saved.", "success");
    } catch (err) {
      toast(err.message || "Save failed.", "error");
    }
  });

  document.getElementById("ownerChangePwdBtn")?.addEventListener("click", () => changePwd("ownerNewPwd", "ownerConfirmPwd"));
  document.getElementById("mgrChangePwdBtn")?.addEventListener("click",   () => changePwd("mgrNewPwd",   "mgrConfirmPwd"));

  async function changePwd(newId, confirmId) {
    const pwd     = document.getElementById(newId).value.trim();
    const confirm = document.getElementById(confirmId).value.trim();
    if (pwd.length < 8)   { toast("Password must be at least 8 characters.", "warning"); return; }
    if (pwd !== confirm)  { toast("Passwords do not match.", "warning"); return; }
    try {
      const res = await apiFetch(`/users/${_profile.userId}/password`, {
        method: "PATCH",
        body: JSON.stringify({ password: pwd }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast("Password changed successfully.", "success");
      document.getElementById(newId).value = "";
      document.getElementById(confirmId).value = "";
    } catch (err) {
      toast(err.message || "Password change failed.", "error");
    }
  }

  // ── LOGOUT ────────────────────────────────────────────────────────────────
  document.getElementById("logoutBtn").addEventListener("click", () => logout());

  // ── INIT ──────────────────────────────────────────────────────────────────
  (async function init() {
    // Accept either role — redirect to sign-in if neither
    _profile = await requireAuth({ roles: ["owner", "manager"] });
    if (!_profile) return;

    _role = _profile.role;

    // Apply role visibility before loading any data
    applyRoleVisibility(_role);

    // Set sidebar user info
    document.getElementById("userName").textContent = _profile.name || _role;
    document.getElementById("userAvatar").textContent = (_profile.name || _role)[0].toUpperCase();

    if (_role === "owner") {
      // Load all owner data in parallel
      const [compRes, stRes, mgrRes, pmpRes] = await Promise.all([
        apiFetch("/company"),
        apiFetch("/stations"),
        apiFetch("/managers"),
        apiFetch("/pompistes"),
      ]);
      if (compRes.ok) { const d = await compRes.json(); _company   = d.company; }
      if (stRes.ok)   { const d = await stRes.json();   _stations  = d.stations  || []; }
      if (mgrRes.ok)  { const d = await mgrRes.json();  _managers  = d.managers  || []; }
      if (pmpRes.ok)  { const d = await pmpRes.json();  _pompistes = d.pompistes || []; }

      document.getElementById("userContext").textContent = _company?.name || "—";

    } else {
      // Manager — load their station and pompistes
      const [stRes, pmpRes] = await Promise.all([
        apiFetch("/stations"),
        apiFetch("/pompistes"),
      ]);
      if (stRes.ok)  { const d = await stRes.json();  _station   = (d.stations || []).find(s => s.$id === _profile.stationId) || null; }
      if (pmpRes.ok) { const d = await pmpRes.json(); _pompistes = d.pompistes || []; }

      document.getElementById("userContext").textContent = _station?.name || "No station assigned";
    }

    loadOverview();
  })();

})();
