require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const database = require('./db');
const { passport, ensureAuthenticated, isGoogleConfigured } = require('./auth');
const { run, get, all } = database;

const app = express();
const PORT = process.env.PORT || 5000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const SESSION_SECRET = process.env.SESSION_SECRET || 'heyrat-dev-secret';

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  res.locals.currentUser = req.user || null;
  res.locals.isGoogleConfigured = isGoogleConfigured;
  next();
});

function loadPoems() {
  const dataPath = path.join(__dirname, 'data');
  const poets = [];
  
  const poetFolders = fs.readdirSync(dataPath, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
  
  for (const poetFolder of poetFolders) {
    const poetPath = path.join(dataPath, poetFolder);
    const bookFiles = fs.readdirSync(poetPath)
      .filter(file => file.endsWith('.json'));
    
    const books = bookFiles.map(bookFile => {
      const bookPath = path.join(poetPath, bookFile);
      const bookData = JSON.parse(fs.readFileSync(bookPath, 'utf-8'));
      return bookData;
    });
    
    if (books.length > 0) {
      poets.push({
        id: poetFolder,
        name: books[0].poet.name,
        books: books
      });
    }
  }
  
  return { poets };
}

function getSectionData(poetId, bookId, sectionId) {
  const data = loadPoems();

  const poet = data.poets.find(p => p.id === poetId);
  if (!poet) {
    return null;
  }

  const book = poet.books.find(b => b.id === bookId);
  if (!book) {
    return null;
  }

  if (typeof sectionId === 'undefined') {
    return { poet, book, section: null };
  }

  const section = book.sections.find(s => s.id === sectionId);
  if (!section) {
    return null;
  }

  return { poet, book, section };
}

app.get('/', (req, res) => {
  const data = loadPoems();
  res.render('index', { data, currentPath: '/' });
});

app.get('/auth/login', (req, res) => {
  res.render('auth/login', {
    errors: [],
    values: { email: '' }
  });
});

app.post('/auth/login', async (req, res, next) => {
  try {
    const emailRaw = (req.body.email || '').trim();
    const email = emailRaw.toLowerCase();
    const errors = [];

    if (!emailRaw) {
      errors.push('لطفاً ایمیل خود را وارد کنید.');
    } else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      errors.push('فرمت ایمیل معتبر نیست.');
    }

    if (errors.length > 0) {
      res.status(422).render('auth/login', {
        errors,
        values: { email: emailRaw }
      });
      return;
    }

    let user = await get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      const insert = await run('INSERT INTO users (email) VALUES (?)', [email]);
      user = await get('SELECT * FROM users WHERE id = ?', [insert.lastID]);
    }

    req.login(user, err => {
      if (err) {
        next(err);
        return;
      }

      const needsDisplayName = !user.display_name;
      if (needsDisplayName && !req.session.returnTo) {
        req.session.returnTo = '/';
      }

      if (needsDisplayName) {
        res.redirect('/profile/display-name');
        return;
      }

      const redirectTo = req.session.returnTo || '/';
      delete req.session.returnTo;
      res.redirect(redirectTo);
    });
  } catch (err) {
    next(err);
  }
});

if (isGoogleConfigured) {
  app.get(
    '/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
  );

  app.get(
    '/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/auth/login' }),
    (req, res) => {
      if (!req.user || !req.user.display_name) {
        if (!req.session.returnTo) {
          req.session.returnTo = '/';
        }
        res.redirect('/profile/display-name');
        return;
      }
      const redirectTo = req.session.returnTo || '/';
      delete req.session.returnTo;
      res.redirect(redirectTo);
    }
  );
}

app.post('/auth/logout', (req, res, next) => {
  req.logout(err => {
    if (err) {
      next(err);
      return;
    }
    res.redirect('/');
  });
});

app.get('/profile/display-name', ensureAuthenticated, (req, res) => {
  res.render('auth/display-name', {
    errors: [],
    values: { displayName: '' },
    hasDisplayName: Boolean(req.user.display_name),
    currentPath: '/profile/display-name'
  });
});

