#!/usr/bin/env python3
"""
Builds content/ptaki-europy.json: the birds of Europe beyond the course's own,
so the checklist and the field log can take any bird seen (a lapwing on a
field near home, a robin in the garden).

Sources:
- the eBird taxonomy in Polish (api.ebird.org/v2/ref/taxonomy/ebird?locale=pl,
  no key needed): Polish, Latin and English names, species codes (used later
  to match eBird's recent sightings) and taxonomic order;
- GBIF occurrence facets (api.gbif.org): which species have at least PROG
  records in Europe, which keeps regular birds and regular rarities and drops
  one-off vagrants and escapes.

A species of the course (gatunki.json, ptaki-mokradel.json, matched by binomial)
is not listed again; it only gets its eBird code in `kody_kursu`.

Usage: python3 scripts/ptaki-europy.py   (about three minutes; prints what it could not match)
"""

from __future__ import annotations

import csv
import io
import json
import sys
import time
import unicodedata
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

KORZEN = Path(__file__).resolve().parent.parent
CEL = KORZEN / 'content' / 'ptaki-europy.json'
PROG = 1000
UA = 'WorldOfRaptors/1.0 (course data script; https://worldofraptors.com)'


def pobierz(url: str) -> bytes:
    for proba in range(8):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=120) as r:
                return r.read()
        except Exception as e:  # noqa: BLE001 - retried, then raised
            if proba == 7:
                raise
            print(f'  retry {url}: {e}', file=sys.stderr)
            time.sleep(2 * (proba + 1))
    raise RuntimeError('unreachable')


def slug(nazwa: str) -> str:
    s = nazwa.lower().replace('ł', 'l')
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode()
    s = ''.join(c if c.isalnum() else '-' for c in s)
    return '-'.join(filter(None, s.split('-')))


def rdzen(epitet: str) -> str:
    """An epithet without its spelling variants: doubled letters, ae/e, and a Latin ending."""
    e = epitet.lower().replace('ae', 'e')
    e = ''.join(c for i, c in enumerate(e) if i == 0 or c != e[i - 1])
    for koncowka in ('us', 'a', 'um', 'is', 'e', 'i'):
        if e.endswith(koncowka) and len(e) > 5:
            return e[: -len(koncowka)]
    return e


