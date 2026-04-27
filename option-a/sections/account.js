(function () {

  const SETTINGS_ID = "69d3ed400021197ed76e";

  window._sections.account = async function loadAccount() {
    const { state, apiFetch } = window._dash;
    const { profile, station } = state;

    // ── Profile ────────────────────────────────────────────────────────────────
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || "—"; };
    set("acct-name",  profile.name);
    set("acct-email", profile.email);
    set("acct-role",  profile.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : "—");

    // ── Station info ───────────────────────────────────────────────────────────
    set("acct-station", station?.name);

    try {
      const settRes = await _AW.db.listDocuments(_AW.DB_ID, SETTINGS_ID);
      if (settRes.documents.length > 0) {
        const doc = settRes.documents[0];
        set("acct-pms",  doc.pmsPrice       != null ? Number(doc.pmsPrice).toLocaleString()  + " RWF/L" : "—");
        set("acct-ago",  doc.agoPrice        != null ? Number(doc.agoPrice).toLocaleString()  + " RWF/L" : "—");
        set("acct-momo", doc.momoFeePercent  != null ? doc.momoFeePercent + "%" : "—");
      }
    } catch {}
  };

  // ── Password change ────────────────────────────────────────────────────────
  async function changePwd() {
    const { toast } = window._dash;
    const current = document.getElementById("mgrCurrentPwd")?.value.trim();
    const pwd     = document.getElementById("mgrNewPwd")?.value.trim();
    const confirm = document.getElementById("mgrConfirmPwd")?.value.trim();

    if (!current)        { toast("Enter your current password.", "warning"); return; }
    if (pwd.length < 8)  { toast("New password must be at least 8 characters.", "warning"); return; }
    if (pwd !== confirm)  { toast("Passwords do not match.", "warning"); return; }

    try {
      await _AW.account.updatePassword(pwd, current);
      toast("Password changed successfully.", "success");
      ["mgrCurrentPwd", "mgrNewPwd", "mgrConfirmPwd"].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = "";
      });
    } catch (err) {
      toast(err.message || "Password change failed.", "error");
    }
  }

  document.getElementById("mgrChangePwdBtn")?.addEventListener("click", changePwd);

})();
