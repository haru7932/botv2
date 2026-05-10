# 🤖 Queue Bot — Multi-Servidor

## Estrutura de Arquivos

```
discord-bot/
├── index.js                  ← Entrada principal
├── package.json
├── config/
│   └── constants.js          ← Modos, valores, cores
├── commands/
│   ├── fila.js               ← /fila
│   ├── config.js             ← /config (pix, logs, logo, cor, nome)
│   ├── blacklist.js          ← /blacklist add/remove/list
│   ├── license.js            ← /license add/remove/info
│   └── admin.js              ← /ip /vitoria /derrota /mensagem /sala /confirmarpagamento
├── events/
│   ├── buttonHandler.js      ← Todos os botões
│   └── messageHandler.js     ← !perfil !ranking
├── handlers/
│   └── queueManager.js       ← Filas e partidas por servidor
├── utils/
│   └── helpers.js            ← getThumb, getCor, enviarDM, enviarLog, checkLicense
└── database/
    ├── db.js                 ← Funções de leitura/escrita
    └── database.json         ← Dados de todos os servidores
```

---

## Variáveis de Ambiente

| Variável          | Descrição                        |
|-------------------|----------------------------------|
| DISCORD_TOKEN     | Token do bot                     |
| DISCORD_CLIENT_ID | Application ID do bot            |
| BOT_OWNER_ID      | Seu ID do Discord (para /license)|

---

## Como usar

### 1. Adicionar licença a um servidor
```
/license add guild_id:123456789 dias:30
```
- `dias: 0` = permanente
- Só funciona com o seu ID em `BOT_OWNER_ID`

### 2. Configurar o servidor (ADM do servidor)
```
/config pix-chave chave:SUA_CHAVE_PIX
/config pix-nome  nome:Nome Recebedor
/config pix-qrcode url:https://link-da-imagem.jpg
/config logs      canal:#canal-de-logs
/config logo      url:https://link-da-logo.jpg
/config cor       hex:#5865f2
/config nome      nome:VorteX Apostas
/config ver
```

### 3. Abrir filas
```
/fila modo:1x1 Mobile
```

### 4. Blacklist
```
/blacklist add    jogador:@user motivo:Calote
/blacklist remove jogador:@user
/blacklist list
```

---

## Como os dados ficam no database.json

```json
{
  "guilds": {
    "GUILD_ID": {
      "pix": {
        "chave": "sua-chave-pix",
        "nome": "Nome Recebedor",
        "qrcode": "https://url-do-qr.jpg"
      },
      "logs": {
        "channelId": "CANAL_ID"
      },
      "config": {
        "logo": "https://url-logo.jpg",
        "cor": "0x5865f2",
        "nome": "VorteX Apostas"
      },
      "blacklist": {
        "USER_ID": {
          "motivo": "Calote",
          "moderador": "ADM_ID",
          "data": "2026-05-09T..."
        }
      }
    }
  },
  "licenses": {
    "GUILD_ID": {
      "ativadoPor": "SEU_ID",
      "ativadoEm": "2026-05-09T...",
      "expiry": null,
      "dias": "permanente"
    }
  }
}
```

---

## Deploy no Railway

1. Substitua a pasta do projeto por esta nova estrutura
2. Configure as variáveis de ambiente:
   - `DISCORD_TOKEN`
   - `DISCORD_CLIENT_ID`
   - `BOT_OWNER_ID`
3. Faça o push:
```bash
git add . && git commit -m "v2 multi-servidor" && git push origin main
```
4. Railway reinicia automaticamente

---

## Fluxo de um novo servidor

1. Você usa `/license add guild_id:ID` para liberar o servidor
2. O ADM do servidor usa `/config` para configurar Pix, logs, logo, cor
3. O ADM usa `/fila` para abrir as filas
4. Tudo funciona com os dados daquele servidor isolados dos outros
