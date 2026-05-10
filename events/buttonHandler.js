const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, PermissionFlagsBits, ChannelType } = require("discord.js");
const db = require("../database/db");
const { MODO_DISPLAY, MODOS_VALIDOS, VALORES, CORES } = require("../config/constants");
const { getThumb, getCor, getNome, enviarDM, enviarLog, checkLicense } = require("../utils/helpers");
const qm = require("../handlers/queueManager");
const { buildFilaEmbed } = require("../commands/fila");

async function atualizarFila(guild, modo, valor) {
  try {
    const msg = qm.getFilaMsg(guild.id, modo, valor);
    if (msg) await msg.edit(buildFilaEmbed(guild, modo, valor));
  } catch (e) { console.error("Erro ao atualizar fila:", e.message); }
}

async function criarCanalPartida(guild, client, p1, p2, modo, valor, tipo) {
  try {
    const canal = await guild.channels.create({
      name: "partida-" + Math.floor(Math.random() * 999999),
      type: ChannelType.GuildText,
      permissionOverwrites: [
        { id: guild.id,        deny:  [PermissionFlagsBits.ViewChannel] },
        { id: p1,              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
        { id: p2,              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
        { id: client.user.id,  allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
      ],
    });

    qm.setPartida(canal.id, { p1, p2, valor, modo, tipo, pagamentos: [], guildId: guild.id });

    const embed = new EmbedBuilder()
      .setColor(getCor(guild.id))
      .setTitle("⚔️ Partida Encontrada!")
      .setThumbnail(getThumb(guild))
      .addFields(
        { name: "Modo",      value: MODO_DISPLAY[modo] + " — " + tipo, inline: true },
        { name: "Valor",     value: "R$ " + valor + ",00",              inline: true },
        { name: "Jogadores", value: "<@" + p1 + "> vs <@" + p2 + ">",  inline: false }
      )
      .setDescription("Ambos precisam confirmar para a partida começar.\n\nClique em **Confirmar** ou **Cancelar**.")
      .setFooter({ text: getNome(guild) });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("confirmar_" + canal.id).setLabel("Confirmar").setStyle(ButtonStyle.Success).setEmoji("✅"),
      new ButtonBuilder().setCustomId("cancelar_"  + canal.id).setLabel("Cancelar") .setStyle(ButtonStyle.Danger) .setEmoji("❌")
    );

    await canal.send({ content: "<@" + p1 + "> <@" + p2 + ">", embeds: [embed], components: [row] });

    const link = "<#" + canal.id + ">";
    await enviarDM(client, p1, "⚔️ Seu adversário foi encontrado! Acesse: " + link);
    await enviarDM(client, p2, "⚔️ Seu adversário foi encontrado! Acesse: " + link);

    await enviarLog(guild, CORES.SUCESSO, "⚔️ Partida Encontrada", [
      { name: "Jogadores", value: "<@" + p1 + "> vs <@" + p2 + ">", inline: false },
      { name: "Modo",      value: MODO_DISPLAY[modo], inline: true },
      { name: "Valor",     value: "R$ " + valor + ",00", inline: true },
      { name: "Tipo",      value: tipo,   inline: true },
      { name: "Canal",     value: link,   inline: false }
    ]);

  } catch (err) { console.error("Erro ao criar canal:", err); }
}

async function enviarPix(canal, partida, guild) {
  const guildData = db.getGuild(guild.id);
  const chave  = guildData.pix?.chave  || "Não configurado — use /config pix-chave";
  const qrcode = guildData.pix?.qrcode || null;
  const nome   = guildData.pix?.nome   || getNome(guild);

  const embed = new EmbedBuilder()
    .setColor(CORES.PIX)
    .setTitle("💰 Realize o Pagamento PIX")
    .setDescription(
      "**Valor:** R$ " + partida.valor + ",00 cada\n\n" +
      "**Bancos aceitos:**\n" +
      "INTER • PICPAY • MERCADO PAGO\n" +
      "NEXT/BRADESCO • SANTANDER\n" +
      "INFINITE PAY • RECARGAPAY • 99PAY\n\n" +
      "📎 Mande o comprovante ou o **nome do PIX + banco**\n\n" +
      "Após pagar clique no botão **Já paguei** abaixo."
    )
    .setFooter({ text: nome });

  if (qrcode) embed.setImage(qrcode);

  const rowPix = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("pagou_" + canal.id).setLabel("Já paguei").setStyle(ButtonStyle.Success).setEmoji("✅")
  );

  await canal.send({ embeds: [embed], components: [rowPix] });
  await canal.send("```\n" + chave + "\n```");

  const rowFechar = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("fechar_" + canal.id).setLabel("Fechar Sala").setStyle(ButtonStyle.Danger).setEmoji("🔒")
  );
  await canal.send({ content: "🔒 **Apenas ADMs** — clique para encerrar este canal.", components: [rowFechar] });

  await enviarLog(guild, CORES.PIX, "💰 Pagamento Iniciado", [
    { name: "Jogadores", value: "<@" + partida.p1 + "> vs <@" + partida.p2 + ">", inline: false },
    { name: "Valor",     value: "R$ " + partida.valor + ",00", inline: true },
    { name: "Canal",     value: "<#" + canal.id + ">",         inline: true }
  ]);
}

