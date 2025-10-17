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
├── data/              # JSON data files
│   └── poems.json     # Poem collection data
└── public/            # Static files
    └── styles.css     # RTL-optimized CSS styling
```

## Adding More Poems

To add more poems, edit the `data/poems.json` file following the existing structure:

```json
{
  "books": [
    {
      "id": "unique-book-id",
      "title": "عنوان کتاب",
      "poet": "نام شاعر",
      "sections": [
        {
          "id": "unique-section-id",
          "title": "عنوان بخش",
          "poems": [
            {
              "id": "unique-poem-id",
              "title": "عنوان شعر",
              "verses": [
                "مصرع اول",
                "مصرع دوم"
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

## License

This project is open source and available for educational purposes.

## Contact

For questions or contributions, please open an issue on the project repository.
