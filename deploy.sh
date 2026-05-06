#!/bin/bash
# Deploy script for Cloudflare Pages
# Explicitly deploy dist folder to Pages, bypassing environment issues
npx wrangler pages deploy dist --project-name citesite
