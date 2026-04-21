// ── SHARED APPWRITE CLIENT ────────────────────────────────────
// Loaded once (after the Appwrite SDK, before any page script).
// Every page script references window._AW instead of creating
// its own client, so credentials live in exactly one place.
(function () {
  const client = new Appwrite.Client()
    .setEndpoint("https://cloud.appwrite.io/v1")
    .setProject("68a9b3e90029e6a10ff5");

  window._AW = {
    client,
    account:    new Appwrite.Account(client),
    db:         new Appwrite.Databases(client),
    teams:      new Appwrite.Teams(client),
    DB_ID:      "695f766c003a8dc2b3be",
    SERVER_URL: "https://testing-projects-4ttw.onrender.com/api",
  };
})();
