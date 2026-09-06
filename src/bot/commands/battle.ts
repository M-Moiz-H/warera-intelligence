import {
  SlashCommandBuilder
} from "discord.js";

import {
  battleAnalysis,
  enrichedBattles
} from "../../services/intel-service.js";

import {
  embed,
  text
} from "./_utils.js";

export const data =
  new SlashCommandBuilder()
    .setName("battle")
    .setDescription(
      "Analyze live and recent battles"
    )
    .addStringOption((option) =>
      option
        .setName("id")
        .setDescription(
          "Specific battle ID (optional)"
        )
    );

function shortId(
  value: string
) {
  return value.length > 18
    ? `${value.slice(0, 18)}…`
    : value;
}

function battleColor(
  status: string | null | undefined,
  totalDamage: number
) {
  const value =
    (status ?? "").toLowerCase();

  if (
    value.includes("active") ||
    value.includes("ongoing") ||
    value.includes("live")
  ) {
    return 0xed4245;
  }

  if (totalDamage > 0) {
    return 0xfee75c;
  }

  return 0x5865f2;
}

export async function execute(
  interaction: any,
  ctx: any
) {
  await interaction.deferReply();

  const wanted =
    interaction.options.getString("id");

  const battles =
    await enrichedBattles(
      ctx.provider,
      {
        battleId:
          wanted ?? undefined,
        limit:
          wanted ? 1 : 10
      }
    );

  if (!battles.length) {
    return interaction.editReply(
      "⚠️ No matching battle was returned by the live provider."
    );
  }

  if (wanted) {
    const battle = battles[0];
    const analysis =
      battleAnalysis(battle);

    const liveLabel =
      battle.dataSource.liveLoaded
        ? "🟢 Live data loaded"
        : "🟡 Summary/detail data";

    const response = embed(
      "⚔️ BATTLE INTELLIGENCE",
      `**Battle:** \`${text(
        battle.id
      )}\`

${liveLabel}`
    )
      .setColor(
        battleColor(
          battle.status,
          analysis.hasDamageData
            ? analysis.totalDamage
            : 0
        )
      )
      .addFields(
        {
          name: "📊 Status",
          value: `**${text(
            battle.status,
            "Unavailable"
          )}**`,
          inline: true
        },
        {
          name: "🔥 Total Damage",
          value: analysis.hasDamageData
            ? `**${analysis.totalDamage.toLocaleString()}**`
            : "**Unavailable**",
          inline: true
        },
        {
          name: "⚖️ Momentum",
          value: `**${analysis.leader}**`,
          inline: true
        },
        {
          name: "🗡️ Attacker",
          value: analysis.hasAttackerDamage
            ? `Damage: **${analysis.attackerDamage.toLocaleString()}**
Share: **${analysis.attackerShare.toFixed(
                1
              )}%**`
            : "Damage: **Unavailable**",
          inline: true
        },
        {
          name: "🛡️ Defender",
          value: analysis.hasDefenderDamage
            ? `Damage: **${analysis.defenderDamage.toLocaleString()}**
Share: **${analysis.defenderShare.toFixed(
                1
              )}%**`
            : "Damage: **Unavailable**",
          inline: true
        },
        {
          name: "📡 Data Source",
          value: [
            battle.dataSource.detailLoaded
              ? "Detail: **Loaded**"
              : "Detail: **Unavailable**",
            battle.dataSource.liveLoaded
              ? "Live: **Loaded**"
              : "Live: **Unavailable**"
          ].join("\n"),
          inline: true
        }
      );

    if (battle.regionId) {
      response.addFields({
        name: "📍 Region",
        value: `\`${text(
          battle.regionId
        )}\``,
        inline: false
      });
    }

    return interaction.editReply({
      embeds: [response]
    });
  }

  const response = embed(
    "⚔️ BATTLE INTELLIGENCE",
    `Live overview of **${Math.min(
      battles.length,
      5
    )}** battle${
      Math.min(battles.length, 5) === 1
        ? ""
        : "s"
    }.`
  ).setColor(0x5865f2);

  for (const battle of battles.slice(0, 5)) {
    const analysis =
      battleAnalysis(battle);

    const dataLabel =
      battle.dataSource.liveLoaded
        ? "🟢 Live"
        : battle.dataSource.detailLoaded
          ? "🟡 Detailed"
          : "⚪ Summary";

    response.addFields({
      name: `⚔️ ${shortId(
        text(battle.id)
      )}`,

      value: [
        `📌 Status: **${text(
          battle.status,
          "Unavailable"
        )}**`,
        analysis.hasDamageData
          ? `🔥 Damage: **${analysis.attackerDamage.toLocaleString()} / ${analysis.defenderDamage.toLocaleString()}**`
          : "🔥 Damage: **Unavailable**",
        `⚖️ Momentum: **${analysis.leader}**`,
        `📡 ${dataLabel}`
      ].join("\n"),

      inline: false
    });
  }

  response.setFooter({
    text:
      "Tip: Use /battle id:<battle ID> for a detailed view"
  });

  return interaction.editReply({
    embeds: [response]
  });
}
