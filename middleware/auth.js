function requireLogin(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Απαιτείται σύνδεση' });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Απαιτείται σύνδεση' });
  if (req.session.role !== 'admin') return res.status(403).json({ error: 'Μόνο για διαχειριστές' });
  next();
}

module.exports = { requireLogin, requireAdmin };
