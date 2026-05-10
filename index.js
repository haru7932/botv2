const {
  Client, GatewayIntentBits, REST, Routes
} = require("discord.js");

const TOKEN     = process.env.DISCORD_TOKEN;MTM5MjkyMTgxMTEyMDgxNjI2MQ.GhDSO-.aW9ED19WOpHcLwS8_qfZWfluv-cdOEQ4VEKG3o
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;1392921811120816261

// ========== COMMANDS ==========
const filaCmd     = require("./commands/fila");
const configCmd   = require("./commands/config");
const blacklistCmd= require("./commands/blacklist");
const licenseCmd  = require("./commands/license");
const adminCmds   = require("./commands/admin"); // array

const allCommands = [
  filaCmd,
  configCmd,
  blacklistCmd,
  licenseCmd,
  ...adminCmds
];

// ========== REGISTER SLASH COMMANDS ==========
const rest = new REST({ version: "10" }).setToken(TOKEN);
(async () => {
  try {
    const body = allCommands.map(c => c.data.toJSON());
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body });
    console.log("✅ Comandos registrados globalmente!");
  } catch (e) {
    console.error("Erro ao registrar comandos:", e);
  }
})();

// ========== CLIENT ==========
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once("ready", () => console.log("🤖 Bot online: " + client.user.tag));

// ========== EVENTS ==========
const buttonHandler  = require("./events/buttonHandler");
const messageHandler = require("./events/messageHandler");

// Slash commands
client.on("interactionCreate", async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const cmd = allCommands.find(c => c.data.name === interaction.commandName);
    if (!cmd) return;
    try {
      await cmd.execute(interaction, client);
    } catch (e) {
      console.error("Erro no comando " + interaction.commandName + ":", e);
      const msg = { content: "❌ Ocorreu um erro ao executar este comando.", ephemeral: true };
      if (interaction.replied || interaction.deferred) await interaction.followUp(msg);
      else await interaction.reply(msg);
    }
  }

  // Botões
  if (interaction.isButton()) {
    try {
      await buttonHandler.execute(interaction, client);
    } catch (e) {
      console.error("Erro no botão:", e);
    }
  }
});

// Mensagens
client.on("messageCreate", async (message) => {
  try {
    await messageHandler.execute(message, client);
  } catch (e) {
    console.error("Erro em messageCreate:", e);
  }
});

client.login(TOKEN);
