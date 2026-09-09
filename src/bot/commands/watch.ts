import { SlashCommandBuilder } from "discord.js";
import { supabase } from "../../database/supabase.js";
import { embed, text } from "./_utils.js";

type WatchlistType =
  | "country"
  | "battle"
  | "item";

export const data =
  new SlashCommandBuilder()
    .setName("watchlist")
    .setDescription(
      "Manage your server's WarEra intelligence watchlist"
    )
    .addStringOption((option) =>
      option
        .setName("action")
        .setDescription(
          "What do you want to do?"
        )
        .setRequired(true)
        .addChoices(
          {
            name: "Add country",
            value: "add_country"
          },
          {
            name: "Add battle",
            value: "add_battle"
          },
          {
            name: "Add market item",
            value: "add_item"
          },
          {
            name: "List watchlist",
            value: "list"
          },
          {
            name: "Remove target",
            value: "remove"
          }
        )
    )
    .addStringOption((option) =>
      option
        .setName("target")
        .setDescription(
          "Country name, battle ID, market item, or watchlist target to remove"
        )
        .setRequired(false)
    );

function normalize(
  value: string
): string {
  return value
    .trim()
    .toLowerCase();
}

function watchlistIcon(
  type: string
): string {
  switch (type) {
    case "country":
      return "🌍";

    case "battle":
      return "⚔️";

    case "item":
      return "💰";

    default:
      return "📌";
  }
}

function watchlistTypeName(
  type: string
): string {
  switch (type) {
    case "country":
      return "Country";

    case "battle":
      return "Battle";

    case "item":
      return "Market Item";

    default:
      return "Unknown";
  }
}

async function resolveCountry(
  provider: any,
  query: string
) {
  const countries =
    await provider.countries();

  const normalized =
    normalize(query);

  const exact = countries.find(
    (country: any) =>
      normalize(
        String(country.name ?? "")
      ) === normalized ||
      normalize(
        String(country.code ?? "")
      ) === normalized ||
      String(country.id ?? "") ===
        query.trim()
  );

  if (exact) {
    return exact;
  }

  return (
    countries.find((country: any) =>
      normalize(
        String(country.name ?? "")
      ).includes(normalized)
    ) ?? null
  );
}

async function addWatchlist(
  guildId: string,
  type: WatchlistType,
  entityId: string,
  label: string
) {
  const { data: existing, error: existingError } =
    await supabase
      .from("watchlists")
      .select("id")
      .eq("guild_id", guildId)
      .eq("entity_type", type)
      .eq("entity_id", entityId)
      .limit(1);

  if (existingError) {
    throw existingError;
  }

  if (
    existing &&
    existing.length > 0
  ) {
    return {
      created: false
    };
  }

  const { error } =
    await supabase
      .from("watchlists")
      .insert({
        guild_id: guildId,
        entity_type: type,
        entity_id: entityId,
        label
      });

  if (error) {
    throw error;
  }

  return {
    created: true
  };
}

async function addCountryWatchlist(
  interaction: any,
  ctx: any,
  guildId: string,
  target: string
) {
  const country =
    await resolveCountry(
      ctx.provider,
      target
    );

  if (!country) {
    return interaction.editReply(
      `⚠️ I couldn't find a country matching **${text(
        target
      )}**.`
    );
  }

  const result =
    await addWatchlist(
      guildId,
      "country",
      String(country.id),
      String(country.name)
    );

  if (!result.created) {
    return interaction.editReply(
      `⚠️ **${text(
        country.name
      )}** is already on this server's watchlist.`
    );
  }

  return interaction.editReply({
    embeds: [
      embed(
        "👀 WATCHLIST UPDATED",
        "A new country is now being monitored by this server."
      )
        .setColor(0x57f287)
        .addFields(
          {
            name: "🌍 Target",
            value: `**${text(
              country.name
            )}**`,
            inline: true
          },
          {
            name: "📌 Type",
            value: "Country",
            inline: true
          },
          {
            name: "🚨 Future Monitoring",
            value:
              "Historical changes and important intelligence events will be monitored.",
            inline: false
          }
        )
    ]
  });
}

