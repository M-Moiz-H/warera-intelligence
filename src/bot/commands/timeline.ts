import { SlashCommandBuilder } from "discord.js";
import { supabase } from "../../database/supabase.js";
import { embed, n, text } from "./_utils.js";

export const data =
  new SlashCommandBuilder()
    .setName("timeline")
    .setDescription(
      "View historical WarEra intelligence and trends"
    )
    .addStringOption((option) =>
      option
        .setName("country")
        .setDescription(
          "Country to analyse historically"
        )
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("battle")
        .setDescription(
          "Battle ID to analyse historically"
        )
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("item")
        .setDescription(
          "Market item to analyse historically"
        )
        .setRequired(false)
    );

function numberOrNull(
  value: unknown
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function signedNumber(
  value: number
): string {
  return value > 0
    ? `+${n(value)}`
    : n(value);
}

function signedPercent(
  value: number
): string {
  return value > 0
    ? `+${value.toFixed(1)}%`
    : `${value.toFixed(1)}%`;
}

function percentChange(
  first: number,
  latest: number
): number | null {
  if (!Number.isFinite(first)) {
    return null;
  }

  if (first === 0) {
    return null;
  }

  return (
    ((latest - first) /
      Math.abs(first)) *
    100
  );
}

function relativeTime(
  value: string | null | undefined
): string {
  if (!value) {
    return "Unknown";
  }

  const time =
    new Date(value).getTime();

  if (!Number.isFinite(time)) {
    return "Unknown";
  }

  const difference =
    Date.now() - time;

  const minutes =
    Math.floor(
      difference / 60000
    );

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes} minute${
      minutes === 1 ? "" : "s"
    } ago`;
  }

  const hours =
    Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} hour${
      hours === 1 ? "" : "s"
    } ago`;
  }

  const days =
    Math.floor(hours / 24);

  return `${days} day${
    days === 1 ? "" : "s"
  } ago`;
}

async function resolveCountry(
  provider: any,
  query: string
) {
  const countries =
    await provider.countries();

  const normalized =
    query.trim().toLowerCase();

  const exact = countries.find(
    (country: any) =>
      String(country.id)
        .toLowerCase() ===
        normalized ||
      String(country.name)
        .toLowerCase() ===
        normalized ||
      String(
        country.code ?? ""
      )
        .toLowerCase() ===
        normalized
  );

  if (exact) {
    return exact;
  }

  return (
    countries.find((country: any) =>
      String(country.name)
        .toLowerCase()
        .includes(normalized)
    ) ?? null
  );
}

async function countryTimeline(
  interaction: any,
  ctx: any,
  query: string
) {
  const country =
    await resolveCountry(
      ctx.provider,
      query
    );

  if (!country) {
    return interaction.editReply(
      `⚠️ No country named **${text(
        query
      )}** was found.`
    );
  }

  const { data, error } =
    await supabase
      .from("country_snapshots")
      .select(
        `
        population,
        military_rank,
        economy_rank,
        captured_at
      `
      )
      .eq(
        "country_id",
        String(country.id)
      )
      .order(
        "captured_at",
        {
          ascending: true
        }
      );

  if (error) {
    throw error;
  }

  if (!data || data.length < 2) {
    return interaction.editReply({
      embeds: [
        embed(
          `📊 ${country.name.toUpperCase()} TIMELINE`,
          "Historical intelligence is still being collected for this country."
        )
          .setColor(0xf1c40f)
          .addFields({
            name: "📸 Snapshots Available",
            value: `**${data?.length ?? 0}**`,
            inline: true
          })
          .setFooter({
            text: "More scheduler cycles are required before a meaningful trend comparison is available."
          })
      ]
    });
  }

  const first =
    data[0];

  const latest =
    data[data.length - 1];

  const firstPopulation =
    numberOrNull(
      first.population
    );

  const latestPopulation =
    numberOrNull(
      latest.population
    );

  const firstMilitary =
    numberOrNull(
      first.military_rank
    );

  const latestMilitary =
    numberOrNull(
      latest.military_rank
    );

  const firstEconomy =
    numberOrNull(
      first.economy_rank
    );

  const latestEconomy =
    numberOrNull(
      latest.economy_rank
    );

  const populationChange =
    firstPopulation !== null &&
    latestPopulation !== null
      ? latestPopulation -
        firstPopulation
      : null;

  const populationPercent =
    firstPopulation !== null &&
    latestPopulation !== null
      ? percentChange(
          firstPopulation,
          latestPopulation
        )
      : null;

  const militaryChange =
    firstMilitary !== null &&
    latestMilitary !== null
      ? latestMilitary -
        firstMilitary
      : null;

  const economyChange =
    firstEconomy !== null &&
    latestEconomy !== null
      ? latestEconomy -
        firstEconomy
      : null;

  const militaryTrend =
    militaryChange === null
      ? "Unavailable"
      : militaryChange < 0
        ? `📈 Improved by **${Math.abs(
            militaryChange
          )}** rank`
        : militaryChange > 0
          ? `📉 Dropped by **${militaryChange}** rank`
          : "➖ No change";

  const economyTrend =
    economyChange === null
      ? "Unavailable"
      : economyChange < 0
        ? `📈 Improved by **${Math.abs(
            economyChange
          )}** rank`
        : economyChange > 0
          ? `📉 Dropped by **${economyChange}** rank`
          : "➖ No change";

  const populationTrend =
    populationChange === null
      ? "Unavailable"
      : `${signedNumber(
          populationChange
        )}${
          populationPercent !== null
            ? ` (${signedPercent(
                populationPercent
              )})`
            : ""
        }`;

  return interaction.editReply({
    embeds: [
      embed(
        `📈 ${country.name.toUpperCase()} HISTORICAL TIMELINE`,
        "Comparison between the earliest and latest stored intelligence snapshots."
      )
        .setColor(0x3498db)
        .addFields(
          {
            name: "📸 Snapshots",
            value: `**${data.length}**`,
            inline: true
          },
          {
            name: "🕐 Tracking Started",
            value: relativeTime(
              first.captured_at
            ),
            inline: true
          },
          {
            name: "🟢 Latest Snapshot",
            value: relativeTime(
              latest.captured_at
            ),
            inline: true
          },
          {
            name: "👥 Population",
            value:
              firstPopulation !== null &&
              latestPopulation !== null
                ? [
                    `**${n(
                      firstPopulation
                    )}** → **${n(
                      latestPopulation
                    )}**`,
                    populationTrend
                  ].join("\n")
                : "Unavailable",
            inline: false
          },
          {
            name: "🪖 Military Rank",
            value:
              firstMilitary !== null &&
              latestMilitary !== null
                ? [
                    `**${n(
                      firstMilitary
                    )}** → **${n(
                      latestMilitary
                    )}**`,
                    militaryTrend
                  ].join("\n")
                : "Unavailable",
            inline: true
          },
          {
            name: "💰 Economy Rank",
            value:
              firstEconomy !== null &&
              latestEconomy !== null
                ? [
                    `**${n(
                      firstEconomy
                    )}** → **${n(
                      latestEconomy
                    )}**`,
                    economyTrend
                  ].join("\n")
                : "Unavailable",
            inline: true
          }
        )
        .setFooter({
          text: "Historical changes are calculated from snapshots stored by WarEra Intelligence."
        })
    ]
  });
}

