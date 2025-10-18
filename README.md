# Heyrat (حیرت)

A minimal Persian poetry website built with Node.js, Express, and EJS.

## Description

Heyrat is a simple monolithic web application for displaying Persian poems (Farsi, right-to-left). Each poem belongs to a book and section, with all data stored in local JSON files.

## Features

- Server-side rendering with EJS templates
- Fully RTL (right-to-left) design for Farsi text
- Clean black-on-white minimalist interface
- JSON-based data storage
- No client-side JavaScript
- Lightweight and portable

## Requirements

- Node.js (version 14 or higher)
- npm (comes with Node.js)

## Installation

### macOS

1. Install Node.js from [nodejs.org](https://nodejs.org/) or via Homebrew:
   ```bash
   brew install node
   ```

2. Clone or download this project, then navigate to the project directory:
   ```bash
   cd heyrat
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

### Ubuntu

1. Install Node.js:
   ```bash
   sudo apt update
   sudo apt install nodejs npm
   ```

2. Navigate to the project directory:
   ```bash
   cd heyrat
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

## Running the Application

Start the server:

```bash
npm start
```

The application will be available at:
- `http://localhost:5000` (default)
- Or on the port specified by the `PORT` environment variable

To stop the server, press `Ctrl+C` in the terminal.

## Project Structure

```
heyrat/
├── server.js          # Express server configuration
├── package.json       # Project dependencies and scripts
├── README.md          # This file
├── views/             # EJS templates
│   ├── index.ejs      # Home page listing all poems
│   └── poem.ejs       # Individual poem display page
├── data/              # JSON data files organized by poet
│   └── hafez/         # Poet folder (one per poet)
│       └── divan.json # Book file (one per book)
└── public/            # Static files
    └── styles.css     # RTL-optimized CSS styling
```

## Adding More Content

### Adding a New Book

To add a new book by an existing poet, create a new JSON file in the poet's folder (e.g., `data/hafez/new-book.json`):

```json
{
  "id": "book-id",
  "title": "عنوان کتاب",
  "poet": {
    "id": "hafez",
    "name": "حافظ شیرازی"
  },
  "sections": [
    {
      "id": "section-id",
      "title": "عنوان بخش",
      "poems": [
        {
          "id": "poem-id",
          "title": "عنوان شعر",
          "couplets": [
            ["مصرع اول بیت اول", "مصرع دوم بیت اول"],
            ["مصرع اول بیت دوم", "مصرع دوم بیت دوم"]
          ]
        }
      ]
    }
  ]
}
```

### Adding a New Poet

1. Create a new folder in `data/` with the poet's ID (e.g., `data/rumi/`)
2. Add book JSON files inside that folder following the structure above
3. The server will automatically detect and load the new poet on restart

### Data Structure Notes

- Each couplet is an array with two verses: `["first verse", "second verse"]`
- Couplets are displayed side by side on desktop (right-aligned and left-aligned)
- On mobile, couplets stack vertically while maintaining the alignment

## License

This project is open source and available for educational purposes.

## Contact

For questions or contributions, please open an issue on the project repository.
