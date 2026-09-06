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
      "Analyze active battles"
    )
    .addStringOption((option) =>
      option
        .setName("id")
        .setDescription(
          "Battle ID (optional)"
        )
    );

export async function execute(
  i: any,
  ctx: any
) {
  await i.deferReply();

  const wanted =
    i.options.getString("id");

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
    return i.editReply(
      "⚠️ No matching battle was returned."
    );
  }

  const e = embed(
    "⚔️ BATTLE INTELLIGENCE"
  );

  for (
    const battle of battles.slice(
      0,
      5
    )
  ) {
    const analysis =
      battleAnalysis(battle);

    const detailStatus =
      battle.dataSource.detailLoaded
        ? "Detailed"
        : "Summary";

    const liveStatus =
      battle.dataSource.liveLoaded
        ? "Live"
        : "No live data";

    e.addFields({
      name: `Battle ${text(
        battle.id
      )}`,

      value: [
        `Status: **${text(
          battle.status ??
            "Unknown"
        )}**`,

        `Damage: **${analysis.attackerDamage.toLocaleString()} / ${analysis.defenderDamage.toLocaleString()}**`,

        `Momentum: **${analysis.leader}**`,

        `Data: ${detailStatus} • ${liveStatus}`,

        battle.regionId
          ? `Region: \`${text(
              battle.regionId
            )}\``
          : null
      ]
        .filter(Boolean)
        .join("\n")
    });
  }

  return i.editReply({
    embeds: [e]
  });
}
