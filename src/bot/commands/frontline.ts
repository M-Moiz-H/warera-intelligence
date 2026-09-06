import {
  SlashCommandBuilder
} from "discord.js";

import {
  liveCountry,
  pakistanBattles,
  battleAnalysis
} from "../../services/intel-service.js";

import {
  embed,
  text
} from "./_utils.js";

export const data =
  new SlashCommandBuilder()
    .setName("frontline")
    .setDescription(
      "Pakistan frontline and active battle intelligence"
    );

export async function execute(
  i: any,
  ctx: any
) {
  await i.deferReply();

  const pakistan =
    await liveCountry(
      ctx.provider,
      "Pakistan"
    );

  if (!pakistan) {
    return i.editReply(
      "⚠️ Pakistan was not found."
    );
  }

  const battles =
    await pakistanBattles(
      ctx.provider,
      pakistan.id
    );

  const lines = battles
    .slice(0, 10)
    .map((battle) => {
      const analysis =
        battleAnalysis(battle);

      const role =
        battle.attackerCountryId ===
          pakistan.id
          ? "ATTACKING"
          : battle.defenderCountryId ===
              pakistan.id
            ? "DEFENDING"
            : "INVOLVED";

      const live =
        battle.dataSource.liveLoaded
          ? "🟢 LIVE"
          : "🟡";

      return [
        `${live} **${text(
          battle.id
        )}**`,

        `Role: **${role}**`,

        `Status: **${text(
          battle.status ??
            "Unknown"
        )}**`,

        `Momentum: **${analysis.leader}**`,

        `Damage: **${analysis.attackerDamage.toLocaleString()} / ${analysis.defenderDamage.toLocaleString()}**`
      ].join(" • ");
    });

  return i.editReply({
    embeds: [
      embed(
        "⚔️ PAKISTAN FRONTLINE",

        lines.length
          ? lines.join("\n\n")
          : "🟢 No Pakistan-related active battles were confirmed by the live provider."
      )
    ]
  });
}
