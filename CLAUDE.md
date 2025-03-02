# Trystero Development Guide

## Commands
- Build bundle: `npm run build`
- Run tests: `npm run test`
- Run single test: `npx playwright test test/[test-file].spec.js`
- Test with proxy: `npm run test-proxy`
- Test ICE servers: `npm run test-ice`
- Test relays: `npm run test-relays`

## Code Style
- ES Modules with import/export
- Camel case for variables and functions
- No semicolons
- Single quotes for strings
- No trailing commas
- Arrow functions preferred
- 2-space indentation
- Max line length: 80 characters
- Use const/let, never var
- Name conventions: descriptive, concise
- Error handling: use early returns and avoid nested conditionals

## API Structure
Trystero exposes joinRoom() and selfId with multiple backends:
- torrent (BitTorrent)
- nostr (default)
- mqtt
- firebase
- supabase
- ipfs