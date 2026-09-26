"""Wikimedia Commons helpers for adding photos to lessons.

Search (downloads small previews you can open to check what is in the photo):
    python3 scripts/commons.py search "Haliaeetus albicilla talons" [--out /tmp/previews] [--limit 12]

Make a lesson tag for a chosen file (checks the licence, fills author and licence):
    python3 scripts/commons.py tag "File:Some photo.jpg" --podpis "Szpony bielika" --alt "Stopa bielika ze szponami"

Only freely licensed files are accepted: CC0, public domain, CC BY, CC BY-SA.
"""
import argparse
import html
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

UA = 'WorldOfRaptors/1.0 (private course; github.com/Konstancja-Tanjga/world-of-raptors)'
API = 'https://commons.wikimedia.org/w/api.php'
OK_LICENSE = re.compile(r'^(CC0|Public domain|PD|CC BY(-SA)? [0-9.]+)', re.I)


def fetch(url):
    """GET with polite retries: Commons answers 429 when asked too often."""
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    for attempt in range(6):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code != 429 or attempt == 5:
                raise
            time.sleep(5 * (attempt + 1))
    raise RuntimeError('unreachable: the retry loop always returns or raises')


def get(params):
    d = json.loads(fetch(API + '?' + urllib.parse.urlencode({'format': 'json', **params})))
    # The API reports errors (bad parameters, rate limits) as HTTP 200 + "error";
    # without this they would look like "no results" or "not found".
    if 'error' in d:
        sys.exit(f"Commons API error {d['error'].get('code')}: {d['error'].get('info')}")
    return d


def strip(s):
    return html.unescape(re.sub(r'<[^>]+>', '', s or '')).strip()


def imageinfo(titles, width):
    d = get({'action': 'query', 'titles': '|'.join(titles), 'prop': 'imageinfo',
             'iiprop': 'url|size|mime|extmetadata', 'iiurlwidth': width})
    out = []
    for p in d.get('query', {}).get('pages', {}).values():
        if 'imageinfo' not in p:
            continue
        ii = p['imageinfo'][0]
        meta = ii.get('extmetadata', {})
        out.append({
            'title': p['title'], 'mime': ii.get('mime'), 'w': ii.get('width'), 'h': ii.get('height'),
            'thumb': ii.get('thumburl'), 'tw': ii.get('thumbwidth'), 'th': ii.get('thumbheight'),
            'page': ii.get('descriptionurl'),
            'license': strip(meta.get('LicenseShortName', {}).get('value')),
            'licenseUrl': strip(meta.get('LicenseUrl', {}).get('value')),
            'artist': strip(meta.get('Artist', {}).get('value')),
            'desc': strip(meta.get('ImageDescription', {}).get('value'))[:160],
        })
    return out


def search(query, out, limit):
    d = get({'action': 'query', 'list': 'search', 'srnamespace': 6, 'srsearch': query, 'srlimit': 40})
    titles = [m['title'] for m in d.get('query', {}).get('search', [])]
    files = [f for f in imageinfo(titles, 320) if f['mime'] in ('image/jpeg', 'image/png')] if titles else []
    files = [f for f in files if OK_LICENSE.match(f['license'] or '')][:limit]
    os.makedirs(out, exist_ok=True)
    for i, f in enumerate(files):
        path = os.path.join(out, f'{i:02d}.jpg')
        with open(path, 'wb') as fh:
            fh.write(fetch(f['thumb']))
        time.sleep(0.5)
        print(f"[{i:02d}] {f['title']}\n     {f['w']}x{f['h']} · {f['license']} · {(f['artist'] or '?')[:50]}\n     {f['desc']}\n     preview: {path}")
    if not files:
        print('no freely licensed results')


def tag(title, podpis, alt):
    files = imageinfo([title], 960)
    if not files:
        sys.exit(f'not found: {title}')
    f = files[0]
    if not OK_LICENSE.match(f['license'] or ''):
        sys.exit(f"licence not allowed: {f['license']}")
    # CC BY / CC BY-SA require attribution: never emit a tag that silently lacks it.
    needs_attribution = f['license'].upper().startswith('CC BY')
    if needs_attribution and (not f['artist'] or not f['licenseUrl']):
        sys.exit(f"{title}: no author or licence URL in the metadata; attribution is required. "
                 f"Pick another file or fill autor/licencja-url by hand from {f['page']}")
    f['artist'] = f['artist'] or 'autor nieznany (domena publiczna)'
    q = lambda s: html.escape(s, quote=True)
    print(
        f'<zdjecie src="{q(f["thumb"])}" width="{f["tw"]}" height="{f["th"]}" alt="{q(alt)}" '
        f'podpis="{q(podpis)}" autor="{q(f["artist"])}" licencja="{q(f["license"])}" '
        f'licencja-url="{q(f["licenseUrl"])}" strona="{q(f["page"])}">\n</zdjecie>'
    )


ap = argparse.ArgumentParser()
sub = ap.add_subparsers(dest='cmd', required=True)
s = sub.add_parser('search'); s.add_argument('query'); s.add_argument('--out', default='/tmp/commons-previews'); s.add_argument('--limit', type=int, default=12)
t = sub.add_parser('tag'); t.add_argument('title'); t.add_argument('--podpis', required=True); t.add_argument('--alt', required=True)
a = ap.parse_args()
if a.cmd == 'search':
    search(a.query, a.out, a.limit)
else:
    tag(a.title, a.podpis, a.alt)
