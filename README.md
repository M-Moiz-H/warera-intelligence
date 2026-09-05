# ⚔️ WarEra Intelligence

A modular Discord intelligence platform for the WarEra browser game.

## Implemented architecture
- Discord slash commands and embeds
- Pakistan command center
- Occupation/resistance intelligence
- Battle/frontline data ingestion boundaries
- Country, region, event, ranking, MU, party, user and market modules
- Historical snapshots and event timeline
- Alert subscriptions and watchlists
- Supabase persistence
- Railway-ready deployment
- Background scheduler
- Provider health/status reporting
- Public tRPC provider abstraction

## Important
WarEra endpoint names are based on public community documentation and must be tested against current live responses before production use. The provider layer isolates that uncertainty in one place.

## Quick start
```bash
npm install
cp .env.example .env
npm run deploy:commands
npm run dev
```