const { MODOS_VALIDOS, VALORES } = require("../config/constants");

// queues[guildId][modo][valor] = { normal: [], inf: [] }
const queues = {};
// filaMessages[guildId][modo][valor] = message
const filaMessages = {};
// partidas[canalId] = { p1, p2, valor, modo, tipo, pagamentos, confirmacoes, guildId }
const partidas = {};

function initGuild(guildId) {
  if (!queues[guildId]) {
    queues[guildId] = {};
    filaMessages[guildId] = {};
    for (const modo of MODOS_VALIDOS) {
      queues[guildId][modo] = {};
      filaMessages[guildId][modo] = {};
      for (const valor of VALORES) {
        queues[guildId][modo][valor] = { normal: [], inf: [] };
      }
    }
  }
}

function getQueue(guildId, modo, valor) {
  initGuild(guildId);
  return queues[guildId][modo][valor];
}

function removeFromAllQueues(guildId, userId) {
  initGuild(guildId);
  for (const modo of MODOS_VALIDOS) {
    for (const valor of VALORES) {
      queues[guildId][modo][valor].normal = queues[guildId][modo][valor].normal.filter(id => id !== userId);
      queues[guildId][modo][valor].inf    = queues[guildId][modo][valor].inf.filter(id => id !== userId);
    }
  }
}

function getFilaMsg(guildId, modo, valor) {
  initGuild(guildId);
  return filaMessages[guildId]?.[modo]?.[valor] || null;
}

function setFilaMsg(guildId, modo, valor, msg) {
  initGuild(guildId);
  filaMessages[guildId][modo][valor] = msg;
}

function getPartida(canalId) { return partidas[canalId] || null; }
function setPartida(canalId, data) { partidas[canalId] = data; }
function deletePartida(canalId) { delete partidas[canalId]; }

module.exports = { initGuild, getQueue, removeFromAllQueues, getFilaMsg, setFilaMsg, getPartida, setPartida, deletePartida };

