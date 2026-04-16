// ── TOAST NOTIFICATIONS ───────────────────────────────────────
(function () {
  const style = document.createElement("style");
  style.textContent =
    "#toast-container{position:fixed;bottom:24px;right:24px;display:flex;flex-direction:column;gap:8px;z-index:9999;pointer-events:none}" +
    ".toast{min-width:220px;max-width:360px;padding:12px 16px;border-radius:8px;font-size:13px;font-weight:500;color:#fff;" +
    "box-shadow:0 4px 16px rgba(0,0,0,.18);opacity:0;transform:translateY(8px);transition:opacity .25s,transform .25s;pointer-events:auto}" +
    ".toast.show{opacity:1;transform:translateY(0)}" +
    ".toast-success{background:#16a34a}.toast-error{background:#dc2626}" +
    ".toast-warning{background:#d97706}.toast-info{background:#2563eb}" +
    ":focus-visible{outline:2px solid #2563eb;outline-offset:2px;border-radius:2px}" +
    ".skip-nav{position:absolute;left:-9999px;top:4px;padding:8px 16px;background:#1e293b;color:#fff;border-radius:4px;font-size:13px;font-weight:600;z-index:10000;text-decoration:none}" +
    ".skip-nav:focus{left:4px}" +
    ".dropdown.open .dropdown-menu{display:block}" +
    ".stock-alert-badge{display:inline-flex;align-items:center;gap:4px;background:#fef3c7;color:#92400e;border:1px solid #fcd34d;" +
    "border-radius:6px;padding:2px 8px;font-size:11px;font-weight:700;white-space:nowrap;cursor:default}";
  document.head.appendChild(style);
})();

window.toast = function toast(message, type = "info") {
  let c = document.getElementById("toast-container");
  if (!c) { c = document.createElement("div"); c.id = "toast-container"; document.body.appendChild(c); }
  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.setAttribute("role", "alert");
  el.textContent = message;
  c.appendChild(el);
  requestAnimationFrame(() => el.classList.add("show"));
  setTimeout(() => { el.classList.remove("show"); setTimeout(() => el.remove(), 300); }, 3500);
};

// ── DIALOG FOCUS MANAGEMENT ───────────────────────────────────
// openDialog(id) — shows popup, traps Tab, closes on Escape.
// closeDialog(id) — hides popup, returns focus to trigger element.
const _dialogFocusStack = [];