app.post('/profile/display-name', ensureAuthenticated, async (req, res, next) => {
  try {
    const displayName = (req.body.displayName || '').trim();
    const errors = [];

    if (!displayName) {
      errors.push('نام نمایشی نمی‌تواند خالی باشد.');
    } else if (displayName.length < 2) {
      errors.push('نام نمایشی باید حداقل دو حرف باشد.');
    } else if (displayName.length > 40) {
      errors.push('نام نمایشی حداکثر می‌تواند ۴۰ حرف باشد.');
    } else {
      const existing = await get(
        'SELECT id FROM users WHERE display_name = ? COLLATE NOCASE',
        [displayName]
      );
      if (existing && existing.id !== req.user.id) {
        errors.push('این نام نمایشی قبلاً استفاده شده است.');
      }
    }

    if (errors.length > 0) {
      res.status(422).render('auth/display-name', {
        errors,
        values: { displayName },
        hasDisplayName: Boolean(req.user.display_name),
        currentPath: '/profile/display-name'
      });
      return;
    }

    await run(
      'UPDATE users SET display_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [displayName, req.user.id]
    );

    req.user.display_name = displayName;

    const redirectTo = req.session.returnTo || '/';
    delete req.session.returnTo;

    res.redirect(redirectTo);
  } catch (err) {
    next(err);
  }
});

