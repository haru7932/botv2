const { EmbedBuilder } = require("discord.js");
const db = require("../database/db");

// ========== THUMBNAIL ==========
function getThumb(guild) {
  const cfg = db.getGuild(guild.id);
  return cfg.config?.logo || guild.iconURL({ dynamic: true }) || null;
}

// ========== COR ==========
function getCor(guildId) {
  const cfg = db.getGuild(guildId);
  const cor = cfg.config?.cor || "0x2b2d31";
  return parseInt(cor.replace("#", "0x").replace("0x", ""), 16) || 0x2b2d31;
}

// ========== NOME ORG ==========
function getNome(guild) {
  const cfg = db.getGuild(guild.id);
  return cfg.config?.nome || guild.name;
}

// ========== EMBED BASE ==========
function baseEmbed(guild, titulo, cor) {
  return new EmbedBuilder()
    .setColor(cor || getCor(guild.id))
    .setTitle(titulo)
    .setThumbnail(getThumb(guild))
    .setFooter({ text: getNome(guild), iconURL: guild.iconURL({ dynamic: true }) || undefined })
    .setTimestamp();
}

// ========== DM SILENCIOSA ==========
async function enviarDM(client, userId, mensagem) {
  try {
    const user = await client.users.fetch(userId);
    await user.send(mensagem);
  } catch (e) { /* DM fechada */ }
}

// ========== LOG ==========
async function enviarLog(guild, cor, titulo, campos) {
  try {
    const cfg = db.getGuild(guild.id);
    const channelId = cfg.logs?.channelId;
    if (!channelId) return;
    const canal = await guild.channels.fetch(channelId).catch(() => null);
    if (!canal) return;
    const embed = new EmbedBuilder()
      .setColor(cor)
      .setTitle(titulo)
      .addFields(campos)
      .setTimestamp()
      .setFooter({ text: getNome(guild), iconURL: guild.iconURL({ dynamic: true }) || undefined });
    await canal.send({ embeds: [embed] });
  } catch (e) { console.error("Erro log:", e.message); }
}

// ========== CHECK LICENÇA ==========
function checkLicense(guildId) {
  return db.hasLicense(guildId);
}

module.exports = { getThumb, getCor, getNome, baseEmbed, enviarDM, enviarLog, checkLicense };