async function battleTimeline(
  interaction: any,
  battleId: string
) {
  const { data, error } =
    await supabase
      .from("battle_snapshots")
      .select(
        `
        attacker_damage,
        defender_damage,
        captured_at
      `
      )
      .eq(
        "battle_id",
        battleId.trim()
      )
      .order(
        "captured_at",
        {
          ascending: true
        }
      );

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    return interaction.editReply(
      `⚠️ No historical snapshots were found for battle \`${text(
        battleId
      )}\`.`
    );
  }

  const first =
    data[0];

  const latest =
    data[data.length - 1];

  const firstAttacker =
    numberOrNull(
      first.attacker_damage
    ) ?? 0;

  const firstDefender =
    numberOrNull(
      first.defender_damage
    ) ?? 0;

  const latestAttacker =
    numberOrNull(
      latest.attacker_damage
    ) ?? 0;

  const latestDefender =
    numberOrNull(
      latest.defender_damage
    ) ?? 0;

  const firstTotal =
    firstAttacker +
    firstDefender;

  const latestTotal =
    latestAttacker +
    latestDefender;

  const totalIncrease =
    latestTotal -
    firstTotal;

  const attackerIncrease =
    latestAttacker -
    firstAttacker;

  const defenderIncrease =
    latestDefender -
    firstDefender;

  let momentum = "Even";

  if (
    attackerIncrease >
    defenderIncrease
  ) {
    momentum = "Attacker";
  } else if (
    defenderIncrease >
    attackerIncrease
  ) {
    momentum = "Defender";
  }

  return interaction.editReply({
    embeds: [
      embed(
        "⚔️ BATTLE HISTORICAL TIMELINE",
        `Historical progression for battle \`${text(
          battleId
        )}\`.`
      )
        .setColor(0xed4245)
        .addFields(
          {
            name: "📸 Snapshots",
            value: `**${data.length}**`,
            inline: true
          },
          {
            name: "📈 Total Damage",
            value: `**${n(
              firstTotal
            )}** → **${n(
              latestTotal
            )}**`,
            inline: true
          },
          {
            name: "🔥 Damage Added",
            value: `**${signedNumber(
              totalIncrease
            )}**`,
            inline: true
          },
          {
            name: "🗡️ Attacker Progress",
            value: [
              `**${n(
                firstAttacker
              )}** → **${n(
                latestAttacker
              )}**`,
              `Change: **${signedNumber(
                attackerIncrease
              )}**`
            ].join("\n"),
            inline: true
          },
          {
            name: "🛡️ Defender Progress",
            value: [
              `**${n(
                firstDefender
              )}** → **${n(
                latestDefender
              )}**`,
              `Change: **${signedNumber(
                defenderIncrease
              )}**`
            ].join("\n"),
            inline: true
          },
          {
            name: "⚖️ Historical Momentum",
            value: `**${momentum}**`,
            inline: true
          }
        )
        .setFooter({
          text: `Tracking from ${relativeTime(
            first.captured_at
          )} to ${relativeTime(
            latest.captured_at
          )}`
        })
    ]
  });
}

