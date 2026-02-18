require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const jalaali = require('jalaali-js');
const database = require('./db');
const { passport, ensureAuthenticated } = require('./auth');
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
      // Extract poet ID from directory name (remove numeric prefix like "01-")
      const poetId = poetFolder.replace(/^\d+-/, '');
      poets.push({
        id: poetId,
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

// Meditation Tracker Routes - MUST come before dynamic routes

// Helper function to get month data (used by both SSR and API)
async function getMonthData(year, month, userId) {
  // Get first day of Jalali month in Gregorian
  const firstDayGregorian = jalaali.toGregorian(year, month, 1);
  const startDate = new Date(firstDayGregorian.gy, firstDayGregorian.gm - 1, firstDayGregorian.gd);
  
  // Get last day of Jalali month
  let lastDay;
  if (month <= 6) {
    lastDay = 31;
  } else if (month <= 11) {
    lastDay = 30;
  } else {
    lastDay = jalaali.isLeapJalaaliYear(year) ? 30 : 29;
  }
  const lastDayGregorian = jalaali.toGregorian(year, month, lastDay);
  const endDate = new Date(lastDayGregorian.gy, lastDayGregorian.gm - 1, lastDayGregorian.gd);
  
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];
  const todayStr = new Date().toISOString().split('T')[0];
  
  // Get all logs for this month
  const logs = await all(
    `SELECT user_id, log_date, note, created_at 
     FROM meditation_logs 
     WHERE log_date >= ? AND log_date <= ?`,
    [startDateStr, endDateStr]
  );
  
  // Get all users
  const users = await all('SELECT id, display_name FROM users');
  
  // Build day data
  const days = [];
  const todayJDate = jalaali.toJalaali(new Date());
  const isCurrentMonth = todayJDate.jy === year && todayJDate.jm === month;
  
  for (let day = 1; day <= lastDay; day++) {
    const dayGregorian = jalaali.toGregorian(year, month, day);
    const dayDate = new Date(dayGregorian.gy, dayGregorian.gm - 1, dayGregorian.gd);
    const dateStr = dayDate.toISOString().split('T')[0];
    
    const dayLogs = logs.filter(l => l.log_date === dateStr);
    const myLog = dayLogs.find(l => l.user_id === userId);
    const friendLog = dayLogs.find(l => l.user_id !== userId);
    
    const isToday = dateStr === todayStr;
    
    days.push({
      day,
      date: dateStr,
      hasMyLog: !!myLog,
      hasFriendLog: !!friendLog,
      myLog: myLog ? {
        userId: myLog.user_id,
        note: myLog.note,
        createdAt: myLog.created_at
      } : null,
      friendLog: friendLog ? {
        userId: friendLog.user_id,
        note: friendLog.note,
        createdAt: friendLog.created_at
      } : null,
      isToday
    });
  }
  
  return {
    year,
    month,
    days,
    users: users.map(u => ({ id: u.id, displayName: u.display_name })),
    today: isCurrentMonth ? {
      date: todayStr,
      hasMyLog: !!logs.find(l => l.log_date === todayStr && l.user_id === userId),
      hasFriendLog: !!logs.find(l => l.log_date === todayStr && l.user_id !== userId),
      day: todayJDate.jd
    } : null,
    todayJalali: isCurrentMonth ? { year: todayJDate.jy, month: todayJDate.jm, day: todayJDate.jd } : null
  };
}

// Helper functions for EJS templates
function toPersianDigits(num) {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return num.toString().replace(/\d/g, d => persianDigits[parseInt(d)]);
}

function getMonthName(month) {
  const names = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
  return names[month - 1];
}

// GET /meditation - Calendar page (SSR)
app.get('/meditation', ensureAuthenticated, async (req, res, next) => {
  try {
    const now = new Date();
    const jDate = jalaali.toJalaali(now);
    const data = await getMonthData(jDate.jy, jDate.jm, req.user.id);
    
    res.render('meditation/index', { 
      currentUser: req.user,
      initialData: data,
      currentYear: jDate.jy,
      currentMonth: jDate.jm,
      toPersianDigits,
      getMonthName
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/meditation/current - Get current Jalali month info
app.get('/api/meditation/current', ensureAuthenticated, (req, res) => {
  const now = new Date();
  const jDate = jalaali.toJalaali(now);
  res.json({ year: jDate.jy, month: jDate.jm });
});

// GET /api/meditation/:year/:month - Get month data
app.get('/api/meditation/:year/:month', ensureAuthenticated, async (req, res, next) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    const data = await getMonthData(year, month, req.user.id);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// POST /api/meditation - Log today
app.post('/api/meditation', ensureAuthenticated, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const todayStr = new Date().toISOString().split('T')[0];
    const note = req.body.note ? req.body.note.trim().slice(0, 140) : null;
    
    await run(
      `INSERT OR REPLACE INTO meditation_logs (user_id, log_date, note) VALUES (?, ?, ?)`,
      [userId, todayStr, note]
    );
    
    res.status(201).json({ success: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/meditation/:date - Remove log
app.delete('/api/meditation/:date', ensureAuthenticated, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const date = req.params.date;
    
    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date format' });
    }
    
    await run(
      `DELETE FROM meditation_logs WHERE user_id = ? AND log_date = ?`,
      [userId, date]
    );
    
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Dynamic poetry routes come AFTER meditation routes
app.get('/:poetId/:bookId', (req, res) => {
  const { poetId, bookId } = req.params;
  const data = loadPoems();

  const poet = data.poets.find(p => p.id === poetId);
  if (!poet) {
    return res.status(404).render('404', { currentPath: null });
  }

  const book = poet.books.find(b => b.id === bookId);
  if (!book) {
    return res.status(404).render('404', { currentPath: null });
  }

  const pageSize = 30;
  const sections = book.sections.slice(0, pageSize);
  const totalSections = book.sections.length;

  res.render('book', { poet, book, sections, totalSections });
});

// API endpoint for paginated book sections
app.get('/api/books/:poetId/:bookId/sections', (req, res) => {
  const { poetId, bookId } = req.params;
  const page = parseInt(req.query.page, 10) || 1;
  const pageSize = 30;
  const data = loadPoems();

  const poet = data.poets.find(p => p.id === poetId);
  if (!poet) {
    return res.status(404).json({ error: 'Poet not found' });
  }

  const book = poet.books.find(b => b.id === bookId);
  if (!book) {
    return res.status(404).json({ error: 'Book not found' });
  }

  const startIndex = (page - 1) * pageSize;
  const sections = book.sections.slice(startIndex, startIndex + pageSize);
  const hasMore = startIndex + pageSize < book.sections.length;

  res.json({
    sections,
    page,
    hasMore,
    total: book.sections.length
  });
});

app.get('/:poetId/:bookId/:sectionId', (req, res) => {
  const { poetId, bookId, sectionId } = req.params;
  const data = loadPoems();
  
  const poet = data.poets.find(p => p.id === poetId);
  if (!poet) {
    return res.status(404).render('404', { currentPath: null });
  }
  
  const book = poet.books.find(b => b.id === bookId);
  if (!book) {
    return res.status(404).render('404', { currentPath: null });
  }
  
  const section = book.sections.find(s => s.id === sectionId);
  if (!section) {
    return res.status(404).render('404', { currentPath: null });
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
