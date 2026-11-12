#!/usr/bin/env python3
"""Keep the Stage shell the same on every page: the symbol defs, the nav and the footer are written once, in
index.html, between <!--DEFS-->, <!--NAV--> and <!--FOOT--> markers; this copies them into every other page that
has the same markers, and marks the page's own nav link with aria-current="page".

    python3 tools/stage_shell.py          (run from the repo root after changing the shell in index.html)
"""
import glob, re

SRC = open('index.html', encoding='utf-8').read()
BLOCKS = {k: re.search(rf'<!--{k}-->.*?<!--/{k}-->', SRC, re.S).group(0) for k in ('DEFS', 'NAV', 'FOOT')}

for page in sorted(glob.glob('*.html') + glob.glob('compare/*.html')):
    if page == 'index.html':
        continue
    s = open(page, encoding='utf-8').read()
    out = s
    for k, block in BLOCKS.items():
        if f'<!--{k}-->' not in out:
            continue
        if k == 'NAV':
            here = '/' + page[:-5]
            block = block.replace(f'<a href="{here}">', f'<a href="{here}" aria-current="page">')
        out = re.sub(rf'<!--{k}-->.*?<!--/{k}-->', lambda m: block, out, flags=re.S)
    if out != s:
        open(page, 'w', encoding='utf-8').write(out)
        print('updated', page)
