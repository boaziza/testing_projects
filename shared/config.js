// ── SHARED APPWRITE CLIENT ────────────────────────────────────
(function () {
  const client = new Appwrite.Client()
    .setEndpoint("https://fra.cloud.appwrite.io/v1")
    .setProject("69de2ba3003855a6c17c");

  const BASE = "/testing_projects";

  window._AW = {
    client,
    account:    new Appwrite.Account(client),
    SERVER_URL: "http://localhost:4000/api",

    SIGNIN_URL:            `${BASE}/auth/sign-in`,
    SIGNUP_URL:            `${BASE}/auth/sign-up`,
    FIRST_LOGIN_URL:       `${BASE}/auth/first-login`,
    OWNER_DASHBOARD_URL:   `${BASE}/portal/dashboard`,
    MANAGER_DASHBOARD_URL: `${BASE}/portal/dashboard`,
    POMPISTE_URL:          `${BASE}/pompiste/index`,
  };
})();
