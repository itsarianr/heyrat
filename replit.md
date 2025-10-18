# Heyrat (حیرت) - Persian Poetry Website

## Overview

Heyrat is a minimal, monolithic web application for displaying Persian poetry with full right-to-left (RTL) text support. The application serves Persian poems organized by poets, books, sections, and individual poems. It emphasizes simplicity with server-side rendering, no client-side JavaScript, and a clean black-on-white minimalist interface. All content is stored in modular JSON files organized by poet, making the application lightweight, portable, and easy to extend.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Application Architecture
**Decision**: Monolithic server-side rendered application using Express.js and EJS templates  
**Rationale**: Simplicity and maintainability for a content-focused application  
**Approach**:
- Single Node.js process handling all requests
- Server-side rendering with EJS eliminates need for client-side framework
- No build step required - direct file serving
- Pros: Simple deployment, fast initial page loads, works without JavaScript
- Cons: Limited interactivity, full page reloads for navigation

### Data Storage
**Decision**: File-based JSON storage with modular poet/book organization  
**Rationale**: Lightweight, portable, scalable, and sufficient for read-only poetry content  
**Structure**:
- Hierarchical organization: Poets → Books → Sections → Poems → Couplets
- Folder structure: `data/{poet-id}/{book-id}.json` - each poet has a dedicated folder, each book is a separate JSON file
- Schema: Each book JSON file contains poet metadata, sections, poems, and couplets (each couplet is an array: [first_verse, second_verse])
- Couplet Structure: Simple array format `["مصرع اول", "مصرع دوم"]` reflecting traditional Persian poetry format (بیت)
- Loading: Server scans poet folders on startup and loads all book JSON files into memory
- Pros: No database setup, easy version control, simple backups, authentic poetry presentation, easy to add new books (just upload a new JSON file)
- Cons: Not suitable for write-heavy operations, loads entire dataset per request, requires folder scan on startup

### Routing Strategy
**Decision**: Hierarchical URL structure matching data organization  
**Routes**:
- `/` - Homepage listing all poets, books, and sections
- `/poem/:poetId/:bookId/:sectionId/:poemId` - Individual poem display with full hierarchy
- Static file serving from `/public` directory
- Pros: RESTful, semantic URLs, clear content hierarchy including poet attribution
- Cons: Currently no pagination or search functionality

### Presentation Layer
**Decision**: Pure server-side rendering with RTL-first CSS  
**Rationale**: Persian text requires RTL support; no JavaScript needed for static content  
**Implementation**:
- EJS templates for dynamic HTML generation
- CSS with `direction: rtl` and `text-align: right`
- Minimal styling (black text on white background)
- Font stack: Tahoma, Arial, sans-serif for Persian character support
- Couplet Display: Flexbox layout displays two verses side by side (first verse right-aligned, second verse left-aligned)
- Responsive: Mobile view stacks verses vertically while maintaining RTL text direction
- Pros: Accessible, fast, works without JavaScript, authentic Persian poetry presentation
- Cons: Limited to traditional web navigation patterns

### Error Handling
**Decision**: Basic 404 responses with Persian error messages  
**Implementation**: Manual validation of poetId, bookId, sectionId, and poemId parameters with localized error messages

## External Dependencies

### Runtime Dependencies
- **express** (^5.1.0): Web framework for routing and middleware
- **ejs** (^3.1.10): Template engine for server-side rendering

### Development & Deployment
- **Node.js**: Runtime environment (version 14 or higher recommended)
- **npm**: Package management

### Infrastructure
- **Port**: Configurable via `process.env.PORT`, defaults to 5000
- **Binding**: Listens on `0.0.0.0` for external access
- **Static Assets**: Served from `/public` directory

### No External Services
The application currently has no external API integrations, databases, or third-party services. All functionality is self-contained with local file storage.