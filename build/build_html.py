import os
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.dirname(HERE)
tpl = open(os.path.join(HERE, "template.html"), encoding="utf-8").read()
data = open(os.path.join(HERE, "story_data.json"), encoding="utf-8").read()
engine = open(os.path.join(HERE, "engine.js"), encoding="utf-8").read()
app = open(os.path.join(HERE, "app.js"), encoding="utf-8").read()
page = (tpl.replace("/*__DATA__*/", data).replace("/*__ENGINE__*/", engine).replace("/*__APP__*/", app))
assert "__DATA__" not in page and "__ENGINE__" not in page and "__APP__" not in page
open(os.path.join(OUT, "artifact.html"), "w", encoding="utf-8").write(page)
full = ('<!doctype html>\n<html lang="ca">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">\n'
        + page.replace('<div id="stage">', '</head>\n<body>\n<div id="stage">', 1) + '\n</body>\n</html>\n')
open(os.path.join(OUT, "index.html"), "w", encoding="utf-8").write(full)
print("index.html", os.path.getsize(os.path.join(OUT, "index.html")) // 1024, "kB")
