# WarEra API integration

The project uses `src/warera/trpc-client.ts` as the single HTTP boundary.

Documented community procedures include:
- country.getAllCountries
- country.getCountryById
- region.getRegionsObject
- region.getById
- battle.getBattles
- battle.getById
- battle.getLiveBattleData
- event.getEventsPaginated
- ranking.getRanking
- mu.getById
- party.getById
- user.getUserLite
- user.getUsersByCountry
- itemTrading.getPrices

Test current endpoint input/output formats before relying on them in production.