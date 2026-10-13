#!/usr/bin/env python3
"""FluidR3 GM 사운드폰트(CC BY 3.0, Frank Wen)에서 합주팡에 필요한 음만 골라 samples/*.js 로 저장한다.

원본: https://github.com/gleitz/midi-js-soundfonts (FluidR3_GM)
각 악기에서 4반음(장3도) 간격으로 음을 골라 담고, 그 사이 음은 재생 속도를 바꿔 만든다.

사용법: python3 tools/build_samples.py
"""
import json
import os
import re
import sys
import urllib.request

BASE = 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/gh-pages/FluidR3_GM/'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'samples')

# 악기 이름: (가장 낮은 음, 가장 높은 음)  MIDI 번호
RANGES = {
    'acoustic_grand_piano': (36, 96),
    'flute': (58, 94),
    'violin': (55, 88),
    'pizzicato_strings': (28, 64),
    'alto_sax': (40, 80),
    'koto': (44, 76),
    'shamisen': (48, 82),
    'fiddle': (44, 92),
    'harmonica': (52, 76),
    'shakuhachi': (55, 94),
    'reed_organ': (50, 74),
    'sitar': (36, 88),
    'dulcimer': (44, 90),
    'choir_aahs': (48, 88),
    'voice_oohs': (48, 88),
    'synth_choir': (48, 88),
}
STEP = 4
NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']


def note_name(n):
    return NAMES[n % 12] + str(n // 12 - 1)


def main():
    os.makedirs(OUT, exist_ok=True)
    total = 0
    for inst, (lo, hi) in RANGES.items():
        url = BASE + inst + '-mp3.js'
        print('받는 중', url, file=sys.stderr)
        src = urllib.request.urlopen(url, timeout=120).read().decode('ascii')
        notes = dict(re.findall(r'"([A-G]b?\d)": "(data:audio/mp3;base64,[^"]+)"', src))
        picked = {}
        for n in range(lo, hi + 1, STEP):
            name = note_name(n)
            if name in notes:
                picked[n] = notes[name]
        body = json.dumps(picked, separators=(',', ':'))
        js = ('/* FluidR3 GM 사운드폰트 "%s" (Frank Wen, CC BY 3.0) - tools/build_samples.py 로 생성 */\n'
              'window.SAMPLES = window.SAMPLES || {};\nwindow.SAMPLES[%s] = %s;\n') % (inst, json.dumps(inst), body)
        path = os.path.join(OUT, inst + '.js')
        with open(path, 'w', encoding='utf-8') as f:
            f.write(js)
        total += len(js)
        print('  %d음, %d KB' % (len(picked), len(js) // 1024), file=sys.stderr)
    print('합계 %.1f MB' % (total / 1e6), file=sys.stderr)


if __name__ == '__main__':
    main()