async function addBattleWatchlist(
  interaction: any,
  guildId: string,
  target: string
) {
  const battleId =
    target.trim();

  if (!battleId) {
    return interaction.editReply(
      "⚠️ Please provide a valid battle ID."
    );
  }

  const result =
    await addWatchlist(
      guildId,
      "battle",
      battleId,
      battleId
    );

  if (!result.created) {
    return interaction.editReply(
      `⚠️ Battle \`${text(
        battleId
      )}\` is already on this server's watchlist.`
    );
  }

  return interaction.editReply({
    embeds: [
      embed(
        "👀 WATCHLIST UPDATED",
        "A battle is now being monitored by this server."
      )
        .setColor(0x57f287)
        .addFields(
          {
            name: "⚔️ Battle ID",
            value: `\`${text(
              battleId
            )}\``,
            inline: false
          },
          {
            name: "🚨 Future Monitoring",
            value:
              "Damage changes and battle momentum will be monitored.",
            inline: false
          }
        )
    ]
  });
}

async function addItemWatchlist(
  interaction: any,
  guildId: string,
  target: string
) {
  const item =
    normalize(target);

  if (!item) {
    return interaction.editReply(
      "⚠️ Please provide a valid market item."
    );
  }

  const result =
    await addWatchlist(
      guildId,
      "item",
      item,
      item
    );

  if (!result.created) {
    return interaction.editReply(
      `⚠️ **${text(
        item
      )}** is already on this server's watchlist.`
    );
  }

  return interaction.editReply({
    embeds: [
      embed(
        "👀 WATCHLIST UPDATED",
        "A market item is now being monitored by this server."
      )
        .setColor(0x57f287)
        .addFields(
          {
            name: "💰 Market Item",
            value: `**${text(
              item
            )}**`,
            inline: true
          },
          {
            name: "📌 Type",
            value: "Market Item",
            inline: true
          },
          {
            name: "🚨 Future Monitoring",
            value:
              "Price changes and significant market movement will be monitored.",
            inline: false
          }
        )
    ]
  });
}

async function listWatchlist(
  interaction: any,
  guildId: string
) {
  const { data, error } =
    await supabase
      .from("watchlists")
      .select(
        `
        id,
        entity_type,
        entity_id,
        label,
        created_at
      `
      )
      .eq("guild_id", guildId)
      .order(
        "created_at",
        {
          ascending: false
        }
      );

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    return interaction.editReply({
      embeds: [
        embed(
          "👀 SERVER WATCHLIST",
          "This server is not monitoring anything yet."
        )
          .setColor(0x5865f2)
          .addFields({
            name: "💡 Get Started",
            value: [
              "`/watchlist action:Add country target:Pakistan`",
              "`/watchlist action:Add battle target:<battle ID>`",
              "`/watchlist action:Add market item target:steel`"
            ].join("\n")
          })
      ]
    });
  }

  const grouped = {
    country: data.filter(
      (entry) =>
        entry.entity_type ===
        "country"
    ),
    battle: data.filter(
      (entry) =>
        entry.entity_type ===
        "battle"
    ),
    item: data.filter(
      (entry) =>
        entry.entity_type ===
        "item"
    )
  };

  const fields: any[] = [];

  for (const type of [
    "country",
    "battle",
    "item"
  ] as WatchlistType[]) {
    const entries =
      grouped[type];

    if (entries.length === 0) {
      continue;
    }

    const content =
      entries
        .slice(0, 10)
        .map(
          (entry, index) =>
            `${index + 1}. ${
              watchlistIcon(type)
            } **${text(
              entry.label ??
                entry.entity_id
            )}**`
        )
        .join("\n");

    fields.push({
      name: `${
        watchlistIcon(type)
      } ${watchlistTypeName(
        type
      )} Watchlist (${entries.length})`,
      value: content,
      inline: false
    });
  }

  return interaction.editReply({
    embeds: [
      embed(
        "👀 SERVER WATCHLIST",
        "Targets currently being monitored by WarEra Intelligence."
      )
        .setColor(0x5865f2)
        .addFields(
          {
            name: "📊 Total Targets",
            value: `**${data.length}**`,
            inline: true
          },
          {
            name: "🚨 Alert Engine",
            value: "Coming next",
            inline: true
          },
          ...fields
        )
        .setFooter({
          text: "Use /watchlist action:remove target:<name or ID> to stop monitoring a target."
        })
    ]
  });
}

