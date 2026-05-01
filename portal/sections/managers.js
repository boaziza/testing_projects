(function () {

  window._sections.managers = async function loadManagers() {
    const { toast, openEditUser, openResetPwd, state, apiFetch } = window._dash;
    const listEl = document.getElementById("managersList");
    if (listEl) listEl.innerHTML = "<div class='loading-state'>Loading…</div>";

    try {
      // Fetch all teams, then load members of every non-employee team
      // const teamsRes  = await fetch(`${_AW.SERVER_URL}/teams`);
      // const teamsData = await teamsRes.json();
      // if (!teamsRes.ok) throw new Error(teamsData.error || "Failed to load teams");

      // const adminTeams = (teamsData.teams || []).filter(t =>
      //   t.name.toLowerCase() !== "employees"
      // );

      // if (adminTeams.length === 0) {
      //   if (listEl) listEl.innerHTML = "<div class='empty-state'>No manager teams found.</div>";
      //   return;
      // }

      // // Load members of each team in parallel
      // const memberResults = await Promise.all(
      //   adminTeams.map(team =>
      //     fetch(`${_AW.SERVER_URL}/teams/${encodeURIComponent(team.$id)}/members`)
      //       .then(r => r.json())
      //       .then(d => ({ team, memberships: d.memberships || [] }))
      //       .catch(() => ({ team, memberships: [] }))
      //   )
      // );

      // // Flatten into a single list, deduplicate by userId
      // const seen    = new Set();
      // const managers = [];
      // memberResults.forEach(({ team, memberships }) => {
      //   memberships.forEach(m => {
      //     if (!seen.has(m.userId)) {
      //       seen.add(m.userId);
      //       managers.push({ ...m, teamName: team.name });
      //     }
      //   });
      // });

      const res  = await apiFetch(`/users`).then(r => r.json());
      const managers = (res.users ?? []).filter(u => u.role === "manager");
      console.log("res",res);
      

      // Keep in state so shared modals (edit/reset) can find them
      state.managers = managers.map(m => ({
        userId: m.userId,
        name:   m.name  || m.email,
        email:  m.email,
      }));

      if (managers.length === 0) {
        if (listEl) listEl.innerHTML = "<div class='empty-state'>No managers found.</div>";
        return;
      }

      // Find station name for each manager using state.stations
      const stationMap = Object.fromEntries((state.stations || []).map(s => [s.$id, s.name]));

      if (listEl) listEl.innerHTML = `
        <table class="data-table">
          <thead><tr><th>Name</th><th>Email</th><th>Station</th><th></th></tr></thead>
          <tbody>${managers.map(m => `<tr>
            <td>${m.name || "—"}</td>
            <td>${m.email}</td>
            <td>${stationMap[m.stationId] || m.stationId || "—"}</td>
            <td class="row-actions">
              <button class="btn-ghost btn-sm" data-action="reset-pwd"
                data-uid="${m.userId}" data-name="${m.name || m.email}">Reset pwd</button>
            </td>
          </tr>`).join("")}</tbody>
        </table>`;

      if (listEl) listEl.querySelectorAll("[data-action='reset-pwd']").forEach(btn =>
        btn.addEventListener("click", () => openResetPwd(btn.dataset.uid, btn.dataset.name))
      );

    } catch (err) {
      toast("Could not load managers: " + err.message, "error");
    }
  };

  document.getElementById("addManagerBtn")?.addEventListener("click", () => {
    window._dash.openAddUserModal("manager");
  });

})();
