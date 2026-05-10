const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require("discord.js");
const db = require("../database/db");
const { CORES } = require("../config/constants");
const { enviarLog, getNome } = require("../utils/helpers");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("config")
    .setDescription("Configurações do servidor")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(s => s
      .setName("pix-chave")
      .setDescription("Define a chave Pix do servidor")
      .addStringOption(o => o.setName("chave").setDescription("Chave Pix (CPF, e-mail, telefone ou aleatória)").setRequired(true))
    )
    .addSubcommand(s => s
      .setName("pix-nome")
      .setDescription("Define o nome do recebedor Pix")
      .addStringOption(o => o.setName("nome").setDescription("Nome do recebedor").setRequired(true))
    )
    .addSubcommand(s => s
      .setName("pix-qrcode")
      .setDescription("Define a URL do QR Code Pix")
      .addStringOption(o => o.setName("url").setDescription("URL da imagem do QR Code").setRequired(true))
    )
    .addSubcommand(s => s
      .setName("logs")
      .setDescription("Define o canal de logs")
      .addChannelOption(o => o.setName("canal").setDescription("Canal para logs").addChannelTypes(ChannelType.GuildText).setRequired(true))
    )
    .addSubcommand(s => s
      .setName("logo")
      .setDescription("Define a URL da logo/thumbnail das embeds")
      .addStringOption(o => o.setName("url").setDescription("URL da imagem (deixe vazio para usar o ícone do servidor)").setRequired(false))
    )
    .addSubcommand(s => s
      .setName("cor")
      .setDescription("Define a cor das embeds (hex)")
      .addStringOption(o => o.setName("hex").setDescription("Ex: #5865f2 ou 0x5865f2").setRequired(true))
    )
    .addSubcommand(s => s
      .setName("nome")
      .setDescription("Define o nome da organização (aparece no rodapé das embeds)")
      .addStringOption(o => o.setName("nome").setDescription("Nome da organização").setRequired(true))
    )
    .addSubcommand(s => s
      .setName("ver")
      .setDescription("Veja as configurações atuais do servidor")
    ),

  async execute(interaction) {
    const { guild, options } = interaction;
    const sub = options.getSubcommand();
    const guildData = db.getGuild(guild.id);

    // ===== PIX CHAVE =====
    if (sub === "pix-chave") {
      const chave = options.getString("chave");
      db.updateGuild(guild.id, "pix.chave", chave);
      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(CORES.SUCESSO)
          .setTitle("✅ Chave Pix atualizada")
          .setDescription("```" + chave + "```")
          .setFooter({ text: guild.name })],
        ephemeral: true
      });
      await enviarLog(guild, CORES.INFO, "⚙️ Config: Chave Pix atualizada", [
        { name: "ADM", value: "<@" + interaction.user.id + ">", inline: true },
        { name: "Chave", value: chave.substring(0, 50), inline: true }
      ]);
      return;
    }

    // ===== PIX NOME =====
    if (sub === "pix-nome") {
      const nome = options.getString("nome");
      db.updateGuild(guild.id, "pix.nome", nome);
      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(CORES.SUCESSO)
          .setTitle("✅ Nome do recebedor atualizado")
          .setDescription("**" + nome + "**")
          .setFooter({ text: guild.name })],
        ephemeral: true
      });
      return;
    }

    // ===== PIX QRCODE =====
    if (sub === "pix-qrcode") {
      const url = options.getString("url");
      db.updateGuild(guild.id, "pix.qrcode", url);
      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(CORES.SUCESSO)
          .setTitle("✅ QR Code atualizado")
          .setImage(url)
          .setFooter({ text: guild.name })],
        ephemeral: true
      });
      return;
    }

    // ===== LOGS =====
    if (sub === "logs") {
      const canal = options.getChannel("canal");
      db.updateGuild(guild.id, "logs.channelId", canal.id);
      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(CORES.SUCESSO)
          .setTitle("✅ Canal de logs configurado")
          .setDescription("Logs serão enviados em " + canal.toString())
          .setFooter({ text: guild.name })],
        ephemeral: true
      });
      await enviarLog(guild, CORES.INFO, "⚙️ Canal de Logs Configurado", [
        { name: "ADM", value: "<@" + interaction.user.id + ">", inline: true },
        { name: "Canal", value: canal.toString(), inline: true }
      ]);
      return;
    }

    // ===== LOGO =====
    if (sub === "logo") {
      const url = options.getString("url");
      db.updateGuild(guild.id, "config.logo", url || null);
      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(CORES.SUCESSO)
          .setTitle("✅ Logo atualizada")
          .setDescription(url ? "Nova logo definida." : "Usando ícone do servidor.")
          .setThumbnail(url || guild.iconURL({ dynamic: true }))
          .setFooter({ text: guild.name })],
        ephemeral: true
      });
      return;
    }

    // ===== COR =====
    if (sub === "cor") {
      let hex = options.getString("hex").trim();
      if (!hex.startsWith("0x") && !hex.startsWith("#")) hex = "#" + hex;
      const corNum = parseInt(hex.replace("#", "").replace("0x", ""), 16);
      if (isNaN(corNum)) {
        await interaction.reply({ content: "❌ Cor inválida. Use formato `#5865f2` ou `0x5865f2`.", ephemeral: true });
        return;
      }
      db.updateGuild(guild.id, "config.cor", hex.replace("#", "0x"));
      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(corNum)
          .setTitle("✅ Cor das embeds atualizada")
          .setDescription("Nova cor: **" + hex + "**")
          .setFooter({ text: guild.name })],
        ephemeral: true
      });
      return;
    }

    // ===== NOME =====
    if (sub === "nome") {
      const nome = options.getString("nome");
      db.updateGuild(guild.id, "config.nome", nome);
      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(CORES.SUCESSO)
          .setTitle("✅ Nome da organização atualizado")
          .setDescription("**" + nome + "**")
          .setFooter({ text: nome })],
        ephemeral: true
      });
      return;
    }

    // ===== VER =====
    if (sub === "ver") {
      const g = db.getGuild(guild.id);
      const licenca = db.getLicense(guild.id);
      const embed = new EmbedBuilder()
        .setColor(CORES.INFO)
        .setTitle("Configurações — " + guild.name)
        .setThumbnail(guild.iconURL({ dynamic: true }))
        .addFields(
          { name: "Chave Pix", value: g.pix?.chave ? "```" + g.pix.chave.substring(0,40) + "...```" : "Não configurado", inline: false },
          { name: "Nome Recebedor", value: g.pix?.nome || "Não configurado", inline: true },
          { name: "QR Code", value: g.pix?.qrcode ? "✅ Configurado" : "❌ Não configurado", inline: true },
          { name: "Canal de Logs", value: g.logs?.channelId ? "<#" + g.logs.channelId + ">" : "Não configurado", inline: true },
          { name: "Cor", value: g.config?.cor || "0x2b2d31", inline: true },
          { name: "Nome Da Org.", value: g.config?.nome || guild.name, inline: true },
          { name: "Logo", value: g.config?.logo ? "✅ Personalizada" : "Ícone do servidor", inline: true },
          { name: "Licença", value: licenca ? "✅ Ativa" + (licenca.expiry ? " até " + new Date(licenca.expiry).toLocaleDateString("pt-BR") : " (permanente)") : "❌ Sem licença", inline: false }
        )
        .setTimestamp();
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }
  }
};
