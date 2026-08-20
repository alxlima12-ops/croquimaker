#!/usr/bin/env python3
"""Gera croqui-canionismo.html: versão de arquivo único, com CSS e JS embutidos.
Rode depois de mexer em qualquer arquivo da pasta:  python3 build.py"""
import pathlib, re

raiz = pathlib.Path(__file__).parent
html = (raiz / 'index.html').read_text(encoding='utf-8')
css  = (raiz / 'css/app.css').read_text(encoding='utf-8')
js   = '\n'.join((raiz / 'js' / f).read_text(encoding='utf-8')
                 for f in ['simbologia.js', 'relevos.js', 'ficha.js', 'editor.js'])

for texto in (css, js):
    assert '</script' not in texto.lower(), 'conteúdo quebraria a tag script'

html = html.replace('<link rel="stylesheet" href="css/app.css">',
                    '<style>\n' + css + '\n</style>')
html = re.sub(r'\s*<script src="js/[^"]+"></script>', '', html)
html = html.replace('</body>', '<script>\n' + js + '\n</script>\n</body>')

saida = raiz / 'croqui-canionismo.html'
saida.write_text(html, encoding='utf-8')
print('gerado', saida.name, f'({saida.stat().st_size // 1024} KB)')