window.openDialog = function openDialog(id) {
  const dlg = document.getElementById(id);
  if (!dlg) return;
  _dialogFocusStack.push(document.activeElement);
  dlg.style.display = "flex";
  dlg.setAttribute("aria-hidden", "false");
  const getFocusable = () => [...dlg.querySelectorAll(
    'button:not([disabled]),[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'
  )];
  const els = getFocusable();
  if (els.length) els[0].focus();
  dlg._keyHandler = (e) => {
    if (e.key === "Escape") { closeDialog(id); return; }
    if (e.key !== "Tab") return;
    const list = getFocusable();
    if (list.length < 2) return;
    const first = list[0], last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  document.addEventListener("keydown", dlg._keyHandler);
};

window.closeDialog = function closeDialog(id) {
  const dlg = document.getElementById(id);
  if (!dlg) return;
  dlg.style.display = "none";
  dlg.setAttribute("aria-hidden", "true");
  if (dlg._keyHandler) { document.removeEventListener("keydown", dlg._keyHandler); delete dlg._keyHandler; }
  const prev = _dialogFocusStack.pop();
  if (prev?.focus) prev.focus();
};

// I-9: Derive the current page name safely, handling both
//   /testing_projects/index  (explicit) and
//   /testing_projects/       (trailing slash — GitHub Pages root)
function _currentPageName() {
    const raw = window.location.pathname.split("/").pop();
    return raw.replace(/\.html?$/, "") || "index";
}

function welcomeMessage() {
    async function showUser() {
        try {
            const user = await _AW.account.get();
            const username = user.name || user.email;
            if (document.getElementById("welcomeMessage")) {
                document.getElementById("welcomeMessage").textContent = "Welcome back, " + username;
            }
        } catch {
            window.location.href = "/testing_projects/auth/sign-in/sign-in";
        }
    }
    showUser();
}


async function userAccess() {
    const currentPage = _currentPageName();
    if (currentPage === "index" || currentPage === "history") return;

    const adminCollectionId = "68d95af4003245ef87a7";

    try {
        const user = await _AW.account.get();
        const adminCheck = await _AW.db.listDocuments(_AW.DB_ID, adminCollectionId, [
            Appwrite.Query.equal("email", user.email)
        ]);
        if (adminCheck.documents.length === 0) {
            window.location.replace("/testing_projects/index");
        }
    } catch {
        window.location.replace("/testing_projects/auth/sign-in/sign-in");
    }
}

async function loadFuelPrices() {
    const pmEl      = document.getElementById("pmsPrice");
    const agoEl     = document.getElementById("agoPrice");
    const stationEl = document.getElementById("headerStationName");
    if (!pmEl || !agoEl) return;

    try {
        const doc = await _AW.db.getDocument(_AW.DB_ID, "69d3ed400021197ed76e", "69d7db7ed8d5d2b73d66");
        pmEl.textContent  = doc.pmsPrice  != null ? Number(doc.pmsPrice).toLocaleString()  + " RWF" : "—";
        agoEl.textContent = doc.agoPrice  != null ? Number(doc.agoPrice).toLocaleString()  + " RWF" : "—";
        if (stationEl) {
            if (doc.stationName) {
                stationEl.textContent    = doc.stationName;
                stationEl.style.display  = "";
            } else {
                stationEl.style.display  = "none";
            }
        }
    } catch {
        pmEl.textContent  = "—";
        agoEl.textContent = "—";
    }
}


window.logout = async function logout() {

  try {
    await _AW.account.deleteSession("current");
    sessionStorage.removeItem("pompisteLoginTime");
    toast("Logged out successfully", "success");
    window.location.href= "/testing_projects/auth/sign-in/sign-in";

  } catch {
    toast("Logout failed. Please try again.", "error");
  }
}


function checkPompisteSession() {
    const currentPage = _currentPageName();
    if (currentPage !== "index") return;

    const loginTime = parseInt(sessionStorage.getItem("pompisteLoginTime"));
    if (!loginTime) {
        logout();
        return;
    }

    const ONE_HOUR = 60 * 60 * 1000;
    const elapsed = Date.now() - loginTime;
    const remaining = ONE_HOUR - elapsed;

    if (remaining <= 0) {
        logout();
        return;
    }

    setTimeout(async () => {
        try {
            await _AW.account.get(); // confirm Appwrite session still active
        } catch {
            logout();
            return;
        }
        toast("Your session has expired. You will be logged out.", "warning");
        setTimeout(() => logout(), 3500);
    }, remaining);
}

function initNavDropdowns() {
    document.querySelectorAll(".dropdown > a").forEach(trigger => {
        trigger.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                const li = trigger.closest(".dropdown");
                const isOpen = li.classList.contains("open");
                document.querySelectorAll(".dropdown.open").forEach(d => {
                    d.classList.remove("open");
                    d.querySelector("a").setAttribute("aria-expanded", "false");
                });
                if (!isOpen) {
                    li.classList.add("open");
                    trigger.setAttribute("aria-expanded", "true");
                }
            } else if (e.key === "Escape") {
                const li = trigger.closest(".dropdown");
                li.classList.remove("open");
                trigger.setAttribute("aria-expanded", "false");
            }
        });
    });
    document.addEventListener("click", (e) => {
        if (!e.target.closest(".dropdown")) {
            document.querySelectorAll(".dropdown.open").forEach(d => {
                d.classList.remove("open");
                d.querySelector("a").setAttribute("aria-expanded", "false");
            });
        }
    });
}

const _SIT_COLLECTION  = "68cd6b7f00330a840d96";
const _LOW_STOCK_LIMIT = 1000; // litres — warn when physical stock drops below this

async function checkLowStock() {
    if (_currentPageName() === "index") return;
    try {
        const res = await _AW.db.listDocuments(_AW.DB_ID, _SIT_COLLECTION, [
            Appwrite.Query.orderDesc("logDate"),
            Appwrite.Query.limit(1),
        ]);
        if (res.documents.length === 0) return;

        const doc = res.documents[0];
        const pms = doc.physicalStockPms;
        const ago = doc.physicalStockAgo;

        const warnings = [];
        if (pms !== null && pms !== undefined && pms < _LOW_STOCK_LIMIT)
            warnings.push(`PMS: ${Number(pms).toLocaleString()} L`);
        if (ago !== null && ago !== undefined && ago < _LOW_STOCK_LIMIT)
            warnings.push(`AGO: ${Number(ago).toLocaleString()} L`);

        if (warnings.length === 0) return;

        // Inject badge into header
        const fuelDiv = document.querySelector(".fuel-prices");
        if (fuelDiv && !document.getElementById("stockAlertBadge")) {
            const badge = document.createElement("span");
            badge.id        = "stockAlertBadge";
            badge.className = "stock-alert-badge";
            badge.textContent = "⚠ Low Stock";
            badge.title     = `Last recorded: ${warnings.join(" | ")}`;
            fuelDiv.appendChild(badge);
        }

        // Toast once per browser session
        if (!sessionStorage.getItem("stockAlertShown")) {
            sessionStorage.setItem("stockAlertShown", "1");
            toast(`⚠ Low fuel stock — ${warnings.join(", ")}`, "warning");
        }
    } catch { /* non-critical — silent fail */ }
}

loadFuelPrices();
userAccess();
welcomeMessage();
checkPompisteSession();
initNavDropdowns();
checkLowStock();