#!/bin/sh
# Downloads BirdNET Live's model and worker into public/birdnet/<commit>/, pinned to
# one commit of BirdNET-Team/real-time-pwa (code MIT, models CC BY-SA 4.0), for
# "Rozpoznaj po głosie" (/rozpoznaj/glos). TensorFlow.js is pinned on its own (TFJS:
# BirdNET Live ships 4.14.0 under that name, built from its package.json's ^4.22.0).
# The files are served as immutable (next.config.ts), so a new COMMIT gets a new
# folder: change WERSJA in src/components/RozpoznajGlos.tsx to match, then delete
# the old folder.
set -eu

COMMIT=6ab67ac09fa64d98858b90f14318229aca9bb7dc
TFJS=4.22.0
SRC="https://raw.githubusercontent.com/BirdNET-Team/real-time-pwa/$COMMIT/public"
OUT="$(dirname "$0")/../public/birdnet/$(echo "$COMMIT" | cut -c1-7)"

mkdir -p "$OUT/models/birdnet/area-model" "$OUT/models/birdnet/labels"
pobierz() { curl -fsSL "$1" -o "$2"; }

pobierz "$SRC/js/birdnet-worker.js" "$OUT/birdnet-worker.js"
pobierz "$SRC/js/audio-processor.js" "$OUT/audio-processor.js"
pobierz "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@$TFJS/dist/tf.min.js" "$OUT/tf.min.js"

pobierz "$SRC/models/birdnet/model.json" "$OUT/models/birdnet/model.json"
for i in $(seq 1 13); do
  pobierz "$SRC/models/birdnet/group1-shard${i}of13.bin" "$OUT/models/birdnet/group1-shard${i}of13.bin"
done
pobierz "$SRC/models/birdnet/area-model/model.json" "$OUT/models/birdnet/area-model/model.json"
for i in 1 2; do
  pobierz "$SRC/models/birdnet/area-model/group1-shard${i}of2.bin" "$OUT/models/birdnet/area-model/group1-shard${i}of2.bin"
done
# The worker reads the English list as its base and the Polish one for names.
for jezyk in en_us pl; do
  pobierz "$SRC/models/birdnet/labels/$jezyk.txt" "$OUT/models/birdnet/labels/$jezyk.txt"
done

du -sh "$OUT"
