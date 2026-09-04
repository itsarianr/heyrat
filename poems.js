const path = require('path');
const fs = require('fs');

const POET_ALIASES = {
  moulana: 'moulavi'
};

function canonicalPoetId(poetId) {
  return POET_ALIASES[poetId] || poetId;
}

function canonicalSectionId(sectionId) {
  if (typeof sectionId !== 'string') return sectionId;
  const match = /^section(\d+)$/.exec(sectionId);
  return match ? `sh${match[1]}` : sectionId;
}

function loadPoemsFromDisk() {
  const dataPath = path.join(__dirname, 'data');
  const poets = [];

  const poetFolders = fs.readdirSync(dataPath, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)
    .sort();

  for (const poetFolder of poetFolders) {
    const poetPath = path.join(dataPath, poetFolder);
    const bookFiles = fs.readdirSync(poetPath)
      .filter(file => file.endsWith('.json'))
      .sort();

    const books = bookFiles.map(bookFile => {
      const bookPath = path.join(poetPath, bookFile);
      return JSON.parse(fs.readFileSync(bookPath, 'utf-8'));
    });

    if (books.length > 0) {
      const poetId = poetFolder.replace(/^\d+-/, '');
      poets.push({
        id: poetId,
        name: books[0].poet.name,
        books
      });
    }
  }

  return { poets };
}

function buildIndexes(data) {
  const poetById = new Map();
  const bookByKey = new Map();
  const sectionByKey = new Map();

  for (const poet of data.poets) {
    poetById.set(poet.id, poet);
    for (const book of poet.books) {
      bookByKey.set(`${poet.id}/${book.id}`, { poet, book });
      for (const section of book.sections || []) {
        sectionByKey.set(`${poet.id}/${book.id}/${section.id}`, { poet, book, section });
      }
    }
  }

  return { poetById, bookByKey, sectionByKey };
}

function summarizeSections(sections) {
  return (sections || []).map(section => ({
    id: section.id,
    title: section.title
  }));
}

const started = Date.now();
const data = loadPoemsFromDisk();
const indexes = buildIndexes(data);

const bookCount = data.poets.reduce((n, poet) => n + poet.books.length, 0);
const sectionCount = data.poets.reduce(
  (n, poet) => n + poet.books.reduce((m, book) => m + (book.sections || []).length, 0),
  0
);

console.log(
  `Poetry loaded: ${data.poets.length} poets, ${bookCount} books, ${sectionCount} poems (${Date.now() - started}ms)`
);

function getPoet(poetId) {
  return indexes.poetById.get(canonicalPoetId(poetId)) || null;
}

function getBook(poetId, bookId) {
  return indexes.bookByKey.get(`${canonicalPoetId(poetId)}/${bookId}`) || null;
}

function getSection(poetId, bookId, sectionId) {
  const id = canonicalPoetId(poetId);
  if (typeof sectionId === 'undefined') {
    const found = getBook(id, bookId);
    return found ? { ...found, section: null } : null;
  }

  const canonical = canonicalSectionId(sectionId);
  return (
    indexes.sectionByKey.get(`${id}/${bookId}/${canonical}`) ||
    (canonical !== sectionId
      ? indexes.sectionByKey.get(`${id}/${bookId}/${sectionId}`)
      : null) ||
    null
  );
}

function isCanonicalPath(poetId, sectionId) {
  if (canonicalPoetId(poetId) !== poetId) return false;
  if (typeof sectionId !== 'undefined' && canonicalSectionId(sectionId) !== sectionId) {
    return false;
  }
  return true;
}

function canonicalPath(poetId, bookId, sectionId) {
  const parts = ['', canonicalPoetId(poetId), bookId];
  if (typeof sectionId !== 'undefined') {
    parts.push(canonicalSectionId(sectionId));
  }
  return parts.join('/');
}

module.exports = {
  data,
  getPoet,
  getBook,
  getSection,
  summarizeSections,
  canonicalPoetId,
  canonicalSectionId,
  canonicalPath,
  isCanonicalPath,
  POET_ALIASES
};
