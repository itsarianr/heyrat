const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));

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

app.get('/', (req, res) => {
  const data = loadPoems();
  res.render('index', { data });
});

app.get('/:poetId/:bookId/:sectionId/:poemId', (req, res) => {
  const { poetId, bookId, sectionId, poemId } = req.params;
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
  
  const poem = section.poems.find(p => p.id === poemId);
  if (!poem) {
    return res.status(404).send('شعر یافت نشد');
  }
  
  res.render('poem', { poet, book, section, poem });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Heyrat server running on port ${PORT}`);
});
