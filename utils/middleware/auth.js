const { Client, Account } = require('node-appwrite');
const { db, Query } = require('../appwrite');

async function verifyJWT(req, res, next) {
  const jwt = req.headers.authorization?.replace('Bearer ', '').trim();
  if (!jwt) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const jwtClient = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setJWT(jwt);

    const account = await new Account(jwtClient).get();

    // prefs.role is the fast path; fall back to the users collection
    let role      = account.prefs?.role      || null;
    let companyId = account.prefs?.companyId || null;
    let stationId = account.prefs?.stationId || null;

    if (!role && process.env.APPWRITE_USERS_ID) {
      try {
        const lookup = await db.listDocuments(
          process.env.APPWRITE_DATABASE_ID,
          process.env.APPWRITE_USERS_ID,
          [Query.equal('userId', account.$id), Query.limit(1)]
        );
        if (lookup.documents.length > 0) {
          const u = lookup.documents[0];
          role      = u.role      || 'pompiste';
          companyId = u.companyId || companyId;
          stationId = u.stationId || stationId;
        }
      } catch {}
    }

    req.user = {
      $id:      account.$id,
      email:    account.email,
      name:     account.name,
      role:     role || 'pompiste',
      companyId,
      stationId,
    };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireRole(roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

module.exports = { verifyJWT, requireRole };
