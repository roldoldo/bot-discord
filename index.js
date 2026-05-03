require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events,
  EmbedBuilder
} = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

// 🔑 CONFIG
const CARGO_APROVADO = '1500373943293579314';

// 📌 CANAIS
const CANAL_FORMULARIO = '1500374089099903076';
const CANAL_APROVACAO = '1500374091151179836';
const CANAL_APROVADOS = '1500374093373902888';
const CANAL_RECUSADOS = '1500374095458603030';
const CANAL_CONTADOR = '1500374097165684926';

// 🔒 CONTROLE
const registrosPendentes = new Set();
const usuariosAprovados = new Set();
const recrutadores = {};

client.once(Events.ClientReady, () => {
  console.log(`✅ Online como ${client.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {

  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === 'painel') {

      const canal = interaction.guild.channels.cache.get(CANAL_FORMULARIO);

      await interaction.reply({ content: 'Painel enviado!', ephemeral: true });

      canal.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('🎭 | Sistema de Setagem')
            .setDescription(
              'Preencha corretamente.\n\n' +
              '⚠️ **AVISO IMPORTANTE:**\n' +
              '• Siga as calls\n' +
              '• Rádio obrigatória\n' +
              '• Aguarde aprovação'
            )
            .setColor(0x2b2d31)
        ],
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('abrir_formulario')
              .setLabel('Recrutamento')
              .setStyle(ButtonStyle.Secondary)
          )
        ]
      });
    }
  }

  if (interaction.isButton() && interaction.customId === 'abrir_formulario') {

    const modal = new ModalBuilder()
      .setCustomId('registroModal')
      .setTitle('Sistema de Setagem');

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('nome').setLabel('Nome').setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('id').setLabel('ID').setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('recrutador').setLabel('Recrutador').setStyle(TextInputStyle.Short)
      )
    );

    return interaction.showModal(modal);
  }

  if (interaction.isModalSubmit()) {

    const nome = interaction.fields.getTextInputValue('nome');
    const id = interaction.fields.getTextInputValue('id');
    const recrutador = interaction.fields.getTextInputValue('recrutador');

    return interaction.reply({
      content: `Confirma?\n\n👤 ${nome} | ${id}\n📌 ${recrutador}`,
      ephemeral: true,
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`confirmar|${nome}|${id}|${recrutador}`)
            .setLabel('Enviar')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('cancelar')
            .setLabel('Cancelar')
            .setStyle(ButtonStyle.Danger)
        )
      ]
    });
  }

  if (interaction.isButton()) {

    if (interaction.customId === 'cancelar') {
      return interaction.update({ content: '❌ Cancelado.', components: [] });
    }

    if (interaction.customId.startsWith('confirmar')) {

      const [, nome, id, recrutador] = interaction.customId.split('|');

      const canal = interaction.guild.channels.cache.get(CANAL_APROVACAO);

      await canal.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('📋 | Novo Registro')
            .setDescription(
              `👤 <@${interaction.user.id}>\n\n` +
              `**Nome:** ${nome}\n` +
              `**ID:** ${id}\n` +
              `**Recrutador:** ${recrutador}`
            )
            .setColor(0x2b2d31)
        ]
      });

      return interaction.update({ content: '✅ Enviado para análise!', components: [] });
    }
  }
});

// 🔥 LOGIN CORRETO (ÚNICO)
client.login(process.env.TOKEN);