def main() -> None:
    print('eBird taxonomy (pl)…')
    tekst = pobierz('https://api.ebird.org/v2/ref/taxonomy/ebird?locale=pl&cat=species&fmt=csv').decode('utf-8')
    ebird = {w['SCIENTIFIC_NAME']: w for w in csv.DictReader(io.StringIO(tekst))}

    print('GBIF: species recorded in Europe…')
    facety = json.loads(pobierz(
        'https://api.gbif.org/v1/occurrence/search?continent=EUROPE&classKey=212&occurrenceStatus=PRESENT'
        '&facet=speciesKey&facetLimit=3000&limit=0'
    ))
    klucze = [int(c['name']) for c in facety['facets'][0]['counts'] if c['count'] >= PROG]

    def nazwa_gbif(klucz: int) -> tuple[int, str] | None:
        d = json.loads(pobierz(f'https://api.gbif.org/v1/species/{klucz}'))
        return (klucz, d['canonicalName']) if d.get('rank') == 'SPECIES' and d.get('canonicalName') else None

    def w_ebird(nazwa: str, klucz: int | None) -> dict | None:
        """The eBird row for a GBIF name, directly or through GBIF's synonyms
        (its backbone keeps older genera: Sylvia communis is eBird's Curruca
        communis, Accipiter gentilis its Astur gentilis)."""
        if nazwa in ebird:
            return ebird[nazwa]
        if klucz is None:
            d = json.loads(pobierz('https://api.gbif.org/v1/species/match?class=Aves&name=' + urllib.parse.quote(nazwa)))
            klucz = d.get('acceptedUsageKey') or d.get('usageKey')
            if klucz is None:
                return None
        d = json.loads(pobierz(f'https://api.gbif.org/v1/species/{klucz}'))
        kandydaci = [d.get('canonicalName'), d.get('species')]
        syn = json.loads(pobierz(f'https://api.gbif.org/v1/species/{klucz}/synonyms?limit=200'))
        kandydaci += [s.get('canonicalName') for s in syn.get('results', [])]
        for k in kandydaci:
            if k and len(k.split()) == 2 and k in ebird:
                return ebird[k]
        # Last: the one eBird species of the same family with the same epithet,
        # spelling aside (Microcarbo pygmeus / pygmaeus, Charadrius dubius /
        # Thinornis dubius). Printed, so a wrong match can be seen.
        epitet = rdzen(nazwa.split()[-1])
        pasujace = [w for w in ebird.values()
                    if w['FAMILY_SCI_NAME'] == d.get('family') and rdzen(w['SCIENTIFIC_NAME'].split()[-1]) == epitet]
        if len(pasujace) == 1:
            print(f'  {nazwa} -> {pasujace[0]["SCIENTIFIC_NAME"]} ({pasujace[0]["COMMON_NAME"]}), by family and epithet')
            return pasujace[0]
        return None

    with ThreadPoolExecutor(max_workers=4) as ex:
        z_gbif = [n for n in ex.map(nazwa_gbif, klucze) if n]
    print(f'  {len(z_gbif)} species with at least {PROG} records')

    kurs = {}
    for plik, klucz_listy in (('gatunki.json', 'gatunki'), ('ptaki-mokradel.json', 'ptaki')):
        dane = json.loads((KORZEN / 'content' / plik).read_text())
        for p in dane[klucz_listy]:
            kurs[p['lat']] = p['id']

    print('Matching names (through GBIF synonyms where eBird uses another genus)…')
    with ThreadPoolExecutor(max_workers=4) as ex:
        wiersze_kursu = list(ex.map(lambda lat: w_ebird(lat, None), kurs))
        wiersze_gbif = list(ex.map(lambda kn: w_ebird(kn[1], kn[0]), z_gbif))

    kody_kursu, nieznane = {}, []
    for lat, w in zip(kurs, wiersze_kursu):
        if w:
            kody_kursu[kurs[lat]] = w['SPECIES_CODE']
    w_kursie = set(kody_kursu.values())

    gatunki, juz = [], set()
    for (_, nazwa), w in zip(z_gbif, wiersze_gbif):
        if not w:
            nieznane.append(nazwa)
            continue
        kod = w['SPECIES_CODE']
        if kod in w_kursie or kod in juz:
            continue
        juz.add(kod)
        gatunki.append({
            'id': slug(w['COMMON_NAME']),
            'pl': w['COMMON_NAME'],
            'lat': w['SCIENTIFIC_NAME'],
            'en': '',  # filled below from the English and Spanish taxonomies
            'es': '',
            'ebird': kod,
            'kolejnosc': float(w['TAXON_ORDER']),
        })

    nazwy_w = {}
    for jezyk in ('en', 'es'):
        print(f'eBird taxonomy ({jezyk})…')
        nazwy_w[jezyk] = {w['SPECIES_CODE']: w['COMMON_NAME'] for w in csv.DictReader(io.StringIO(
            pobierz(f'https://api.ebird.org/v2/ref/taxonomy/ebird?locale={jezyk}&cat=species&fmt=csv').decode('utf-8')))}
    for g in gatunki:
        g['en'] = nazwy_w['en'].get(g['ebird'], '')
        g['es'] = nazwy_w['es'].get(g['ebird'], '')

    # eBird falls back to English where it has no Polish name: such a name would become a stored id.
    bez_polskiej = [g['lat'] for g in gatunki if g['pl'] == g['en']]
    if bez_polskiej:
        print(f'Polish name same as the English one (check by hand): {", ".join(bez_polskiej)}')
    puste = [g['lat'] for g in gatunki if not g['en'] or not g['es']]
    if puste:
        sys.exit(f'No English or Spanish name in eBird for: {", ".join(puste)} (the build refuses empty names)')

    gatunki.sort(key=lambda g: g['kolejnosc'])
    for g in gatunki:
        del g['kolejnosc']

    # A Polish name the course already uses as an id for another species (the
    # course's id `wieszczek` is the wrończyk, Pyrrhocorax pyrrhocorax, named
    # wrongly once and kept because ids are stored keys; eBird's wieszczek is
    # P. graculus): the newcomer takes its Latin epithet too.
    for g in gatunki:
        if g['id'] in kurs.values():
            g['id'] = f"{g['id']}-{slug(g['lat'].split()[-1])}"
    ids = [g['id'] for g in gatunki]
    powtorzone = {i for i in ids if ids.count(i) > 1} | (set(ids) & set(kurs.values()))
    if powtorzone:
        sys.exit(f'Ids taken twice (or by a course species): {sorted(powtorzone)}')
    bez_kodu = sorted(set(kurs.values()) - set(kody_kursu))

    CEL.write_text(json.dumps({
        'zrodla': {
            'nazwy': 'eBird/Clements taxonomy, Polish locale (api.ebird.org/v2/ref/taxonomy/ebird)',
            'zakres': f'GBIF: species with at least {PROG} occurrence records in Europe (api.gbif.org)',
            'pobrano': time.strftime('%Y-%m-%d'),
        },
        'kody_kursu': dict(sorted(kody_kursu.items())),
        'gatunki': gatunki,
    }, ensure_ascii=False, indent=1) + '\n')
    print(f'{len(gatunki)} species written to {CEL.relative_to(KORZEN)}')
    if nieznane:
        print(f'{len(nieznane)} GBIF names not in the eBird taxonomy (left out): {", ".join(nieznane)}')
    if bez_kodu:
        print(f'Course species without an eBird code: {", ".join(bez_kodu)}')


if __name__ == '__main__':
    main()
