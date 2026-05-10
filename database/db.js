const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "database.json");

function load() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ guilds: {}, licenses: {} }, null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
}

function save(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function getGuild(guildId) {
  const db = load();
  if (!db.guilds[guildId]) {
    db.guilds[guildId] = {
      pix: { chave: null, nome: null, qrcode: null },
      logs: { channelId: null },
      config: { logo: null, cor: "0x2b2d31", nome: null },
      blacklist: {}
    };
    save(db);
  }
  return db.guilds[guildId];
}

function setGuild(guildId, guildData) {
  const db = load();
  db.guilds[guildId] = guildData;
  save(db);
}

function updateGuild(guildId, path_keys, value) {
  const db = load();
  if (!db.guilds[guildId]) getGuild(guildId);
  let obj = db.guilds[guildId];
  const keys = path_keys.split(".");
  for (let i = 0; i < keys.length - 1; i++) {
    if (!obj[keys[i]]) obj[keys[i]] = {};
    obj = obj[keys[i]];
  }
  obj[keys[keys.length - 1]] = value;
  save(db);
}

function getLicense(guildId) {
  const db = load();
  return db.licenses[guildId] || null;
}

function setLicense(guildId, licenseData) {
  const db = load();
  db.licenses[guildId] = licenseData;
  save(db);
}

function removeLicense(guildId) {
  const db = load();
  delete db.licenses[guildId];
  save(db);
}

function hasLicense(guildId) {
  const license = getLicense(guildId);
  if (!license) return false;
  if (license.expiry && new Date(license.expiry) < new Date()) return false;
  return true;
}

module.exports = { load, save, getGuild, setGuild, updateGuild, getLicense, setLicense, removeLicense, hasLicense };
