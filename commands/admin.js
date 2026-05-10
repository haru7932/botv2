const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const db = require("../database/db");
const { MODO_DISPLAY, CORES } = require("../config/constants");
const { getThumb, getNome, enviarLog } = require("../utils/helpers");

const stats = {};
function getStats(userId) {
  if (!stats[userId]) stats[userId] = { vitorias: 0, derrotas: 0 };
  return stats[userId];
}

module.exports = [
  // /ip
  {
    data: new SlashCommandBuilder()
      .setName("ip")
      .setDescription("Ver estatísticas de um jogador")
      .addUserOption(o => o.setName("jogador").setDescription("O jogador").setRequired(true)),
    async execute(interaction) {
      const jogador = interaction.options.getUser("jogador");
      const s = getStats(jogador.id);
      const total = s.vitorias + s.derrotas;
      const taxa = total > 0 ? ((s.vitorias / total) * 100).toFixed(1) : "0.0";
      const embed = new EmbedBuilder()
        .setColor(CORES.INFO)
        .setTitle("📊 Estatísticas de " + jogador.username)
        .setThumbnail(jogador.displayAvatarURL())
        .addFields(
          { name: "✅ Vitórias",       value: String(s.vitorias), inline: true },
          { name: "❌ Derrotas",       value: String(s.derrotas), inline: true },
          { name: "🎮 Total",          value: String(total),      inline: true },
          { name: "📊 Taxa de Vitória", value: taxa + "%",         inline: true }
        )
        .setFooter({ text: getNome(interaction.guild) })
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  },

  // /vitoria
  {
    data: new SlashCommandBuilder()
      .setName("vitoria")
      .setDescription("Registrar vitória (admin)")
      .addUserOption(o => o.setName("jogador").setDescription("O jogador").setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
      const jogador = interaction.options.getUser("jogador");
      getStats(jogador.id).vitorias++;
      await interaction.reply({ content: "✅ Vitória registrada para <@" + jogador.id + ">!", ephemeral: true });
      await enviarLog(interaction.guild, CORES.SUCESSO, "✅ Vitória Registrada", [
        { name: "Jogador", value: "<@" + jogador.id + ">", inline: true },
        { name: "ADM", value: "<@" + interaction.user.id + ">", inline: true }
      ]);
    }
  },

  // /derrota
  {
    data: new SlashCommandBuilder()
      .setName("derrota")
      .setDescription("Registrar derrota (admin)")
      .addUserOption(o => o.setName("jogador").setDescription("O jogador").setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
      const jogador = interaction.options.getUser("jogador");
      getStats(jogador.id).derrotas++;
      await interaction.reply({ content: "❌ Derrota registrada para <@" + jogador.id + ">!", ephemeral: true });
      await enviarLog(interaction.guild, CORES.ERRO, "❌ Derrota Registrada", [
        { name: "Jogador", value: "<@" + jogador.id + ">", inline: true },
        { name: "ADM", value: "<@" + interaction.user.id + ">", inline: true }
      ]);
    }
  },

  // /mensagem
  {
    data: new SlashCommandBuilder()
      .setName("mensagem")
      .setDescription("Envia uma mensagem no canal (admin)")
      .addStringOption(o => o.setName("texto").setDescription("A mensagem").setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
      const texto = interaction.options.getString("texto");
      await interaction.channel.send(texto);
      await interaction.reply({ content: "✅ Mensagem enviada!", ephemeral: true });
    }
  },

  // /confirmarpagamento
  {
    data: new SlashCommandBuilder()
      .setName("confirmarpagamento")
      .setDescription("Confirma o pagamento dos jogadores (admin)")
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
      const { getPartida } = require("../handlers/queueManager");
      const partida = getPartida(interaction.channel.id);
      if (!partida) {
        await interaction.reply({ content: "❌ Este canal não é um canal de partida.", ephemeral: true });
        return;
      }
      const embed = new EmbedBuilder()
        .setColor(CORES.SUCESSO)
        .setTitle("✅ Pagamento Confirmado!")
        .setDescription("O pagamento foi confirmado pelo ADM!\n\n<@" + partida.p1 + "> e <@" + partida.p2 + ">, aguardem o ID e senha da sala.")
        .setFooter({ text: getNome(interaction.guild) });
      await interaction.reply({ embeds: [embed] });
      await enviarLog(interaction.guild, CORES.SUCESSO, "💰 Pagamento Confirmado", [
        { name: "Jogadores", value: "<@" + partida.p1 + "> vs <@" + partida.p2 + ">", inline: false },
        { name: "ADM", value: "<@" + interaction.user.id + ">", inline: true },
        { name: "Valor", value: "R$ " + partida.valor + ",00", inline: true }
      ]);
    }
  },

  // /sala
  {
    data: new SlashCommandBuilder()
      .setName("sala")
      .setDescription("Envia ID e senha da sala (admin)")
      .addStringOption(o => o.setName("id").setDescription("ID da sala").setRequired(true))
      .addStringOption(o => o.setName("senha").setDescription("Senha da sala").setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
      const { getPartida } = require("../handlers/queueManager");
      const partida = getPartida(interaction.channel.id);
      if (!partida) {
        await interaction.reply({ content: "❌ Este canal não é um canal de partida.", ephemeral: true });
        return;
      }
      const salaId = interaction.options.getString("id");
      const senha  = interaction.options.getString("senha");
      const embed = new EmbedBuilder()
        .setColor(getCor(interaction.guild.id))
        .setTitle("🎮 Informações da Sala")
        .setThumbnail(getThumb(interaction.guild))
        .addFields(
          { name: "⚔️ Modo",      value: MODO_DISPLAY[partida.modo] + " — " + partida.tipo, inline: true },
          { name: "💰 Valor",     value: "R$ " + partida.valor + ",00", inline: true },
          { name: "🆔 ID da Sala", value: "```" + salaId + "```", inline: false },
          { name: "🔑 Senha",     value: "```" + senha + "```", inline: false }
        )
        .setFooter({ text: getNome(interaction.guild) });

      function getCor(gid) { const { getCor: gc } = require("../utils/helpers"); return gc(gid); }

      await interaction.reply({ content: "<@" + partida.p1 + "> <@" + partida.p2 + ">", embeds: [embed] });
      await enviarLog(interaction.guild, CORES.AVISO, "🎮 Sala Enviada", [
        { name: "Jogadores", value: "<@" + partida.p1 + "> vs <@" + partida.p2 + ">", inline: false },
        { name: "Modo",      value: MODO_DISPLAY[partida.modo], inline: true },
        { name: "Valor",     value: "R$ " + partida.valor + ",00", inline: true },
        { name: "ID Sala",   value: salaId, inline: true },
        { name: "ADM",       value: "<@" + interaction.user.id + ">", inline: true }
      ]);
    }
  }
];

