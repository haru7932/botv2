const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");
const db = require("../database/db");
const { VALORES, MODO_DISPLAY, CORES } = require("../config/constants");
const { getThumb, getCor, getNome, checkLicense } = require("../utils/helpers");
const qm = require("../handlers/queueManager");

function buildFilaEmbed(guild, modo, valor) {
  const q = qm.getQueue(guild.id, modo, valor);
  const guildData = db.getGuild(guild.id);
  const cor = getCor(guild.id);
  const thumb = getThumb(guild);

  const normalList = q.normal.length > 0 ? q.normal.map(id => "<@" + id + ">").join("\n") : "Nenhum jogador na fila.";
  const infList    = q.inf.length    > 0 ? q.inf.map(id    => "<@" + id + ">").join("\n") : "Nenhum jogador na fila.";

  const embed = new EmbedBuilder()
    .setColor(cor)
    .setTitle("🎮 " + MODO_DISPLAY[modo] + " | R$ " + valor + ",00")
    .setThumbnail(thumb)
    .addFields(
      { name: " Gel Normal:", value: normalList },
      { name: " Gel Inf:", value: infList }
    )
    .setFooter({ text: getNome(guild) });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("normal_" + modo + "_" + valor)
      .setLabel("Gel Normal")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji({ name: "gel", id: "1502648300501864518" }),
    new ButtonBuilder()
      .setCustomId("inf_" + modo + "_" + valor)
      .setLabel("Gel Inf")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji({ name: "gel", id: "1502648300501864518" }),
    new ButtonBuilder()
      .setCustomId("sair_" + modo + "_" + valor)
      .setLabel("Sair")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("🚪")
  );

  return { embeds: [embed], components: [row] };
}

module.exports = {
  buildFilaEmbed,
  data: new SlashCommandBuilder()
    .setName("fila")
    .setDescription("Abre as filas de um modo (admin)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName("modo").setDescription("Modo de jogo").setRequired(true)
        .addChoices(
          { name: "1x1 Mobile",   value: "1x1mob"   },
          { name: "2x2 Mobile",   value: "2x2mob"   },
          { name: "3x3 Mobile",   value: "3x3mob"   },
          { name: "4x4 Mobile",   value: "4x4mob"   },
          { name: "1x1 Emulador", value: "1x1emu"   },
          { name: "2x2 Emulador", value: "2x2emu"   },
          { name: "3x3 Emulador", value: "3x3emu"   },
          { name: "4x4 Emulador", value: "4x4emu"   },
          { name: "2x2 Misto",    value: "2x2misto" },
          { name: "3x3 Misto",    value: "3x3misto" },
          { name: "4x4 Misto",    value: "4x4misto" }
        )
    ),

  async execute(interaction) {
    if (!checkLicense(interaction.guild.id)) {
      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(CORES.ERRO).setTitle("❌ Sem Licença").setDescription("Este servidor não possui uma licença ativa.\n\nContate o suporte para adquirir uma licença.")],
        ephemeral: true
      });
      return;
    }

    const modo = interaction.options.getString("modo");
    await interaction.reply({ content: "✅ Filas de **" + MODO_DISPLAY[modo] + "** abertas!", ephemeral: true });

    for (const valor of VALORES) {
      const msg = await interaction.channel.send(buildFilaEmbed(interaction.guild, modo, valor));
      qm.setFilaMsg(interaction.guild.id, modo, valor, msg);
    }
  }
};
