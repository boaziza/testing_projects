(function () {

  const _IDX_ID = "68cd1987002bae34ea4b";
  const _PAY_ID = "68cd19990006cbb33843";

  window._sections.history = async function loadHistory() {
    const { fmt, state } = window._dash;
    const listEl = document.getElementById("historyList");

    try {
      const email = state.profile.email;

      const [idxRes, payRes] = await Promise.all([
        _AW.db.listDocuments(_AW.DB_ID, _IDX_ID, [
          Appwrite.Query.equal("email", email),
          Appwrite.Query.orderDesc("logDate"),
          Appwrite.Query.limit(50),
        ]),
        _AW.db.listDocuments(_AW.DB_ID, _PAY_ID, [
          Appwrite.Query.equal("email", email),
          Appwrite.Query.orderDesc("logDate"),
          Appwrite.Query.limit(50),
        ]),
      ]);

      if (idxRes.documents.length === 0) {
        if (listEl) listEl.innerHTML = '<div class="history-empty">No shifts recorded yet.</div>';
        return;
      }

      const payMap = {};
      payRes.documents.forEach(p => { if (p.id) payMap[p.id] = p; });

      listEl.innerHTML = idxRes.documents.map(doc => {
        const pay       = doc.id ? payMap[doc.id] : null;
        const gain      = pay ? Number(pay.gainPayments) : null;
        const gainText  = gain !== null ? `${gain >= 0 ? "+" : ""}${fmt(gain)} RWF` : "—";
        const gainClass = gain === null ? "" : gain >= 0 ? "gain" : "loss";
        const dateStr   = String(doc.logDate || "").substring(0, 10);
        const d         = new Date(dateStr + "T00:00:00");
        const dateLabel = isNaN(d.getTime())
          ? dateStr
          : d.toLocaleString("default", { day: "numeric", month: "short", year: "numeric" });

        return `
          <div class="history-row">
            <div class="history-cell"><div class="history-date-main">${dateLabel}</div></div>
            <div class="history-cell">
              <span class="shift-badge shift-${(doc.shift || "").toLowerCase()}">${doc.shift || "—"}</span>
            </div>
            <div class="history-cell align-right">${fmt(doc.totalVente)} RWF</div>
            <div class="history-cell align-right">${pay ? fmt(pay.totalPayments) + " RWF" : "—"}</div>
            <div class="history-cell align-right ${gainClass}">${gainText}</div>
          </div>`;
      }).join("");

    } catch {
      if (listEl) listEl.innerHTML = '<div class="history-empty">Could not load history. Please try again.</div>';
    }
  };

})();
