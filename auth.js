const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { get, run } = require('./db');

const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL = 'http://localhost:5000/auth/google/callback'
} = process.env;

const isGoogleConfigured = Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);

if (!isGoogleConfigured) {
  console.warn(
    'Google OAuth credentials are not set. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable login.'
  );
} else {
  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: GOOGLE_CALLBACK_URL
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const googleId = profile.id;
          const primaryEmail =
            (profile.emails && profile.emails.length > 0 && profile.emails[0].value) || null;

          if (!primaryEmail) {
            done(new Error('Google profile did not include an email address.'));
            return;
          }

          const email = primaryEmail.toLowerCase();

          let user =
            (await get('SELECT * FROM users WHERE google_id = ? OR email = ?', [
              googleId,
              email
            ])) || null;

          if (user) {
            if (!user.google_id) {
              await run('UPDATE users SET google_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
                googleId,
                user.id
              ]);
            }
          } else {
            const result = await run(
              'INSERT INTO users (google_id, email) VALUES (?, ?)',
              [googleId, email]
            );
            user = await get('SELECT * FROM users WHERE id = ?', [result.lastID]);
          }

          done(null, user);
        } catch (err) {
          done(err);
        }
      }
    )
  );
}

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
  ensureAuthenticated,
  isGoogleConfigured
};


