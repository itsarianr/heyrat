const passport = require('passport');
const { get, run } = require('./db');

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await get('SELECT * FROM users WHERE id = ?', [id]);
    done(null, user || false);
  } catch (err) {
    done(err);
  }
});

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  if (req.originalUrl && req.originalUrl.startsWith('/api/')) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  if (req.session && !req.session.returnTo) {
    if (req.method === 'GET' && req.originalUrl && req.originalUrl.startsWith('/')) {
      req.session.returnTo = req.originalUrl;
    } else if (req.headers.referer) {
      try {
        const refererUrl = new URL(req.headers.referer);
        req.session.returnTo = refererUrl.pathname + refererUrl.search;
      } catch (err) {
        req.session.returnTo = '/';
      }
    } else {
      req.session.returnTo = '/';
    }
  }
  res.redirect('/auth/login');
}

module.exports = {
  passport,
  ensureAuthenticated
};
