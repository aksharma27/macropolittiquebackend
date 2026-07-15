export function requireAuth(req, res, next) {
  if (!req.session || !req.session?.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.session || !req.session?.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  if (req.session.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: admin only' });
  }
  next();
}

export function attachUserFromSession (req, res, next) {
  if (req.session && req.session.userId) {
    req.user = {
      id: req.session.userId,
      role: req.session.role,
      // add other fields if you store them in session
    };
  }
  else {
    req.user = null;
  }
  next();
}