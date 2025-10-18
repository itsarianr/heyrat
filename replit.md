# Heyrat (حیرت) - Persian Poetry Website

## Overview

Heyrat is a minimal, monolithic web application for displaying Persian poetry with full right-to-left (RTL) text support. The application serves Persian poems organized by books, sections, and individual poems. It emphasizes simplicity with server-side rendering, no client-side JavaScript, and a clean black-on-white minimalist interface. All content is stored in local JSON files, making the application lightweight and portable.

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
**Decision**: File-based JSON storage for all content  
**Rationale**: Lightweight, portable, and sufficient for read-only poetry content  
**Structure**:
- Hierarchical organization: Books → Sections → Poems → Couplets
- Single `poems.json` file loaded synchronously on each request
- Schema: Each book contains sections, each section contains poems with couplets (each couplet has two verses: "first" and "second")
- Couplet Structure: Reflects traditional Persian poetry format (بیت) where each couplet displays two verses side by side
- Pros: No database setup, easy version control, simple backups, authentic poetry presentation
- Cons: Not suitable for write-heavy operations, loads entire dataset per request

### Routing Strategy
**Decision**: Hierarchical URL structure matching data organization  
**Routes**:
- `/` - Homepage listing all books and sections
- `/poem/:bookId/:sectionId/:poemId` - Individual poem display
- Static file serving from `/public` directory
- Pros: RESTful, semantic URLs, clear content hierarchy
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
**Implementation**: Manual validation of bookId, sectionId, and poemId parameters with localized error messages

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