async function removeWatchlist(
  interaction: any,
  guildId: string,
  target: string
) {
  const normalized =
    normalize(target);

  const { data: entries, error } =
    await supabase
      .from("watchlists")
      .select(
        `
        id,
        entity_type,
        entity_id,
        label
      `
      )
      .eq("guild_id", guildId);

  if (error) {
    throw error;
  }

  const matches =
    (entries ?? []).filter(
      (entry) =>
        normalize(
          String(
            entry.label ?? ""
          )
        ) === normalized ||
        normalize(
          String(
            entry.entity_id ?? ""
          )
        ) === normalized
    );

  if (matches.length === 0) {
    return interaction.editReply(
      `⚠️ No watchlist target matching **${text(
        target
      )}** was found.`
    );
  }

  const ids =
    matches.map(
      (entry) => entry.id
    );

  const { error: deleteError } =
    await supabase
      .from("watchlists")
      .delete()
      .in("id", ids);

  if (deleteError) {
    throw deleteError;
  }

  const removed =
    matches
      .map(
        (entry) =>
          `${
            watchlistIcon(
              entry.entity_type
            )
          } **${text(
            entry.label ??
              entry.entity_id
          )}**`
      )
      .join("\n");

  return interaction.editReply({
    embeds: [
      embed(
        "🗑️ WATCHLIST UPDATED",
        "The following targets are no longer being monitored."
      )
        .setColor(0xed4245)
        .addFields({
          name: "Removed",
          value: removed
        })
    ]
  });
}

export async function execute(
  interaction: any,
  ctx: any
) {
  await interaction.deferReply();

  const guildId =
    interaction.guildId;

  if (!guildId) {
    return interaction.editReply(
      "⚠️ `/watchlist` can currently only be used inside a Discord server."
    );
  }

  const action =
    interaction.options.getString(
      "action",
      true
    );

  const target =
    interaction.options.getString(
      "target"
    );

  try {
    switch (action) {
      case "list":
        return await listWatchlist(
          interaction,
          guildId
        );

      case "add_country":
        if (!target) {
          return interaction.editReply(
            "⚠️ Please provide a country name."
          );
        }

        return await addCountryWatchlist(
          interaction,
          ctx,
          guildId,
          target
        );

      case "add_battle":
        if (!target) {
          return interaction.editReply(
            "⚠️ Please provide a battle ID."
          );
        }

        return await addBattleWatchlist(
          interaction,
          guildId,
          target
        );

      case "add_item":
        if (!target) {
          return interaction.editReply(
            "⚠️ Please provide a market item."
          );
        }

        return await addItemWatchlist(
          interaction,
          guildId,
          target
        );

      case "remove":
        if (!target) {
          return interaction.editReply(
            "⚠️ Please provide the name or ID of the target you want to remove."
          );
        }

        return await removeWatchlist(
          interaction,
          guildId,
          target
        );

      default:
        return interaction.editReply(
          "⚠️ Unknown watchlist action."
        );
    }
  } catch (error) {
    console.error(
      "Watchlist command failed:",
      error
    );

    return interaction.editReply(
      "⚠️ The watchlist operation could not be completed right now."
    );
  }
}
