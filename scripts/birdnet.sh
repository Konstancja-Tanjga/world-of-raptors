#!/bin/sh
# Downloads BirdNET Live's model, worker and TensorFlow.js into public/birdnet/,
# pinned to one commit of BirdNET-Team/real-time-pwa (code MIT, models CC BY-SA 4.0),
# for "Rozpoznaj po głosie" (/rozpoznaj/glos). Run it again after changing COMMIT.
set -eu

COMMIT=6ab67ac09fa64d98858b90f14318229aca9bb7dc
TFJS=4.22.0
SRC="https://raw.githubusercontent.com/BirdNET-Team/real-time-pwa/$COMMIT/public"
OUT="$(dirname "$0")/../public/birdnet"

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
