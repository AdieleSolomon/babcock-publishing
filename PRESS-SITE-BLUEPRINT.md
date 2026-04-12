# Babcock University Press Site Blueprint

## Goal

Position the project as a professional university press with:

- strong public publishing pages
- clear author guidance
- visible books and authors
- trustworthy rights and permissions information
- live author and admin workflows behind the public site

## Recommended Public Information Architecture

1. `Home`
2. `Publications`
3. `Authors`
4. `Services`
5. `For Authors`
6. `Rights & Permissions`
7. `Staff`
8. `Gallery`
9. Future: `Catalogues`
10. Future: `News & Events`
11. Future: `Accessibility`
12. Future: `Sales & Distribution`

## Current Public Pages

- [frontend/index.html](frontend/index.html)
- [frontend/publications.html](frontend/publications.html)
- [frontend/authors.html](frontend/authors.html)
- [frontend/services.html](frontend/services.html)
- [frontend/for-authors.html](frontend/for-authors.html)
- [frontend/rights-permissions.html](frontend/rights-permissions.html)
- [frontend/staff.html](frontend/staff.html)
- [frontend/gallery.html](frontend/gallery.html)

Mirrored public copies exist in `frontend/public/`.

## What Each Page Should Do

### Home

- establish the press identity quickly
- highlight books, authors, services, and key pathways
- route users into the portal, author guidance, and publications

### Publications

- show live published books
- support category browsing
- later add filters for subject, year, format, and faculty

### Authors

- show a live public author directory from published books
- surface biographies, departments, expertise, and featured titles
- later support author detail pages

### Services

- explain editorial, design, print, consultancy, and institutional support
- help departments understand the press beyond book publishing

### For Authors

- define publishing scope
- explain submission requirements
- explain the real workflow from registration to publication
- reduce weak or incomplete submissions

### Rights & Permissions

- explain reuse, translation, excerpt, figure, and course-use requests
- clarify required request metadata
- strengthen institutional trust and publishing professionalism

### Staff

- show leadership and editorial credibility
- later expand into acquisitions/editorial responsibilities by subject

### Gallery

- support visual trust and institutional context
- later connect events, launches, and production moments

## Phase 2 Priorities

1. Add `Catalogues` page with downloadable seasonal or annual PDF lists
2. Add `News & Events` page for launches, workshops, and press announcements
3. Add `Accessibility` page
4. Add `Sales & Distribution` page
5. Add book detail pages for each published book
6. Add author detail pages
7. Add subject or faculty browsing across the catalog

## Backend Support Needed

- `GET /api/books/published` for public catalog
- `GET /api/authors/published` for live author directory
- future endpoint for book detail by slug or id
- future endpoint for author detail by slug or id

## UX Principles

- keep portal actions visible but secondary to the public publishing story
- avoid mixing unrelated enterprise/product language into the press experience
- make every page answer a real question from readers, authors, or partners
- prefer live data where the backend already supports it

## Benchmark Direction

Use the strengths of:

- literary/trade presses for discoverability of books and authors
- university presses for author guidance, rights, and institutional trust

The target is not a bookstore-only site. The target is a university press with
real workflows and professional public publishing pages.
