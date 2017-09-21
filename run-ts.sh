#!/usr/bin/env bash
BUILD=build
yarn run build
file=$1
jsfile=$BUILD/${file%ts}js
node $jsfile
