"""Species names in other languages, from Wikidata, for pages translated by the browser.

Usage: python3 scripts/nazwy.py
Writes content/nazwy-gatunkow.json: {species id: {language: name}}. The species
are matched by their Latin name (Wikidata's taxon name, P225). English and
Spanish are not fetched: the atlas has its own, checked names for them. A
"name" that is only the Latin name again, or is missing, is left out; the app
then shows the English name.
"""
import json, os, time, urllib.parse, urllib.request

JEZYKI = ['de', 'fr', 'it', 'pt', 'nl', 'cs', 'sk', 'uk', 'sv', 'da', 'nb', 'fi', 'hu', 'ro']
# Wikidata files these species under a name the atlas does not use.
SYNONIMY = {'Aquila pennata': 'Hieraaetus pennatus'}
UA = 'WorldOfRaptors/1.0 (private course; https://world-of-raptors.vercel.app)'
KORZEN = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def wczytaj(plik, klucz):
    with open(os.path.join(KORZEN, 'content', plik)) as f:
        return json.load(f)[klucz]

gatunki = wczytaj('gatunki.json', 'gatunki') + wczytaj('ptaki-mokradel.json', 'ptaki')
po_lacinie = {SYNONIMY.get(g['lat'], g['lat']): g['id'] for g in gatunki}

wartosci = ' '.join(json.dumps(lat) for lat in po_lacinie)
zapytanie = f"""
SELECT ?lat ?jezyk ?nazwa ?zrodlo WHERE {{
  VALUES ?lat {{ {wartosci} }}
  ?takson wdt:P225 ?lat .
  {{ ?takson rdfs:label ?nazwa . BIND(LANG(?nazwa) AS ?jezyk) BIND("etykieta" AS ?zrodlo) }}
  UNION
  {{ ?artykul schema:about ?takson ; schema:inLanguage ?jezyk ; schema:name ?nazwa ;
              schema:isPartOf/wikibase:wikiGroup "wikipedia" . BIND("wikipedia" AS ?zrodlo) }}
  FILTER(STR(?jezyk) IN ({', '.join(json.dumps(j) for j in JEZYKI)}))
}}"""
url = 'https://query.wikidata.org/sparql?format=json&query=' + urllib.parse.quote(zapytanie)
for proba in range(4):
    try:
        odp = json.load(urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=60))
        break
    except Exception as e:
        if proba == 3:
            raise
        time.sleep(10 * (proba + 1))

nazwy = {g['id']: {} for g in gatunki}
# The label first; the Wikipedia article title only where the label is missing or is the Latin name.
for zrodlo in ('etykieta', 'wikipedia'):
    for w in odp['results']['bindings']:
        if w['zrodlo']['value'] != zrodlo:
            continue
        lat, jezyk, nazwa = w['lat']['value'], w['jezyk']['value'], w['nazwa']['value'].strip()
        if not nazwa or nazwa.lower() == lat.lower() or ' (' in nazwa or jezyk in nazwy[po_lacinie[lat]]:
            continue
        nazwy[po_lacinie[lat]][jezyk] = nazwa

brak = [g['lat'] for g in gatunki if not nazwy[g['id']]]
luki = sum(len(JEZYKI) - len(v) for v in nazwy.values())
with open(os.path.join(KORZEN, 'content', 'nazwy-gatunkow.json'), 'w') as f:
    json.dump({k: dict(sorted(v.items())) for k, v in sorted(nazwy.items())}, f, ensure_ascii=False, indent=1)
    f.write('\n')
pelne = sum(1 for v in nazwy.values() if len(v) == len(JEZYKI))
print(f'{len(nazwy)} species, {pelne} with all {len(JEZYKI)} languages, {luki} names missing in all; none found for: {brak or "-"}')
