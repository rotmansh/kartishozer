# Bundles the app into one HTML page (used for the claude.ai preview).
# Usage: python3 tools/bundle.py . out.html
import re,sys,os
root=sys.argv[1]; out=sys.argv[2]
order=['util','beat','analyzer','music','director','renderer','player','exporter','demo','app']
parts=["const __m={};"]
for name in order:
    src=open(f'{root}/js/{name}.js').read()
    lines=[]
    for ln in src.split('\n'):
        m=re.match(r"\s*import\s*\{([^}]*)\}\s*from\s*'\./(\w+)\.js';",ln)
        if m:
            lines.append(f"const {{{m.group(1)}}} = __m.{m.group(2)};"); continue
        lines.append(ln)
    body='\n'.join(lines)
    names=re.findall(r'^export\s+(?:async\s+)?(?:function|const|class|let)\s+([\w$]+)',body,re.M)
    body=re.sub(r'^export\s+','',body,flags=re.M)
    parts.append(f"__m.{name}=(()=>{{\n{body}\nreturn {{{', '.join(names)}}};\n}})();")
js='\n'.join(parts)
html=open(f'{root}/index.html').read()
css=open(f'{root}/css/app.css').read()
body=html[html.index('<body>')+6:html.index('<script type="module"')]
fonts=re.search(r'<link rel="stylesheet" href="(https://fonts[^"]+)">',html).group(1)
page=f'''<title>קליפי</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="{fonts}">
<style>{css}
html{{direction:rtl}}</style>
<div dir="rtl" lang="he">{body}</div>
<script type="module">
{js}
</script>
'''
open(out,'w').write(page)
print(len(page))
