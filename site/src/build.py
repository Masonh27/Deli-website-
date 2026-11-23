# Builds every page in public/ from src/shell.html (shared head, header, footer) + src/<page>.main.html
# Run: npm run build   (or python3 src/build.py)
import pathlib
here = pathlib.Path(__file__).parent
pub = here.parent / "public"
shell = (here / "shell.html").read_text()
pages = {
  "index":   ("Divicious Deli &amp; Coffee Shop | Lakeland, FL", [], []),
  "menu":    ("Menu | Divicious Deli &amp; Coffee Shop | Lakeland, FL", ["css/menu.css"], ["js/menu-data.js", "js/menu.js"]),
  "about":   ("About | Divicious Deli &amp; Coffee Shop | Lakeland, FL", [], []),
  "contact": ("Contact &amp; Hours | Divicious Deli &amp; Coffee Shop | Lakeland, FL", [], []),
}
for name, (title, css, js) in pages.items():
  html = (shell.replace("{{TITLE}}", title)
    .replace("{{CSS}}", "".join(f'\n  <link rel="stylesheet" href="{c}">' for c in css))
    .replace("{{JS}}", "".join(f'\n  <script src="{s}"></script>' for s in js))
    .replace("{{MAIN}}", (here / f"{name}.main.html").read_text())
    .replace(f'<a href="{name}.html">', f'<a href="{name}.html" aria-current="page">', 1))
  (pub / f"{name}.html").write_text(html)
  print("built", name)
