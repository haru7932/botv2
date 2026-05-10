const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const db = require("../database/db");
const { BOT_OWNER_ID, CORES } = require("../config/constants");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("license")
    .setDescription("Gerenciar licenças de servidores (apenas dono do bot)")
    .addSubcommand(s => s
      .setName("add")
      .setDescription("Adiciona licença a um servidor")
      .addStringOption(o => o.setName("guild_id").setDescription("ID do servidor").setRequired(true))
      .addIntegerOption(o => o.setName("dias").setDescription("Duração em dias (0 = permanente)").setRequired(false))
    )
    .addSubcommand(s => s
      .setName("remove")
      .setDescription("Remove licença de um servidor")
      .addStringOption(o => o.setName("guild_id").setDescription("ID do servidor").setRequired(true))
    )
    .addSubcommand(s => s
      .setName("info")
      .setDescription("Informações da licença de um servidor")
      .addStringOption(o => o.setName("guild_id").setDescription("ID do servidor (vazio = servidor atual)").setRequired(false))
    ),

  async execute(interaction) {
    // Apenas o dono do bot pode usar
    if (interaction.user.id !== BOT_OWNER_ID) {
      await interaction.reply({ content: "❌ Apenas o dono do bot pode usar este comando.", ephemeral: true });
      return;
    }

    const sub = interaction.options.getSubcommand();

    if (sub === "add") {
      const guildId = interaction.options.getString("guild_id");
      const dias = interaction.options.getInteger("dias") || 0;
      const expiry = dias > 0 ? new Date(Date.now() + dias * 86400000).toISOString() : null;

      db.setLicense(guildId, {
        ativadoPor: interaction.user.id,
        ativadoEm: new Date().toISOString(),
        expiry,
        dias: dias || "permanente"
      });

      const embed = new EmbedBuilder()
        .setColor(CORES.SUCESSO)
        .setTitle("✅ Licença Adicionada")
        .addFields(
          { name: "Servidor", value: guildId, inline: true },
          { name: "Duração", value: dias > 0 ? dias + " dias" : "Permanente", inline: true },
          { name: "Expira em", value: expiry ? new Date(expiry).toLocaleDateString("pt-BR") : "Nunca", inline: true }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (sub === "remove") {
      const guildId = interaction.options.getString("guild_id");
      db.removeLicense(guildId);
      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(CORES.ERRO)
          .setTitle("🗑️ Licença Removida")
          .setDescription("Servidor: `" + guildId + "`")
          .setTimestamp()],
        ephemeral: true
      });
      return;
    }

    if (sub === "info") {
      const guildId = interaction.options.getString("guild_id") || interaction.guild.id;
      const license = db.getLicense(guildId);
      const ativa = db.hasLicense(guildId);

      const embed = new EmbedBuilder()
        .setColor(ativa ? CORES.SUCESSO : CORES.ERRO)
        .setTitle("🔐 Informações da Licença")
        .addFields(
          { name: "Servidor", value: guildId, inline: true },
          { name: "Status", value: ativa ? "✅ Ativa" : "❌ Inativa/Expirada", inline: true }
        );

      if (license) {
        embed.addFields(
          { name: "Ativado por", value: "<@" + license.ativadoPor + ">", inline: true },
          { name: "Ativado em", value: new Date(license.ativadoEm).toLocaleDateString("pt-BR"), inline: true },
          { name: "Expira em", value: license.expiry ? new Date(license.expiry).toLocaleDateString("pt-BR") : "Nunca", inline: true }
        );
      }

      embed.setTimestamp();
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }
  }
};
