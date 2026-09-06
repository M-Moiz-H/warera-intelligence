export interface Country {
  id: string;
  name: string;
  code?: string;
  population?: number;
  militaryRank?: number;
  economyRank?: number;
  raw?: Record<string, unknown>;
}

export interface Region {
  id: string;
  name: string;
  countryId?: string | null;
  ownerCountryId?: string | null;
  isCore: boolean;
  resistance?: number;
  raw?: Record<string, unknown>;
}

export interface Battle {
  id: string;
  warId?: string | null;
  regionId?: string | null;

  attackerCountryId?: string | null;
  defenderCountryId?: string | null;

  attackerDamage?: number;
  defenderDamage?: number;

  currentRoundId?: string | null;
  status?: string | null;
  endsAt?: string | number | Date | null;

  raw?: Record<string, unknown>;
}

export interface BattleLiveData {
  battleId: string;
  roundNumber?: number | null;
  roundId?: string | null;

  attackerDamage?: number;
  defenderDamage?: number;

  attackerScore?: number;
  defenderScore?: number;

  status?: string | null;

  raw: Record<string, unknown>;
}

export type BattleRankingDataType =
  | "damage"
  | "points"
  | "money";

export type BattleRankingEntityType =
  | "user"
  | "country"
  | "mu";

export type BattleRankingSide =
  | "attacker"
  | "defender"
  | "merged";

export interface BattleRankingInput {
  dataType: BattleRankingDataType;
  type: BattleRankingEntityType;
  side: BattleRankingSide;

  battleId?: string;
  roundId?: string;
  warId?: string;
}

export interface BattleRankingEntry {
  id?: string;
  entityId?: string;
  name?: string;
  value?: number;
  rank?: number;
  raw: Record<string, unknown>;
}

export type BattleOrderSide =
  | "attacker"
  | "defender";

export interface BattleOrder {
  id?: string;
  battleId?: string;
  side?: BattleOrderSide | string;
  raw: Record<string, unknown>;
}
