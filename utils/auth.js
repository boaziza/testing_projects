// utils/auth.js

// ── API FETCH ───────────────────────────────────────────────────────────────
// Wraps fetch() to the server URL and automatically includes the Appwrite JWT.
// This allows the backend to securely verify the user's identity.
window.apiFetch = async function apiFetch(endpoint, options = {}) {
  let jwt = null;
  try {
    // Attempt to generate a JWT from the active Appwrite session
    const jwtResponse = await window._AW.account.createJWT();
    jwt = jwtResponse.jwt;
  } catch (err) {
    console.warn("Could not create JWT. User may not be logged in.", err);
  }

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (jwt) {
    headers["Authorization"] = `Bearer ${jwt}`;
  }

  const url = `${window._AW.SERVER_URL}${endpoint}`;
  
  return fetch(url, {
    ...options,
    headers,
  });
};

// ── REQUIRE AUTH ────────────────────────────────────────────────────────────
// Checks if the user is logged in, fetches their role, and ensures they
// have permission to view the current page. If not, redirects to Sign In.
window.requireAuth = async function requireAuth(options = {}) {
  const allowedRoles = options.roles || [];
  
  try {
    // 1. Verify Appwrite session exists
    const user = await window._AW.account.get();
    
    // 2. Fetch teams to determine role
    const teamsResponse = await window._AW.teams.list();
    const teamNames = teamsResponse.teams.map(t => t.name.toLowerCase());
    
    // Determine the user's role (Owner > Manager > Pompiste)
    let role = "manager"; // Default
    if (teamNames.includes("managers") || teamNames.includes("manager")) {
      role = "manager";
    } else if (teamNames.includes("admin") || teamNames.includes("owner")) {
      role = "owner";
    }

    // 3. Check role against allowed roles for this page
    if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
      console.warn(`Access denied. Role '${role}' not in allowed roles:`, allowedRoles);
      window.location.replace(window._AW.SIGNIN_URL);
      return null;
    }
    
    // 4. Construct profile object
    // Station ID is typically saved in the user's Appwrite preferences
    const stationId = user.prefs && user.prefs.stationId ? user.prefs.stationId : null;

    const profile = {
      userId: user.$id,
      role: role,
      name: user.name,
      email: user.email,
      stationId: stationId,
      prefs: user.prefs || {}
    };
    
    // Cache it globally for other scripts to use synchronously
    window._SESSION = { profile };
    
    return profile;

  } catch (err) {
    console.error("Auth verification failed:", err);
    // Redirect to login if unauthenticated or network error
    window.location.replace(window._AW.SIGNIN_URL);
    return null;
  }
};
