(function () {

  // Manager's password change (static form — no data to load on nav)
  window._sections.account = function loadAccount() {};

  async function changePwd() {
    const { toast, apiFetch, state } = window._dash;
    const pwd     = document.getElementById("mgrNewPwd")?.value.trim();
    const confirm = document.getElementById("mgrConfirmPwd")?.value.trim();
    if (pwd.length < 8)  { toast("Password must be at least 8 characters.", "warning"); return; }
    if (pwd !== confirm) { toast("Passwords do not match.", "warning"); return; }
    try {
      const res = await apiFetch(`/users/${state.profile.$id}/password`, {
        method: "PATCH",
        body:   JSON.stringify({ password: pwd }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast("Password changed successfully.", "success");
      if (document.getElementById("mgrNewPwd")) document.getElementById("mgrNewPwd").value = "";
      if (document.getElementById("mgrConfirmPwd")) document.getElementById("mgrConfirmPwd").value = "";
    } catch (err) {
      toast(err.message || "Password change failed.", "error");
    }
  }

  document.getElementById("mgrChangePwdBtn")?.addEventListener("click", changePwd);

})();
