#!/bin/bash
if [ "$CF_PAGES_BRANCH" == "main" ]; then
    pnpm install && hugo --minify
else
    pnpm install && hugo --minify -b "$CF_PAGES_URL" --buildFuture
fi
