#!/bin/bash
if [ "$CF_PAGES_BRANCH" == "main" ]; then
    npm install && hugo --minify
else
    npm install && hugo --minify -b "$CF_PAGES_URL" --buildFuture
fi
