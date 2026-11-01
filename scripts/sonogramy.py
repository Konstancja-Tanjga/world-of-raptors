"""Draws a sonogram for every recording in content/nagrania.json.

    python3 scripts/sonogramy.py [--tylko puszczyk/samiec ...]

Each one is the first 12 seconds of the recording (all of it when shorter),
from 0 to 4 kHz, or to 2 kHz for the owls that call low (NISKIE) and to 8 kHz
for the waders of B9 (they call high, many above 4 kHz), drawn
dark on white and saved to public/sonogramy/<gatunek>-<opis>.png; the entry
gets "sonogram": {"khz": 4 (or 2, or 8), "zrodlo": <src>}: the page labels its scale
with khz, and the build checks that zrodlo is still the entry's src, so a
recording swapped for another is redrawn (a plain run redraws it). A sonogram is a picture of the recording, so it carries
the recording's author and licence (the player shows them). Needs ffmpeg.
"""
import argparse
import json
import os
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request

UA = 'WorldOfRaptors/1.0 (private course; github.com/Konstancja-Tanjga/world-of-raptors)'
KATALOG = 'content/nagrania.json'
CEL = 'public/sonogramy'
SEKUNDY = 12
# Owls whose voice lies below ~500 Hz: on a 0-4 kHz scale it would be a smudge along the bottom.
NISKIE = {'puchacz', 'puszczyk-uralski', 'puszczyk-mszarny', 'uszatka-blotna'}
NISKIE_NAGRANIA = {'uszatka/samiec'}
# Waders taught as full species (B9): their calls run from about 2 to 7 kHz.
with open('content/ptaki-mokradel.json', encoding='utf-8') as fh:
    WYSOKIE = {p['id'] for p in json.load(fh)['ptaki'] if p.get('rozpoznawanie')}

def pobierz(url):
    """GET with polite retries: Wikimedia answers 429 when asked too often."""
    for proba in range(6):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=60) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code != 429 or proba == 5:
                raise
            time.sleep(60 * (proba + 1))


def zapisz():
    with open(KATALOG, 'w', encoding='utf-8') as fh:
        fh.write(json.dumps(nagrania, ensure_ascii=False, indent=2) + '\n')


# Recordings whose sonogram shows only hiss: the barn owl's screech is broadband, and the
# short-eared owl's song lies under wind. They play without one.
BEZ_SONOGRAMU = {'plomykowka/glos', 'uszatka-blotna/samiec'}

ap = argparse.ArgumentParser()
ap.add_argument('--tylko', nargs='*')
a = ap.parse_args()

with open(KATALOG, encoding='utf-8') as fh:
    nagrania = json.load(fh)
os.makedirs(CEL, exist_ok=True)
for id_, n in nagrania.items():
    cel = os.path.join(CEL, id_.replace('/', '-') + '.png')
    # Only what is asked for, or else only what is missing: Wikimedia limits how often it may be asked.
    if id_ in BEZ_SONOGRAMU:
        n.pop('sonogram', None)
        if os.path.exists(cel):
            os.remove(cel)
        continue
    khz = 2 if n['gatunek'] in NISKIE or id_ in NISKIE_NAGRANIA else 8 if n['gatunek'] in WYSOKIE else 4
    # Redrawn when the recording or its species' scale has changed.
    aktualny = os.path.exists(cel) and (n.get('sonogram') or {}).get('zrodlo') == n['src'] and n['sonogram'].get('khz') == khz
    if (a.tylko and id_ not in a.tylko) or (not a.tylko and aktualny):
        continue
    with tempfile.TemporaryDirectory() as tmp:
        if n['src'].startswith('/'):
            zrodlo = 'public' + n['src']
        else:
            zrodlo = os.path.join(tmp, 'nagranie')
            with open(zrodlo, 'wb') as fh:
                fh.write(pobierz(n['src']))
            time.sleep(20)
        # Loudness evened out first, so one threshold keeps the calls and drops the hiss in every
        # recording; resampled to twice the top of the scale, so all of the drawing's rows are that band.
        filtr = (
            f'aformat=channel_layouts=mono,highpass=f=150,loudnorm,aresample={khz * 2000},'
            'showspectrumpic=s=1200x320:legend=0:color=channel:scale=log:fscale=lin:win_func=hann,'
            "format=gray,lutyuv=y='clip((val-115)*2.5\\,0\\,255)',negate"
        )
        wynik = subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-t', str(SEKUNDY), '-i', zrodlo, '-lavfi', filtr, cel], capture_output=True, text=True)
        if wynik.returncode:
            sys.exit(f'{id_}: ffmpeg: {wynik.stderr.strip()}')
    n['sonogram'] = {'khz': khz, 'zrodlo': n['src']}
    print(id_, '→', cel, flush=True)
    zapisz()

zapisz()
