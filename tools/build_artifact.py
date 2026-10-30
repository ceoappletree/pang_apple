#!/usr/bin/env python3
"""합주팡을 Claude 아티팩트(공유 플레이 링크)용 HTML 파일 하나로 묶는다.

아티팩트 페이지는 스크립트를 정해진 CDN에서만 불러올 수 있어서
style.css, src/*.js, samples/*.js 를 모두 한 파일 안에 넣고 matter.js 만 cdnjs 에서 불러온다.
아티팩트가 <!doctype>, <head>, <body> 를 직접 감싸므로 출력에는 그 태그를 넣지 않는다.
(그래서 이 파일은 브라우저에서 바로 여는 용도가 아니다. 직접 플레이는 index.html 로 한다.)

사용법: python3 tools/build_artifact.py [출력 경로]   (기본: dist/hapjupang-artifact.html)
"""
import glob
import os
import re
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
MATTER_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js'
FONTS = 'https://fonts.googleapis.com/css2?family=Jua&family=Gowun+Dodum&display=swap'


def read(rel):
    with open(os.path.join(ROOT, rel), encoding='utf-8') as f:
        return f.read()


def inline(code):
    # 스크립트 안의 '</script' 가 태그를 닫지 않게 한다
    return code.replace('</script', '<\\/script')


def main():
    out = os.path.normpath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'dist', 'hapjupang-artifact.html'))
    html = read('index.html')
    body = re.search(r'<body>(.*)</body>', html, re.S).group(1)
    # index.html 의 스크립트 순서를 그대로 따른다
    scripts = re.findall(r'<script src="([^"]+)"></script>', body)
    body = re.sub(r'<script src="[^"]+"></script>\s*', '', body).strip()

    samples = ''.join(read(os.path.relpath(f, ROOT)) + '\n' for f in sorted(glob.glob(os.path.join(ROOT, 'samples', '*.js'))))
    own = ''.join(read(s) + '\n' for s in scripts if not s.startswith('lib/'))
    if any(s.startswith('lib/') and 'matter' not in s for s in scripts):
        sys.exit('index.html 에 matter.js 말고 다른 lib/ 스크립트가 있어요. 이 스크립트에 CDN 주소를 추가하세요.')

    page = (
        '<title>합주팡</title>\n'
        f'<link rel="stylesheet" href="{FONTS}">\n'
        f'<style>\n{read("style.css")}\n</style>\n'
        f'{body}\n'
        f'<script src="{MATTER_CDN}"></script>\n'
        f'<script>\n{inline(samples)}\n</script>\n'
        f'<script>\n{inline(own)}\n</script>\n'
    )
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    with open(out, 'w', encoding='utf-8') as f:
        f.write(page)
    print('%s (%.1f MB)' % (out, len(page.encode('utf-8')) / 1e6))


if __name__ == '__main__':
    main()
