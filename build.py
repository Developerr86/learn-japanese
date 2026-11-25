#!/usr/bin/env python3
"""Inline shared CSS/JS and JSON data into the three study pages.

  python3 build.py           -> claude.ai Artifact versions at the repo root (account sync + audio)
  python3 build.py --pages   -> standalone GitHub Pages site in docs/ (browser storage, backups, no audio)
"""
import json, pathlib, re, sys
ROOT = pathlib.Path(__file__).parent
SRC, DATA = ROOT / "src", ROOT / "data"
PAGES_MODE = "--pages" in sys.argv
OUT = ROOT / "docs" if PAGES_MODE else ROOT
SUITE = json.loads((ROOT / "suite.json").read_text()) if (ROOT / "suite.json").exists() else {}
PAGES = [("kana-kanji", "Kana & Kanji"), ("words", "1000 Words"), ("phrases", "Phrases")]
css = (SRC / "core.css").read_text()
js = (SRC / "core.js").read_text()
if PAGES_MODE:
    assert "const PAGES = false;" in js
    js = js.replace("const PAGES = false;", "const PAGES = true;", 1)

# what the claude.ai publish skeleton provides, for standalone pages
HEAD = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
        '<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}'
        'body{margin:0;font:14px/1.5 system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>\n')

def suite_js(here):
    if PAGES_MODE:
        links = [{"id": "index", "name": "Home", "url": "./"}] + [{"id": p, "name": n, "url": f"{p}.html"} for p, n in PAGES]
        target = ""
    else:
        links = [{"id": p, "name": n, "url": SUITE.get(p, "")} for p, n in PAGES]
        target = ' target="_blank" rel="noopener"'
    return ("(()=>{const L=%s;const el=document.getElementById('suite');if(!el)return;"
            "el.innerHTML=L.filter(l=>l.url||l.id===%s).map(l=>l.id===%s?`<a class=\"here\" aria-current=\"page\">${l.name}</a>`"
            ":`<a href=\"${l.url}\"%s>${l.name}</a>`).join('');})();") % (
        json.dumps(links, ensure_ascii=False), json.dumps(here), json.dumps(here), target)

def standalone(html):
    head, sep, body = html.partition('<div class="wrap">')
    assert sep, "page template must contain <div class=\"wrap\">"
    return HEAD + head.strip() + "\n</head>\n<body>\n" + sep + body + "\n</body>\n</html>\n"

OUT.mkdir(exist_ok=True)
pages = PAGES + ([("index", "Home")] if PAGES_MODE else [])
for page, _ in pages:
    src = SRC / f"{page}.html"
    if not src.exists(): continue
    out = src.read_text().replace("/*@CORE_CSS*/", css).replace("/*@CORE_JS*/", js).replace("/*@SUITE*/", suite_js(page))
    out = re.sub(r"/\*@DATA:([\w-]+)\*/\[\]",
                 lambda m: (DATA / f"{m.group(1)}.json").read_text().strip().replace("</", "<\\/"), out)
    if PAGES_MODE:
        out = standalone(out.replace('<meta name="claude:viewport-fit-sides" content="cover">\n', ""))
    else:
        out = '<meta charset="utf-8">\n' + out
    (OUT / f"{page}.html").write_text(out)
    print(OUT.name + "/" + page + ".html", len(out) // 1024, "KB")
if PAGES_MODE:
    (OUT / ".nojekyll").write_text("")
