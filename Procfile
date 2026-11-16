release: if [ "$EPRORATE_HEROKU_ROLE" = api ]; then cd server && exec node dist/cli.js migrate; fi
web: if [ "$EPRORATE_HEROKU_ROLE" = client ]; then exec node deploy/client.mjs; else cd server && exec node dist/main.js; fi
