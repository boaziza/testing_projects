(function () {

  window._sections.managers = async function loadManagers() {
    const { toast, openEditUser, openDeleteUser, openResetPwd, state, apiFetch } = window._dash;
    const listEl = document.getElementById("managersList");
    if (listEl) listEl.innerHTML = "<div class='loading-state'>Loading…</div>";

    try {
      const res      = await apiFetch(`/users`).then(r => r.json());
      const managers = (res.users ?? []).filter(u => u.role === "manager");

      state.managers = managers.map(m => ({
        userId: m.userId,
        name:   m.name || m.email,
        email:  m.email,
      }));

      if (managers.length === 0) {
        if (listEl) listEl.innerHTML = "<div class='empty-state'>No managers found.</div>";
        return;
      }

      const stationMap = Object.fromEntries((state.stations || []).map(s => [s.$id, s.name]));

      if (listEl) listEl.innerHTML = `
        <table class="data-table">
          <thead><tr><th>Name</th><th>Email</th><th>Station</th><th></th></tr></thead>
          <tbody>${managers.map(m => `<tr>
            <td>${m.name || "—"}</td>
            <td>${m.email}</td>
            <td>${stationMap[m.stationId] || m.stationId || "—"}</td>
            <td class="row-actions">
              <button class="btn-ghost btn-sm" data-action="edit"      data-uid="${m.userId}" data-name="${(m.name||m.email).replace(/"/g,'&quot;')}">Edit</button>
              <button class="btn-ghost btn-sm" data-action="reset-pwd" data-uid="${m.userId}" data-name="${(m.name||m.email).replace(/"/g,'&quot;')}">Reset pwd</button>
              <button class="btn-danger btn-sm" data-action="delete"   data-uid="${m.userId}" data-name="${(m.name||m.email).replace(/"/g,'&quot;')}">Delete</button>
            </td>
          </tr>`).join("")}</tbody>
        </table>`;

      listEl.querySelectorAll("[data-action='edit']").forEach(btn =>
        btn.addEventListener("click", () => openEditUser(btn.dataset.uid))
      );
      listEl.querySelectorAll("[data-action='reset-pwd']").forEach(btn =>
        btn.addEventListener("click", () => openResetPwd(btn.dataset.uid, btn.dataset.name))
      );
      listEl.querySelectorAll("[data-action='delete']").forEach(btn =>
        btn.addEventListener("click", () => openDeleteUser(btn.dataset.uid, btn.dataset.name))
      );

    } catch (err) {
      toast("Could not load managers: " + err.message, "error");
    }
  };

  document.getElementById("addManagerBtn")?.addEventListener("click", () => {
    window._dash.openAddUserModal("manager");
  });

})();
