(function () {

  window._sections.stations = async function loadStations() {
    const { toast, apiFetch, state } = window._dash;
    const stationsListEl = document.getElementById("stationsList");
    if (stationsListEl) stationsListEl.innerHTML = "<div class='loading-state'>Loading…</div>";
    try {
      const res  = await apiFetch("/stations");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      state.stations = data.stations || [];
      if (state.stations.length === 0) {
        if (stationsListEl) stationsListEl.innerHTML = "<div class='empty-state'>No stations yet. Click + Add Station.</div>";
        return;
      }
      if (stationsListEl) stationsListEl.innerHTML = state.stations.map(s => `
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
  };

  document.getElementById("addStationBtn")?.addEventListener("click", () => {
    window._dash.toast("Add Station — coming soon", "info");
  });

})();