async function marketTimeline(
  interaction: any,
  itemQuery: string
) {
  const query =
    itemQuery.trim();

  const { data, error } =
    await supabase
      .from("market_prices")
      .select(
        `
        item_id,
        item_name,
        price,
        currency,
        captured_at
      `
      )
      .ilike(
        "item_name",
        `%${query}%`
      )
      .order(
        "captured_at",
        {
          ascending: true
        }
      );

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    return interaction.editReply(
      `⚠️ No historical market data was found for **${text(
        query
      )}**.`
    );
  }

  const itemId =
    String(
      data[0].item_id
    );

  const rows =
    data.filter(
      (row) =>
        String(
          row.item_id
        ) === itemId
    );

  const first =
    rows[0];

  const latest =
    rows[rows.length - 1];

  const firstPrice =
    numberOrNull(
      first.price
    ) ?? 0;

  const latestPrice =
    numberOrNull(
      latest.price
    ) ?? 0;

  const change =
    latestPrice -
    firstPrice;

  const percent =
    percentChange(
      firstPrice,
      latestPrice
    );

  const prices =
    rows
      .map((row) =>
        numberOrNull(row.price)
      )
      .filter(
        (
          value
        ): value is number =>
          value !== null
      );

  const highest =
    prices.length
      ? Math.max(...prices)
      : 0;

  const lowest =
    prices.length
      ? Math.min(...prices)
      : 0;

  const currency =
    latest.currency
      ? ` ${latest.currency}`
      : "";

  const direction =
    change > 0
      ? "📈 Price increased"
      : change < 0
        ? "📉 Price decreased"
        : "➖ Price unchanged";

  return interaction.editReply({
    embeds: [
      embed(
        `💰 ${String(
          latest.item_name
        ).toUpperCase()} PRICE TIMELINE`,
        "Historical market movement based on stored WarEra price snapshots."
      )
        .setColor(0xf1c40f)
        .addFields(
          {
            name: "📸 Snapshots",
            value: `**${rows.length}**`,
            inline: true
          },
          {
            name: "📉 Lowest",
            value: `**${n(
              lowest
            )}${currency}**`,
            inline: true
          },
          {
            name: "📈 Highest",
            value: `**${n(
              highest
            )}${currency}**`,
            inline: true
          },
          {
            name: "💵 Price Movement",
            value: [
              `**${n(
                firstPrice
              )}${currency}** → **${n(
                latestPrice
              )}${currency}**`,
              `${direction}: **${signedNumber(
                change
              )}${currency}**${
                percent !== null
                  ? ` (${signedPercent(
                      percent
                    )})`
                  : ""
              }`
            ].join("\n"),
            inline: false
          }
        )
        .setFooter({
          text: `Historical market tracking from ${relativeTime(
            first.captured_at
          )}`
        })
    ]
  });
}

export async function execute(
  interaction: any,
  ctx: any
) {
  await interaction.deferReply();

  const country =
    interaction.options.getString(
      "country"
    );

  const battle =
    interaction.options.getString(
      "battle"
    );

  const item =
    interaction.options.getString(
      "item"
    );

  const supplied =
    [
      country,
      battle,
      item
    ].filter(Boolean);

  if (supplied.length === 0) {
    return interaction.editReply({
      embeds: [
        embed(
          "📊 HISTORICAL TIMELINE",
          "Choose a country, battle ID, or market item to analyse historical intelligence."
        )
          .setColor(0x3498db)
          .addFields(
            {
              name: "🌍 Country",
              value:
                "`/timeline country:Pakistan`",
              inline: false
            },
            {
              name: "⚔️ Battle",
              value:
                "`/timeline battle:<battle ID>`",
              inline: false
            },
            {
              name: "💰 Market",
              value:
                "`/timeline item:steel`",
              inline: false
            }
          )
      ]
    });
  }

  if (supplied.length > 1) {
    return interaction.editReply(
      "⚠️ Please provide only one timeline target at a time: country, battle, or item."
    );
  }

  try {
    if (country) {
      return await countryTimeline(
        interaction,
        ctx,
        country
      );
    }

    if (battle) {
      return await battleTimeline(
        interaction,
        battle
      );
    }

    if (item) {
      return await marketTimeline(
        interaction,
        item
      );
    }
  } catch (error) {
    console.error(
      "Timeline command failed:",
      error
    );

    return interaction.editReply(
      "⚠️ Historical intelligence could not be loaded right now."
    );
  }
}
