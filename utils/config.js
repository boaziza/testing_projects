// ── SHARED APPWRITE CLIENT ────────────────────────────────────
(function () {
  const client = new Appwrite.Client()
    .setEndpoint("https://fra.cloud.appwrite.io/v1")
    .setProject("69de2ba3003855a6c17c");

  const BASE = "/testing_projects";

  window._AW = {
    client,
    account:    new Appwrite.Account(client),
    db:         new Appwrite.Databases(client),
    teams:      new Appwrite.Teams(client),
    SERVER_URL: "http://localhost:4000/api",
    DB_ID:       "69e77d2b0033b9fde4a3",

    SIGNIN_URL:            `${BASE}/auth/sign-in/sign-in`,
    SIGNUP_URL:            `${BASE}/auth/sign-up/sign-up`,
    FIRST_LOGIN_URL:       `${BASE}/auth/first-login/first-login`,
    OWNER_DASHBOARD_URL:   `${BASE}/portal/dashboard`,
    MANAGER_DASHBOARD_URL: `${BASE}/portal/dashboard`,
    POMPISTE_URL:          `${BASE}/pompiste/index`,
  };
})();
