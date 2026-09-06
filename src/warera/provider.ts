import type {
  Battle,
  BattleLiveData,
  BattleOrder,
  BattleOrderSide,
  BattleRankingEntry,
  BattleRankingInput,
  Country,
  Region
} from "../types/models.js";

export interface BattlesInput {
  isActive?: boolean;
  limit?: number;
  cursor?: string;
  direction?: "forward" | "backward";
  filter?: "all" | "yourCountry" | "yourEnemies";
  defenderRegionId?: string;
  warId?: string;
  countryId?: string;
}

export interface WarEraProvider {
  name: string;

  healthCheck(): Promise<boolean>;

  countries(): Promise<Country[]>;
  country(countryId: string): Promise<Country | null>;

  regions(): Promise<Region[]>;
  region(regionId: string): Promise<Region | null>;

  battles(input?: BattlesInput): Promise<Battle[]>;

  battle(battleId: string): Promise<Battle | null>;

  liveBattleData(
    battleId: string,
    roundNumber?: number
  ): Promise<BattleLiveData | null>;

  battleRanking(
    input: BattleRankingInput
  ): Promise<BattleRankingEntry[]>;

  battleOrders(
    battleId: string,
    side: BattleOrderSide
  ): Promise<BattleOrder[]>;

  events(
    input?: Record<string, unknown>
  ): Promise<unknown>;

  ranking(
    input?: Record<string, unknown>
  ): Promise<unknown>;

  militaryUnit(id: string): Promise<unknown>;

  party(id: string): Promise<unknown>;

  user(id: string): Promise<unknown>;

  marketPrices(
    input?: Record<string, unknown>
  ): Promise<unknown>;
}
