(function () {

  window._sections.pompistes = async function loadPompistes() {
    const { toast, openResetPwd, apiFetch, state } = window._dash;
    const listEl = document.getElementById("pompistesList");
    if (listEl) listEl.innerHTML = "<div class='loading-state'>Loading…</div>";

    try {
      const now       = new Date();
      const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      const [usersData, gainData] = await Promise.all([
        apiFetch('/users').then(r => r.json()),
        apiFetch('/gain-pompiste').then(r => r.json()),
      ]);

      if (usersData.error) throw new Error(usersData.error);

      // Build gain map keyed by email for current month
      // const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const gainMap = {};
      (gainData.gains?.documents ?? gainData.gains ?? [])
        .filter(d => d.monthYear === currentMonth)
        .forEach(d => { gainMap[d.email] = d.gainPayments ?? 0; });

      const users = usersData.users ?? [];
        
      const pompistes = users.filter(u => u.role === "pompiste");

      // Keep in state so shared modals can find them
      state.pompistes = pompistes.map(u => ({
        userId: u.userId || u.$id,
        name:   u.name,
        email:  u.email,
        mustChangePassword: u.mustChangePassword ?? false,
      }));

      if (pompistes.length === 0) {
        if (listEl) listEl.innerHTML = "<div class='empty-state'>No pompistes found.</div>";
        return;
      }

      const { openEditUser, openDeleteUser } = window._dash;

      if (listEl) listEl.innerHTML = `
        <table class="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Gain (${now.toLocaleString("default", { month: "long" })})</th>
              <th></th>
            </tr>
          </thead>
          <tbody>${pompistes.map(u => {
            const uid     = u.userId || u.$id;
            const uname   = (u.name || u.email).replace(/"/g, '&quot;');
            const hasGain = u.email in gainMap;
            const gain    = gainMap[u.email] ?? 0;
            const gainCell = hasGain
              ? `<span class="${gain >= 0 ? "badge badge-ok" : "badge badge-warn"}">${gain >= 0 ? "+" : ""}${gain.toLocaleString()} RWF</span>`
              : `<span class="badge">No shifts</span>`;
            return `<tr>
              <td>${u.name || "—"}</td>
              <td>${u.email}</td>
              <td>${gainCell}</td>
              <td class="row-actions">
                <button class="btn-ghost btn-sm"  data-action="edit"      data-uid="${uid}" data-name="${uname}">Edit</button>
                <button class="btn-ghost btn-sm"  data-action="reset-pwd" data-uid="${uid}" data-name="${uname}">Reset pwd</button>
                <button class="btn-danger btn-sm" data-action="delete"    data-uid="${uid}" data-name="${uname}">Delete</button>
              </td>
            </tr>`;
          }).join("")}</tbody>
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
      toast("Could not load pompistes: " + err.message, "error");
    }
  };

  document.getElementById("addPompisteBtn")?.addEventListener("click", () => {
    window._dash.openAddUserModal("pompiste");
  });

})();
