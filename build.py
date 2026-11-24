#!/usr/bin/env python3
"""Inline shared CSS/JS and JSON data into the three study pages."""
import json, pathlib, re
ROOT = pathlib.Path(__file__).parent
SRC, DATA = ROOT / "src", ROOT / "data"
SUITE = json.loads((ROOT / "suite.json").read_text()) if (ROOT / "suite.json").exists() else {}
PAGES = [("kana-kanji", "Kana & Kanji"), ("words", "1000 Words"), ("phrases", "Phrases")]
css = (SRC / "core.css").read_text()
js = (SRC / "core.js").read_text()

def suite_js(here):
    links = [{"id": p, "name": n, "url": SUITE.get(p, "")} for p, n in PAGES]
    return ("(()=>{const L=%s;const el=document.getElementById('suite');if(!el)return;"
            "el.innerHTML=L.filter(l=>l.url||l.id===%s).map(l=>l.id===%s?`<a class=\"here\" aria-current=\"page\">${l.name}</a>`"
            ":`<a href=\"${l.url}\" target=\"_blank\" rel=\"noopener\">${l.name}</a>`).join('');})();") % (json.dumps(links, ensure_ascii=False), json.dumps(here), json.dumps(here))

for page, _ in PAGES:
    src = SRC / f"{page}.html"
    if not src.exists(): continue
    out = src.read_text().replace("/*@CORE_CSS*/", css).replace("/*@CORE_JS*/", js).replace("/*@SUITE*/", suite_js(page))
    def data(m):
        return (DATA / f"{m.group(1)}.json").read_text().strip().replace("</", "<\\/")
    out = re.sub(r"/\*@DATA:([\w-]+)\*/\[\]", data, out)
    (ROOT / f"{page}.html").write_text("<meta charset=\"utf-8\">\n" + out)
    print(page, len(out) // 1024, "KB")
