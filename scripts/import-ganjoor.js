#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const GANJOOR_ROOT = process.env.GANJOOR_DATA_DIR || '/tmp/ganjoor-data';

const CATALOG = [
  {
    folder: '01-moulavi',
    slug: 'moulavi',
    books: [
      { file: '01-masnavi-daftar1.json', id: 'masnavi-daftar1', title: 'مثنوی معنوی - دفتر اول', cat: '/moulavi/masnavi/daftar1' },
      { file: '02-masnavi-daftar2.json', id: 'masnavi-daftar2', title: 'مثنوی معنوی - دفتر دوم', cat: '/moulavi/masnavi/daftar2' },
      { file: '03-masnavi-daftar3.json', id: 'masnavi-daftar3', title: 'مثنوی معنوی - دفتر سوم', cat: '/moulavi/masnavi/daftar3' },
      { file: '04-masnavi-daftar4.json', id: 'masnavi-daftar4', title: 'مثنوی معنوی - دفتر چهارم', cat: '/moulavi/masnavi/daftar4' },
      { file: '05-masnavi-daftar5.json', id: 'masnavi-daftar5', title: 'مثنوی معنوی - دفتر پنجم', cat: '/moulavi/masnavi/daftar5' },
      { file: '06-masnavi-daftar6.json', id: 'masnavi-daftar6', title: 'مثنوی معنوی - دفتر ششم', cat: '/moulavi/masnavi/daftar6' },
      { file: '07-divan-shams.json', id: 'divan-shams', title: 'غزلیات شمس', cat: '/moulavi/shams/ghazalsh' }
    ]
  },
  {
    folder: '02-hafez',
    slug: 'hafez',
    books: [
      { file: '01-ghazal.json', id: 'ghazal', title: 'غزلیات', cat: '/hafez/ghazal' },
      { file: '02-ghete.json', id: 'ghete', title: 'قطعات', cat: '/hafez/ghete' },
      { file: '03-ghaside.json', id: 'ghaside', title: 'قصاید', cat: '/hafez/ghaside' },
      { file: '04-robaee.json', id: 'robaee', title: 'رباعیات', cat: '/hafez/robaee2' },
      { file: '05-masnavi.json', id: 'masnavi', title: 'مثنوی', poems: ['/hafez/masnavi'] },
      { file: '06-saghiname.json', id: 'saghiname', title: 'ساقی‌نامه', poems: ['/hafez/saghiname'] }
    ]
  },
  {
    folder: '03-khayyam',
    slug: 'khayyam',
    books: [
      { file: '01-robaee.json', id: 'robaee', title: 'رباعیات', cat: '/khayyam/robaee' }
    ]
  },
  {
    folder: '04-saadi',
    slug: 'saadi',
    books: [
      { file: '01-ghazal.json', id: 'ghazal', title: 'غزلیات', cat: '/saadi/divan/ghazals' },
      { file: '02-boostan.json', id: 'boostan', title: 'بوستان', cat: '/saadi/boostan' }
    ]
  },
  {
    folder: '05-saeb',
    slug: 'saeb',
    books: [
      { file: '01-ghazal.json', id: 'ghazal', title: 'غزلیات', cat: '/saeb/divan-saeb/ghazalkasa' }
    ]
  },
  {
    folder: '06-attar',
    slug: 'attar',
    books: [
      { file: '01-ghazal.json', id: 'ghazal', title: 'غزلیات', cat: '/attar/divana/ghazal-attar' },
      { file: '02-manteghotteyr.json', id: 'manteghotteyr', title: 'منطق‌الطیر', cat: '/attar/manteghotteyr' }
    ]
  }
];

function ganjoorPath(fullUrl, suffix = '.json') {
  return path.join(GANJOOR_ROOT, 'poets', fullUrl.replace(/^\//, '') + suffix);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function collectPoemRefs(catUrl) {
  const cat = readJson(ganjoorPath(catUrl, '/_cat.json'));
  const poems = [];
  for (const poem of cat.Poems || []) {
    poems.push({ title: poem.Title, fullUrl: poem.FullUrl });
  }
  for (const child of cat.ChildCats || []) {
    poems.push(...collectPoemRefs(child.FullUrl));
  }
  return poems;
}

function versesToCouplets(verses) {
  if (!Array.isArray(verses)) return [];

  const byIndex = new Map();
  const centered = [];

  for (const verse of verses) {
    const text = verse.Text || '';
    const position = verse.Position;
    if (position === 'Right' || position === 'Left') {
      const index = verse.CoupletIndex;
      if (index == null) continue;
      if (!byIndex.has(index)) byIndex.set(index, ['', '']);
      const couplet = byIndex.get(index);
      if (position === 'Right') couplet[0] = text;
      else couplet[1] = text;
    } else if (position === 'Centered' || position === 'Single') {
      centered.push([text, '']);
    }
  }

  return [...byIndex.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, couplet]) => couplet)
    .concat(centered);
}

