(function () {

  let _allLogs     = [];
  let _activeLevel = "ALL";
  let _refreshTimer = null;

  async function fetchLogs() {
    const toast = window._dash.toast;
    const btn = document.getElementById("refreshBtn");
    if (btn) btn.disabled = true;
    try {
      const jwt = await _AW.account.createJWT();
      const res = await fetch(`${_AW.SERVER_URL.replace("/api", "")}/api/logs`, {
        headers: { Authorization: `Bearer ${jwt.jwt}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast(err.error || "Failed to load logs.", "error");
        return;
      }
      _allLogs = (await res.json()).logs || [];
      renderLogs();
    } catch {
      toast("Could not reach the server.", "error");
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function renderLogs() {
    const all      = _activeLevel === "ALL"
      ? _allLogs
      : _allLogs.filter(l => l.level === _activeLevel);
    const filtered = all.slice(0, 25);

    const logCountEl = document.getElementById("logCount");
    if (logCountEl) logCountEl.textContent = `${filtered.length}${all.length > 25 ? ` of ${all.length}` : ""} ${filtered.length === 1 ? "entry" : "entries"}${_activeLevel !== "ALL" ? ` (${_activeLevel})` : ""}`;

    const loading = document.getElementById("logsLoading");
    const table = document.getElementById("logsTable");
    const empty = document.getElementById("logsEmpty");
    const tbody = document.getElementById("logsBody");

    if (loading) loading.style.display = "none";
    if (filtered.length === 0) {
      table.style.display = "none"; empty.style.display = "block"; return;
    }
    empty.style.display = "none"; table.style.display = "table";

    tbody.innerHTML = filtered.map(entry => {
      const [datePart, timePart] = (entry.ts || "").split("T");
      const time = (timePart || "").replace("Z", "").split(".")[0];
      const { ts, level, msg, ...ctx } = entry;
      const ctxHtml = Object.keys(ctx).length
        ? `<div class="ctx-pairs">${Object.entries(ctx).map(([k, v]) =>
            `<span class="ctx-chip"><strong>${k}:</strong> ${esc(String(v))}</span>`
          ).join("")}</div>`
        : "<span style='color:var(--rp-muted)'>—</span>";
      return `<tr>
        <td><span class="ts-date">${esc(datePart)}</span> <span class="ts-time">${esc(time)}</span></td>
        <td><span class="level-badge level-${esc(level || "INFO")}">${esc(level || "—")}</span></td>
        <td>${esc(msg || "—")}</td>
        <td>${ctxHtml}</td>
      </tr>`;
    }).join("");
  }

  function esc(str) {
    return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }

  function setFilter(level) {
    _activeLevel = level;
    document.querySelectorAll(".filter-btn").forEach(btn =>
      btn.classList.toggle("active", btn.dataset.level === level)
    );
    renderLogs();
  }

  function stopAutoRefresh() {
    if (_refreshTimer) { clearInterval(_refreshTimer); _refreshTimer = null; }
  }

  // Register — start fetching when user navigates to this section
  window._sections.logs = function loadLogs() {
    if (_refreshTimer) return;  // already running
    document.querySelectorAll(".filter-btn").forEach(btn =>
      btn.addEventListener("click", () => setFilter(btn.dataset.level))
    );
    fetchLogs();
    _refreshTimer = setInterval(fetchLogs, 30000);
    const statusEl = document.getElementById("refreshStatus");
    if (statusEl) statusEl.textContent = "Auto-refreshing every 5s";
  };

  // Expose for onclick in HTML
  window._logs = { fetchLogs, setFilter, stopAutoRefresh };

})();
