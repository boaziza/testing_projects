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
    ".dropdown.open .dropdown-menu{display:block}";
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

    const currentPage = window.location.pathname.split("/").pop();

    if ( currentPage === "index") {     
        return;
    } 

    try {
        const adminId = "68d95af4003245ef87a7";
        const user  = await _AW.account.get();
        const admin = await _AW.db.listDocuments(_AW.DB_ID, adminId, [Appwrite.Query.equal("email", user.email)]);
        if (admin.documents.length === 0) {
            window.location.replace("/testing_projects/index");
        }
    } catch {
        window.location.replace("/testing_projects/auth/sign-in/sign-in");
    }

}

async function loadFuelPrices() {
    const pmEl  = document.getElementById("pmsPrice");
    const agoEl = document.getElementById("agoPrice");
    if (!pmEl || !agoEl) return;

    try {
        const doc = await _AW.db.getDocument(_AW.DB_ID, "69d3ed400021197ed76e", "69d7db7ed8d5d2b73d66");
        pmEl.textContent  = doc.pmsPrice  != null ? Number(doc.pmsPrice).toLocaleString()  + " RWF" : "—";
        agoEl.textContent = doc.agoPrice  != null ? Number(doc.agoPrice).toLocaleString()  + " RWF" : "—";
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
    const currentPage = window.location.pathname.split("/").pop();
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

loadFuelPrices();
userAccess();
welcomeMessage();
checkPompisteSession();
initNavDropdowns();

// async function checkAccess() {
//     try {
//     const res = await fetch("https://api64.ipify.org?format=json");
//     const data = await res.json();
//     const ip = data.ip;

//         //List of allowed IPs/networks
//     const allowed = ["41.216.105.56", "41.186.132.111"];

//     if (!allowed.includes(ip)) {
//         document.body.innerHTML = "<h1>🚫 Access Denied</h1>";        
//     }
//     } catch (err) {
//     console.error("Failed to check access", err);
//     }
// }

// checkAccess();