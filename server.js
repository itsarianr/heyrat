const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));

function loadPoems() {
  const poemsPath = path.join(__dirname, 'data', 'poems.json');
  const data = fs.readFileSync(poemsPath, 'utf-8');
  return JSON.parse(data);
}

app.get('/', (req, res) => {
  const data = loadPoems();
  res.render('index', { data });
});

app.get('/poem/:bookId/:sectionId/:poemId', (req, res) => {
  const { bookId, sectionId, poemId } = req.params;
  const data = loadPoems();
  
  const book = data.books.find(b => b.id === bookId);
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
  
  res.render('poem', { book, section, poem });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Heyrat server running on port ${PORT}`);
});
