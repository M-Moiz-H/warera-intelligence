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
## Full-version data flow

The production bot uses a provider abstraction with the official WarEra API as the primary source and the configured Gateway as a fallback. Scheduled syncs store country and region intelligence in Supabase, while commands query live data for the most current view.

### Required database setup
Run `supabase/schema.sql` in the Supabase SQL Editor before deploying a fresh database.

### Security
Never commit `.env`, Discord tokens, Supabase service-role keys, or WarEra API keys. Use Railway variables in production.
