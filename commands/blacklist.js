const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const db = require("../database/db");
const { CORES } = require("../config/constants");
const { enviarLog } = require("../utils/helpers");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("blacklist")
    .setDescription("Gerenciar blacklist de jogadores")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(s => s
      .setName("add")
      .setDescription("Adiciona um jogador à blacklist")
      .addUserOption(o => o.setName("jogador").setDescription("Jogador a banir das filas").setRequired(true))
      .addStringOption(o => o.setName("motivo").setDescription("Motivo da blacklist").setRequired(true))
    )
    .addSubcommand(s => s
      .setName("remove")
      .setDescription("Remove um jogador da blacklist")
      .addUserOption(o => o.setName("jogador").setDescription("Jogador a remover").setRequired(true))
    )
    .addSubcommand(s => s
      .setName("list")
      .setDescription("Lista todos os jogadores na blacklist")
    ),

  async execute(interaction) {
    const { guild, options } = interaction;
    const sub = options.getSubcommand();
    const guildData = db.getGuild(guild.id);

    if (sub === "add") {
      const jogador = options.getUser("jogador");
      const motivo = options.getString("motivo");

      if (!guildData.blacklist) guildData.blacklist = {};
      guildData.blacklist[jogador.id] = {
        motivo,
        moderador: interaction.user.id,
        data: new Date().toISOString()
      };
      db.setGuild(guild.id, guildData);

      const embed = new EmbedBuilder()
        .setColor(CORES.ERRO)
        .setTitle("🚫 Blacklist — Jogador Banido")
        .setThumbnail(jogador.displayAvatarURL())
        .addFields(
          { name: "Jogador", value: "<@" + jogador.id + "> (" + jogador.username + ")", inline: true },
          { name: "Moderador", value: "<@" + interaction.user.id + ">", inline: true },
          { name: "Motivo", value: motivo, inline: false },
          { name: "Data", value: new Date().toLocaleDateString("pt-BR"), inline: true }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      await enviarLog(guild, CORES.ERRO, "🚫 Blacklist Aplicada", [
        { name: "Jogador", value: "<@" + jogador.id + ">", inline: true },
        { name: "Moderador", value: "<@" + interaction.user.id + ">", inline: true },
        { name: "Motivo", value: motivo, inline: false }
      ]);
      return;
    }

    if (sub === "remove") {
      const jogador = options.getUser("jogador");
      if (!guildData.blacklist?.[jogador.id]) {
        await interaction.reply({ content: "❌ Este jogador não está na blacklist.", ephemeral: true });
        return;
      }
      delete guildData.blacklist[jogador.id];
      db.setGuild(guild.id, guildData);

      const embed = new EmbedBuilder()
        .setColor(CORES.SUCESSO)
        .setTitle("✅ Blacklist — Jogador Removido")
        .addFields(
          { name: "Jogador", value: "<@" + jogador.id + "> (" + jogador.username + ")", inline: true },
          { name: "Removido por", value: "<@" + interaction.user.id + ">", inline: true }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      await enviarLog(guild, CORES.SUCESSO, "✅ Blacklist Removida", [
        { name: "Jogador", value: "<@" + jogador.id + ">", inline: true },
        { name: "Moderador", value: "<@" + interaction.user.id + ">", inline: true }
      ]);
      return;
    }

    if (sub === "list") {
      const bl = guildData.blacklist || {};
      const entries = Object.entries(bl);

      if (entries.length === 0) {
        await interaction.reply({
          embeds: [new EmbedBuilder().setColor(CORES.INFO).setTitle("📋 Blacklist").setDescription("Nenhum jogador na blacklist.")],
          ephemeral: true
        });
        return;
      }

      const lista = entries.map(([uid, info], i) => {
        const data = new Date(info.data).toLocaleDateString("pt-BR");
        return "**" + (i+1) + ".** <@" + uid + ">\n> 📌 " + info.motivo + "\n> 👮 <@" + info.moderador + "> • 📅 " + data;
      }).join("\n\n");

      const embed = new EmbedBuilder()
        .setColor(CORES.ERRO)
        .setTitle("🚫 Blacklist — " + guild.name)
        .setDescription(lista)
        .setFooter({ text: entries.length + " jogador(es) banido(s)" })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }
  }
};
