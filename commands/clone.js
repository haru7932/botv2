const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { cloneSite } = require('../database/db');
const path = require('path');
const fs = require('fs-extra');

module.exports = {
    // Cria a estrutura do comando de barra usando o Builder oficial
    data: new SlashCommandBuilder()
        .setName('clonar')
        .setDescription('Clona um site e envia como arquivo ZIP')
        .addStringOption(option => 
            option.setName('url')
                .setDescription('URL do site a ser clonado')
                .setRequired(true)
        )
        .addStringOption(option => 
            option.setName('filename')
                .setDescription('Nome do arquivo ZIP resultante')
                .setRequired(true)
        ),

    // Execução do comando (geralmente chamada de execute ou run)
    async execute(interaction) {
        const url = interaction.options.getString('url');
        const filename = interaction.options.getString('filename');
        const outputDir = path.join(__dirname, 'output', filename);

        // Remove diretório antigo se existir e garante que o novo exista
        await fs.remove(outputDir);
        await fs.ensureDir(outputDir);

        // Como o processo de clonar pode demorar, o deferReply evita que o comando expire (limite de 3 segundos)
        await interaction.deferReply();

        try {
            const zipPath = await cloneSite(url, outputDir, filename);
            
            if (zipPath) {
                await interaction.followUp({ 
                    content: `Aqui está o site clonado com sucesso!`, 
                    files: [zipPath] 
                });
            } else {
                await interaction.followUp({ content: 'Falha ao clonar o site.', ephemeral: true });
            }
        } catch (error) {
            console.error('Erro ao clonar o site:', error);
            await interaction.followUp({ content: 'Ocorreu um erro ao tentar clonar o site.', ephemeral: true });
        }
    }
};
