let _allLogs    = [];
let _activeLevel = "ALL";
let _refreshTimer = null;

async function fetchLogs() {
  const btn = document.getElementById("refreshBtn");
  if (btn) btn.disabled = true;

  try {
    const jwt = await _AW.account.createJWT();
    const res  = await fetch(`${_AW.SERVER_URL.replace("/api", "")}/api/logs`, {
      headers: { Authorization: `Bearer ${jwt.jwt}` },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast(err.error || "Failed to load logs.", "error");
      return;
    }

    const data = await res.json();
    _allLogs = data.logs || [];
    renderLogs();
  } catch {
    toast("Could not reach the server.", "error");
  } finally {
    if (btn) btn.disabled = false;
  }
}

function renderLogs() {
  const filtered = _activeLevel === "ALL"
    ? _allLogs
    : _allLogs.filter(l => l.level === _activeLevel);

  document.getElementById("logCount").textContent =
    `${filtered.length} ${filtered.length === 1 ? "entry" : "entries"}${_activeLevel !== "ALL" ? ` (${_activeLevel})` : ""}`;

  const loading = document.getElementById("logsLoading");
  const table   = document.getElementById("logsTable");
  const empty   = document.getElementById("logsEmpty");
  const tbody   = document.getElementById("logsBody");

  loading.style.display = "none";

  if (filtered.length === 0) {
    table.style.display = "none";
    empty.style.display = "block";
    return;
  }

  empty.style.display = "none";
  table.style.display = "table";

  tbody.innerHTML = filtered.map(entry => {
    const [datePart, timePart] = (entry.ts || "").split("T");
    const time = (timePart || "").replace("Z", "").split(".")[0];

    const { ts, level, msg, ...ctx } = entry;
    const ctxHtml = Object.keys(ctx).length
      ? `<div class="ctx-pairs">${Object.entries(ctx).map(([k, v]) =>
          `<span class="ctx-chip"><strong>${k}:</strong> ${escapeHtml(String(v))}</span>`
        ).join("")}</div>`
      : "<span style='color:var(--muted)'>—</span>";

    return `<tr>
      <td><span class="ts-date">${escapeHtml(datePart)}</span> <span class="ts-time">${escapeHtml(time)}</span></td>
      <td><span class="level-badge level-${escapeHtml(level || "INFO")}">${escapeHtml(level || "—")}</span></td>
      <td>${escapeHtml(msg || "—")}</td>
      <td>${ctxHtml}</td>
    </tr>`;
  }).join("");
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function setFilter(level) {
  _activeLevel = level;
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.level === level);
  });
  renderLogs();
}

function startAutoRefresh() {
  _refreshTimer = setInterval(fetchLogs, 5000);
  document.getElementById("refreshStatus").textContent = "Auto-refreshing every 5s";
}

document.querySelectorAll(".filter-btn").forEach(btn => {
  btn.addEventListener("click", () => setFilter(btn.dataset.level));
});

fetchLogs();
startAutoRefresh();
