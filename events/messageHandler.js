const { EmbedBuilder } = require("discord.js");
const { CORES } = require("../config/constants");
const { getThumb, getNome } = require("../utils/helpers");

const stats = {};
function getStats(userId) {
  if (!stats[userId]) stats[userId] = { vitorias: 0, derrotas: 0 };
  return stats[userId];
}

module.exports = {
  name: "messageCreate",
  async execute(message) {
    if (message.author.bot) return;

    if (message.content.startsWith("!perfil")) {
      const mention = message.mentions.users.first() || message.author;
      const s = getStats(mention.id);
      const total = s.vitorias + s.derrotas;
      const taxa = total > 0 ? ((s.vitorias / total) * 100).toFixed(1) : "0.0";
      const embed = new EmbedBuilder()
        .setColor(CORES.INFO)
        .setTitle("📊 Perfil de " + mention.username)
        .setThumbnail(mention.displayAvatarURL())
        .addFields(
          { name: "✅ Vitórias",       value: String(s.vitorias), inline: true },
          { name: "❌ Derrotas",       value: String(s.derrotas), inline: true },
          { name: "🎮 Total",          value: String(total),      inline: true },
          { name: "📊 Taxa de Vitória", value: taxa + "%",         inline: true }
        )
        .setFooter({ text: getNome(message.guild) })
        .setTimestamp();
      await message.reply({ embeds: [embed] });
      return;
    }

    if (message.content.startsWith("!ranking")) {
      const sorted = Object.entries(stats)
        .sort((a, b) => b[1].vitorias - a[1].vitorias)
        .slice(0, 10);
      if (sorted.length === 0) {
        await message.reply("Nenhum jogador registrado ainda.");
        return;
      }
      const lista = sorted.map((entry, i) => {
        const [uid, s] = entry;
        return "**" + (i + 1) + ".** <@" + uid + "> — " + s.vitorias + "W / " + s.derrotas + "L";
      }).join("\n");
      const embed = new EmbedBuilder()
        .setColor(CORES.INFO)
        .setTitle("🏆 Ranking — " + getNome(message.guild))
        .setThumbnail(getThumb(message.guild))
        .setDescription(lista)
        .setTimestamp();
      await message.reply({ embeds: [embed] });
    }
  }
};
