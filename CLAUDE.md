# Divicious Deli website rebuild (draft)

Client: Divicious Deli & Coffee Shop, 128 E Main St., Lakeland FL. Current site: diviciousdeli.com (Wix).
Goal: rebuild with a clean, mobile-first menu (old Wix menu stacks Small/Large items into unreadable columns on phones).

Follow `notes/MASTER_PRINCIPLES_UNIVERSAL.md` and `notes/VISUAL_BUILD_MASTER_PRINCIPLES.md`.

- Static site in `site/public/`, served by `site/server.js` (no deps): `cd site && npm start` -> http://localhost:4620
- Menu content lives ONLY in `site/public/js/menu-data.js` (rendered by `js/menu.js`).
- menu/about/contact pages are assembled from index.html's header/footer: edit `site/src/*.main.html`, then `npm run build`.
- Theme from the live site: burgundy #8C4B38, ink #2A2A2A, Adobe Caslon headings (Libre Caslon Text), Georgia menu items, Cormorant Garamond body, Dancing Script accents.
- Never put API keys in code/config.
- Status: LOCAL ONLY, not deployed.
