#!/bin/bash

images="www/i"
base="512x512"

for size in "256x256" "128x128"; do
  for colour in "red" "green" "blue"; do
    src="$images/$base/$colour.png"
    dst="$images/$size/$colour.png"
    mkdir -p "$images/$size"
    echo "$src -> $dst"
    convert "$src" -resize "$size" "$dst"
  done
done

# vim:ts=2:sw=2:sts=2:et:ft=sh