module.exports = {
  name: "interactionCreate",
  async execute(interaction, client) {
    if (!interaction.isButton()) return;

    const userId   = interaction.user.id;
    const customId = interaction.customId;
    const guild    = interaction.guild;

    // ===== CONFIRMAR =====
    if (customId.startsWith("confirmar_") && !customId.includes("done")) {
      const canalId = customId.replace("confirmar_", "");
      const partida = qm.getPartida(canalId);
      if (!partida) return;

      if (userId !== partida.p1 && userId !== partida.p2) {
        await interaction.reply({ content: "❌ Você não faz parte desta partida.", ephemeral: true });
        return;
      }
      if (!partida.confirmacoes) partida.confirmacoes = [];
      if (partida.confirmacoes.includes(userId)) {
        await interaction.reply({ content: "⏳ Você já confirmou, aguardando o outro jogador.", ephemeral: true });
        return;
      }
      partida.confirmacoes.push(userId);
      await interaction.reply({ content: "✅ Confirmado! Aguardando o outro jogador...", ephemeral: true });

      if (partida.confirmacoes.length >= 2) {
        const embedOk = EmbedBuilder.from(interaction.message.embeds[0])
          .setColor(CORES.SUCESSO)
          .setDescription("✅ Ambos confirmaram! Partida iniciada.");
        const rowOff = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("confirmar_done").setLabel("Confirmado").setStyle(ButtonStyle.Success).setEmoji("✅").setDisabled(true),
          new ButtonBuilder().setCustomId("cancelar_done") .setLabel("Cancelar")  .setStyle(ButtonStyle.Danger) .setEmoji("❌").setDisabled(true)
        );
        await interaction.message.edit({ embeds: [embedOk], components: [rowOff] });
        await enviarPix(interaction.channel, partida, guild);
      }
      return;
    }

    // ===== CANCELAR =====
    if (customId.startsWith("cancelar_") && !customId.includes("done")) {
      const canalId = customId.replace("cancelar_", "");
      const partida = qm.getPartida(canalId);
      if (!partida) return;

      if (userId !== partida.p1 && userId !== partida.p2) {
        await interaction.reply({ content: "❌ Você não faz parte desta partida.", ephemeral: true });
        return;
      }

      const embedCancelado = EmbedBuilder.from(interaction.message.embeds[0])
        .setColor(CORES.ERRO)
        .setDescription("❌ Partida cancelada por <@" + userId + ">.\nEste canal será deletado em **5 segundos**.");
      const rowOff = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("confirmar_done").setLabel("Confirmar").setStyle(ButtonStyle.Success).setEmoji("✅").setDisabled(true),
        new ButtonBuilder().setCustomId("cancelar_done") .setLabel("Cancelado").setStyle(ButtonStyle.Danger) .setEmoji("❌").setDisabled(true)
      );
      await interaction.update({ embeds: [embedCancelado], components: [rowOff] });

      await enviarLog(guild, CORES.ERRO, "❌ Partida Cancelada", [
        { name: "Cancelado por", value: "<@" + userId + ">",              inline: true },
        { name: "Modo",          value: MODO_DISPLAY[partida.modo],       inline: true },
        { name: "Valor",         value: "R$ " + partida.valor + ",00",    inline: true }
      ]);

      setTimeout(async () => {
        try { qm.deletePartida(canalId); await interaction.channel.delete(); } catch (e) {}
      }, 5000);
      return;
    }

    // ===== FECHAR SALA =====
    if (customId.startsWith("fechar_")) {
      const membro = await guild.members.fetch(userId);
      if (!membro.permissions.has(PermissionFlagsBits.Administrator)) {
        await interaction.reply({ content: "❌ Apenas ADMs podem fechar a sala.", ephemeral: true });
        return;
      }
      const canalId = customId.replace("fechar_", "");
      const partida = qm.getPartida(canalId);
      await interaction.reply({ content: "🔒 Canal encerrado por <@" + userId + ">. Deletando em **5 segundos**..." });

      await enviarLog(guild, CORES.CINZA, "🔒 Sala Fechada pelo ADM", [
        { name: "ADM",   value: "<@" + userId + ">",           inline: true },
        { name: "Canal", value: interaction.channel.name,       inline: true },
        ...(partida ? [
          { name: "Jogadores", value: "<@" + partida.p1 + "> vs <@" + partida.p2 + ">", inline: false },
          { name: "Modo",      value: MODO_DISPLAY[partida.modo], inline: true },
          { name: "Valor",     value: "R$ " + partida.valor + ",00", inline: true }
        ] : [])
      ]);

      setTimeout(async () => {
        try { qm.deletePartida(canalId); await interaction.channel.delete(); } catch (e) {}
      }, 5000);
      return;
    }

    // ===== JÁ PAGUEI =====
    if (customId.startsWith("pagou_")) {
      const canalId = customId.replace("pagou_", "");
      const partida = qm.getPartida(canalId);
      if (!partida) return;
      if (partida.pagamentos.includes(userId)) {
        await interaction.reply({ content: "⏳ Você já marcou como pago, aguarde confirmação do ADM.", ephemeral: true });
        return;
      }
      partida.pagamentos.push(userId);
      await interaction.reply({ content: "⏳ Pagamento enviado, aguardando confirmação do ADM.", ephemeral: true });
      return;
    }

    // ===== GEL NORMAL =====
    if (customId.startsWith("normal_")) {
      if (!checkLicense(guild.id)) {
        await interaction.reply({ content: "❌ Servidor sem licença ativa.", ephemeral: true });
        return;
      }
      const guildData = db.getGuild(guild.id);
      if (guildData.blacklist?.[userId]) {
        const bl = guildData.blacklist[userId];
        await interaction.reply({
          embeds: [new EmbedBuilder().setColor(CORES.ERRO).setTitle("🚫 Você está na blacklist").addFields(
            { name: "Motivo", value: bl.motivo, inline: false },
            { name: "Data",   value: new Date(bl.data).toLocaleDateString("pt-BR"), inline: true }
          )],
          ephemeral: true
        });
        return;
      }

      const partes = customId.replace("normal_", "").split("_");
      const valor  = parseInt(partes[partes.length - 1]);
      const modo   = partes.slice(0, -1).join("_");
      const q      = qm.getQueue(guild.id, modo, valor);

      if (q.normal.includes(userId)) {
        await interaction.reply({ content: "Você já está nessa fila!", ephemeral: true });
        return;
      }

      qm.removeFromAllQueues(guild.id, userId);
      q.normal.push(userId);

      await enviarDM(client, userId, "✅ Você entrou na fila **" + MODO_DISPLAY[modo] + " | R$ " + valor + ",00 | Gelo Normal**.");
      await enviarLog(guild, CORES.INFO, "📥 Entrou na Fila", [
        { name: "Jogador", value: "<@" + userId + ">",         inline: true },
        { name: "Modo",    value: MODO_DISPLAY[modo],          inline: true },
        { name: "Valor",   value: "R$ " + valor + ",00",       inline: true },
        { name: "Tipo",    value: "Gelo Normal",                 inline: true }
      ]);

      await interaction.update(buildFilaEmbed(guild, modo, valor));
      await atualizarFila(guild, modo, valor);

      if (q.normal.length >= 2) {
        const [p1, p2] = q.normal.splice(0, 2);
        await atualizarFila(guild, modo, valor);
        await criarCanalPartida(guild, client, p1, p2, modo, valor, "Gel Normal");
      }
      return;
    }

    // ===== GEL INF =====
    if (customId.startsWith("inf_")) {
      if (!checkLicense(guild.id)) {
        await interaction.reply({ content: "❌ Servidor sem licença ativa.", ephemeral: true });
        return;
      }
      const guildData = db.getGuild(guild.id);
      if (guildData.blacklist?.[userId]) {
        const bl = guildData.blacklist[userId];
        await interaction.reply({
          embeds: [new EmbedBuilder().setColor(CORES.ERRO).setTitle("🚫 Você está na blacklist").addFields(
            { name: "Motivo", value: bl.motivo, inline: false },
            { name: "Data",   value: new Date(bl.data).toLocaleDateString("pt-BR"), inline: true }
          )],
          ephemeral: true
        });
        return;
      }

      const partes = customId.replace("inf_", "").split("_");
      const valor  = parseInt(partes[partes.length - 1]);
      const modo   = partes.slice(0, -1).join("_");
      const q      = qm.getQueue(guild.id, modo, valor);

      if (q.inf.includes(userId)) {
        await interaction.reply({ content: "Você já está nessa fila!", ephemeral: true });
        return;
      }

      qm.removeFromAllQueues(guild.id, userId);
      q.inf.push(userId);

      await enviarDM(client, userId, "✅ Você entrou na fila **" + MODO_DISPLAY[modo] + " | R$ " + valor + ",00 | Gel Infinito**.");
      await enviarLog(guild, CORES.INFO, "📥 Entrou na Fila", [
        { name: "Jogador", value: "<@" + userId + ">",   inline: true },
        { name: "Modo",    value: MODO_DISPLAY[modo],    inline: true },
        { name: "Valor",   value: "R$ " + valor + ",00", inline: true },
        { name: "Tipo",    value: "Gel Infinito",              inline: true }
      ]);

      await interaction.update(buildFilaEmbed(guild, modo, valor));
      await atualizarFila(guild, modo, valor);

      if (q.inf.length >= 2) {
        const [p1, p2] = q.inf.splice(0, 2);
        await atualizarFila(guild, modo, valor);
        await criarCanalPartida(guild, client, p1, p2, modo, valor, "Gel Inf");
      }
      return;
    }

    // ===== SAIR =====
    if (customId.startsWith("sair_")) {
      const partes    = customId.replace("sair_", "").split("_");
      const valor     = parseInt(partes[partes.length - 1]);
      const modo      = partes.slice(0, -1).join("_");
      const q         = qm.getQueue(guild.id, modo, valor);
      const estaNormal = q.normal.includes(userId);
      const estaInf    = q.inf.includes(userId);

      if (!estaNormal && !estaInf) {
        await interaction.reply({ content: "Você não está nessa fila.", ephemeral: true });
        return;
      }

      const tipoSaiu = estaNormal ? "Gelo Normal" : "Gelo Infinito";
      if (estaNormal) q.normal = q.normal.filter(id => id !== userId);
      if (estaInf)    q.inf    = q.inf.filter(id    => id !== userId);

      await enviarLog(guild, CORES.ERRO, "📤 Saiu da Fila", [
        { name: "Jogador", value: "<@" + userId + ">",   inline: true },
        { name: "Modo",    value: MODO_DISPLAY[modo],    inline: true },
        { name: "Valor",   value: "R$ " + valor + ",00", inline: true },
        { name: "Tipo",    value: tipoSaiu,               inline: true }
      ]);

      await interaction.update(buildFilaEmbed(guild, modo, valor));
      await atualizarFila(guild, modo, valor);
      return;
    }
  }
};