function sectionIdFromUrl(fullUrl, used) {
  const slug = fullUrl.split('/').filter(Boolean).pop();
  if (!used.has(slug)) {
    used.add(slug);
    return slug;
  }
  const fallback = fullUrl.replace(/^\//, '').replace(/\//g, '-');
  used.add(fallback);
  return fallback;
}

function convertPoem(ref, usedIds) {
  const poem = readJson(ganjoorPath(ref.fullUrl));
  const couplets = versesToCouplets(poem.Verses);
  if (couplets.length === 0) return null;
  return {
    id: sectionIdFromUrl(poem.FullUrl || ref.fullUrl, usedIds),
    title: poem.Title || ref.title,
    couplets
  };
}

function buildBook(poetInfo, bookSpec) {
  const usedIds = new Set();
  const refs = bookSpec.poems
    ? bookSpec.poems.map(fullUrl => ({ title: bookSpec.title, fullUrl }))
    : collectPoemRefs(bookSpec.cat);

  const sections = [];
  let skipped = 0;
  for (const ref of refs) {
    const section = convertPoem(ref, usedIds);
    if (!section) {
      skipped += 1;
      continue;
    }
    sections.push(section);
  }

  return {
    book: {
      id: bookSpec.id,
      title: bookSpec.title,
      poet: {
        id: poetInfo.slug,
        name: poetInfo.name
      },
      sections
    },
    sourceCount: refs.length,
    skipped
  };
}

function poetName(slug) {
  const poet = readJson(path.join(GANJOOR_ROOT, 'poets', slug, 'poet.json'));
  return poet.Nickname || poet.Name || slug;
}

function writeBook(folder, file, book) {
  const dir = path.join(DATA_DIR, folder);
  fs.mkdirSync(dir, { recursive: true });
  const target = path.join(dir, file);
  fs.writeFileSync(target, `${JSON.stringify(book, null, 2)}\n`);
  return target;
}

function cleanupPoetFolder(folder, keepFiles) {
  const dir = path.join(DATA_DIR, folder);
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith('.json')) continue;
    if (!keepFiles.has(name)) {
      fs.unlinkSync(path.join(dir, name));
      console.log(`  removed stale ${folder}/${name}`);
    }
  }
}

function main() {
  if (!fs.existsSync(path.join(GANJOOR_ROOT, 'poets'))) {
    throw new Error(`Ganjoor data not found at ${GANJOOR_ROOT}. Clone ganjoor/ganjoor-data first.`);
  }

  console.log(`Reading ganjoor data from ${GANJOOR_ROOT}`);

  for (const poetSpec of CATALOG) {
    const name = poetName(poetSpec.slug);
    const poetInfo = { slug: poetSpec.slug, name };
    const keepFiles = new Set(poetSpec.books.map(book => book.file));
    console.log(`\n${name} (${poetSpec.slug})`);

    for (const bookSpec of poetSpec.books) {
      const started = Date.now();
      const { book, sourceCount, skipped } = buildBook(poetInfo, bookSpec);
      writeBook(poetSpec.folder, bookSpec.file, book);
      console.log(
        `  ${bookSpec.id}: ${book.sections.length} poems` +
          (skipped ? ` (${skipped} skipped)` : '') +
          ` / ${sourceCount} source [${Date.now() - started}ms]`
      );
    }

    cleanupPoetFolder(poetSpec.folder, keepFiles);
  }

  const legacyMoulana = path.join(DATA_DIR, '01-moulana');
  if (fs.existsSync(legacyMoulana)) {
    fs.rmSync(legacyMoulana, { recursive: true, force: true });
    console.log('\nremoved data/01-moulana');
  }

  console.log('\nImport complete.');
}

main();