app.post('/api/posts', ensureAuthenticated, async (req, res, next) => {
  try {
    if (!req.user.display_name) {
      res.status(409).json({
        error: 'برای ساخت نوشته ابتدا نام نمایشی خود را کامل کنید.',
        redirect: '/profile/display-name'
      });
      return;
    }

    const { poetId, bookId, sectionId, body = '', couplets } = req.body || {};

    if (!poetId || !bookId || !sectionId) {
      res.status(400).json({ error: 'شناسهٔ شعر نامعتبر است.' });
      return;
    }

    if (!Array.isArray(couplets) || couplets.length === 0) {
      res.status(400).json({ error: 'حداقل یک بیت باید انتخاب شود.' });
      return;
    }

    const sectionData = getSectionData(poetId, bookId, sectionId);
    if (!sectionData || !sectionData.section) {
      res.status(404).json({ error: 'شعر انتخاب‌شده در سایت یافت نشد.' });
      return;
    }

    const { poet, book, section } = sectionData;
    const seenIndexes = new Set();
    const validCouplets = [];

    couplets.forEach(item => {
      const rawIndex = item?.coupletIndex;
      const parsedIndex = Number.isInteger(rawIndex) ? rawIndex : parseInt(rawIndex, 10);
      if (Number.isNaN(parsedIndex) || parsedIndex < 0 || parsedIndex >= section.couplets.length) {
        return;
      }
      if (seenIndexes.has(parsedIndex)) {
        return;
      }
      seenIndexes.add(parsedIndex);

      const verses = section.couplets[parsedIndex] || [];
      validCouplets.push({
        coupletIndex: parsedIndex,
        verseFirst: Array.isArray(verses) && verses[0] ? String(verses[0]) : '',
        verseSecond: Array.isArray(verses) && verses[1] ? String(verses[1]) : ''
      });
    });

    if (validCouplets.length === 0) {
      res.status(400).json({ error: 'انتخاب ابیات معتبر نبود.' });
      return;
    }

    const cleanedBody = typeof body === 'string' ? body.trim() : '';
    const truncatedBody = cleanedBody.slice(0, 280);
    const postBody = truncatedBody.length > 0 ? truncatedBody : null;

    await run('BEGIN');
    try {
      const insertResult = await run(
        `
          INSERT INTO posts (
            user_id,
            poet_id,
            book_id,
            section_id,
            poet_name,
            book_title,
            section_title,
            body
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          req.user.id,
          poetId,
          bookId,
          sectionId,
          poet.name,
          book.title,
          section.title,
          postBody
        ]
      );

      const postId = insertResult.lastID;

      for (const couplet of validCouplets) {
        await run(
          `
            INSERT INTO post_couplets (
              post_id,
              couplet_index,
              verse_first,
              verse_second
            )
            VALUES (?, ?, ?, ?)
          `,
          [postId, couplet.coupletIndex, couplet.verseFirst, couplet.verseSecond]
        );
      }

      await run('COMMIT');

      res.status(201).json({
        id: postId,
        feedUrl: '/feed'
      });
    } catch (innerErr) {
      await run('ROLLBACK');
      throw innerErr;
    }
  } catch (err) {
    next(err);
  }
});

app.get('/feed', async (req, res, next) => {
  try {
    const currentUserId = req.user ? req.user.id : -1;

    const posts = await all(
      `
        SELECT
          posts.id,
          posts.body,
          posts.created_at,
          posts.poet_id,
          posts.book_id,
          posts.section_id,
          posts.poet_name,
          posts.book_title,
          posts.section_title,
          users.display_name,
          users.email,
          (
            SELECT COUNT(*)
            FROM likes
            WHERE likes.post_id = posts.id
          ) AS like_count,
          EXISTS(
            SELECT 1
            FROM likes
            WHERE likes.post_id = posts.id AND likes.user_id = ?
          ) AS is_liked
        FROM posts
        INNER JOIN users ON users.id = posts.user_id
        ORDER BY posts.created_at DESC
        LIMIT 100
      `,
      [currentUserId]
    );

    const postIds = posts.map(post => post.id);
    const coupletsByPost = {};

    if (postIds.length > 0) {
      const placeholders = postIds.map(() => '?').join(',');
      const coupletRows = await all(
        `
          SELECT
            post_id,
            couplet_index,
            verse_first,
            verse_second
          FROM post_couplets
          WHERE post_id IN (${placeholders})
          ORDER BY couplet_index ASC
        `,
        postIds
      );

      coupletRows.forEach(row => {
        if (!coupletsByPost[row.post_id]) {
          coupletsByPost[row.post_id] = [];
        }
        coupletsByPost[row.post_id].push({
          verse_first: row.verse_first,
          verse_second: row.verse_second,
          couplet_index: row.couplet_index
        });
      });
    }

    function toPersianDigits(num) {
      const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
      return num.toString().replace(/\d/g, (digit) => persianDigits[parseInt(digit)]);
    }

    function formatRelativeTime(date) {
      const now = new Date();
      let postDate;
      
      // Handle SQLite datetime string format (YYYY-MM-DD HH:MM:SS)
      if (typeof date === 'string') {
        // SQLite datetime format
        postDate = new Date(date.replace(' ', 'T'));
      } else {
        postDate = new Date(date);
      }
      
      // Check if date is valid
      if (isNaN(postDate.getTime())) {
        return 'تاریخ نامعتبر';
      }
      
      const diffMs = now - postDate;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) {
        return 'همین الان';
      } else if (diffMins < 60) {
        return `${toPersianDigits(diffMins)} دقیقه قبل`;
      } else if (diffHours < 24) {
        return `${toPersianDigits(diffHours)} ساعت قبل`;
      } else if (diffDays === 1) {
        return 'دیروز';
      } else if (diffDays < 7) {
        return `${toPersianDigits(diffDays)} روز قبل`;
      } else {
        const dateFormatter = new Intl.DateTimeFormat('fa-IR', {
          dateStyle: 'medium'
        });
        return dateFormatter.format(postDate);
      }
    }

    const feedPosts = posts.map(post => ({
      ...post,
      like_count: Number(post.like_count) || 0,
      is_liked: Boolean(post.is_liked),
      couplets: coupletsByPost[post.id] || [],
      createdAtFormatted: formatRelativeTime(post.created_at)
    }));

    res.render('feed', { posts: feedPosts, currentPath: '/feed' });
  } catch (err) {
    next(err);
  }
});

app.post('/api/posts/:postId/likes', ensureAuthenticated, async (req, res, next) => {
  try {
    const postId = Number.parseInt(req.params.postId, 10);
    if (Number.isNaN(postId)) {
      res.status(400).json({ error: 'شناسهٔ نوشته نامعتبر است.' });
      return;
    }

    const post = await get('SELECT id FROM posts WHERE id = ?', [postId]);
    if (!post) {
      res.status(404).json({ error: 'نوشته یافت نشد.' });
      return;
    }

    await run('INSERT OR IGNORE INTO likes (post_id, user_id) VALUES (?, ?)', [
      postId,
      req.user.id
    ]);

    const count = await get('SELECT COUNT(*) AS count FROM likes WHERE post_id = ?', [postId]);

    res.json({
      likeCount: Number(count?.count || 0),
      liked: true
    });
  } catch (err) {
    next(err);
  }
});

app.delete('/api/posts/:postId/likes', ensureAuthenticated, async (req, res, next) => {
  try {
    const postId = Number.parseInt(req.params.postId, 10);
    if (Number.isNaN(postId)) {
      res.status(400).json({ error: 'شناسهٔ نوشته نامعتبر است.' });
      return;
    }

    const post = await get('SELECT id FROM posts WHERE id = ?', [postId]);
    if (!post) {
      res.status(404).json({ error: 'نوشته یافت نشد.' });
      return;
    }

    await run('DELETE FROM likes WHERE post_id = ? AND user_id = ?', [postId, req.user.id]);

    const count = await get('SELECT COUNT(*) AS count FROM likes WHERE post_id = ?', [postId]);

    res.json({
      likeCount: Number(count?.count || 0),
      liked: false
    });
  } catch (err) {
    next(err);
  }
});

app.get('/favorites', (req, res) => {
  res.render('favorites', { currentPath: '/favorites' });
});

app.get('/sitemap.xml', (req, res) => {
  // Sitemap should always point to the canonical production domain
  const baseUrl = 'https://heyraan.com';

  const urls = [
    { path: '/', changefreq: 'daily', priority: '1.0' },
    { path: '/feed', changefreq: 'hourly', priority: '0.8' },
    { path: '/favorites', changefreq: 'weekly', priority: '0.6' },
    { path: '/auth/login', changefreq: 'monthly', priority: '0.4' },
    { path: '/profile/display-name', changefreq: 'monthly', priority: '0.4' }
  ];

  const data = loadPoems();

  data.poets.forEach(poet => {
    poet.books.forEach(book => {
      urls.push({
        path: `/${poet.id}/${book.id}`,
        changefreq: 'weekly',
        priority: '0.7'
      });

      book.sections.forEach(section => {
        urls.push({
          path: `/${poet.id}/${book.id}/${section.id}`,
          changefreq: 'weekly',
          priority: '0.6'
        });
      });
    });
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map(
      url => `  <url>
    <loc>${baseUrl}${url.path}</loc>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`
    )
    .join('\n')}\n</urlset>\n`;

  res.header('Content-Type', 'application/xml');
  res.send(xml);
});

app.get('/:poetId/:bookId', (req, res) => {
  const { poetId, bookId } = req.params;
  const data = loadPoems();

  const poet = data.poets.find(p => p.id === poetId);
  if (!poet) {
    return res.status(404).send('شاعر یافت نشد');
  }

  const book = poet.books.find(b => b.id === bookId);
  if (!book) {
    return res.status(404).send('کتاب یافت نشد');
  }

  res.render('book', { poet, book });
});

app.get('/:poetId/:bookId/:sectionId', (req, res) => {
  const { poetId, bookId, sectionId } = req.params;
  const data = loadPoems();
  
  const poet = data.poets.find(p => p.id === poetId);
  if (!poet) {
    return res.status(404).send('شاعر یافت نشد');
  }
  
  const book = poet.books.find(b => b.id === bookId);
  if (!book) {
    return res.status(404).send('کتاب یافت نشد');
  }
  
  const section = book.sections.find(s => s.id === sectionId);
  if (!section) {
    return res.status(404).send('بخش یافت نشد');
  }
  
  res.render('poem', { poet, book, section });
});

// 404 handler - keep last, after all routes
app.use((req, res) => {
  res.status(404).render('404', { currentPath: null });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Heyran server running on port ${PORT}`);
});
