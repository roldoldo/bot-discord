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
const TOKEN = 'MTUwMDQxMjYxNDYwODU1MTkzNg.GM0vQ6.60fIB8XbKaCD9DetbRHuytpH2LagPr-7WvwV_Y';
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

  // ================= PAINEL =================
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

  // ================= ABRIR FORM =================
  if (interaction.isButton() && interaction.customId === 'abrir_formulario') {

    if (registrosPendentes.has(String(interaction.user.id))) {
      return interaction.reply({ content: '⏳ Já está em análise.', ephemeral: true });
    }

    if (usuariosAprovados.has(String(interaction.user.id))) {
      return interaction.reply({ content: '✅ Você já foi aprovado.', ephemeral: true });
    }

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

  // ================= FORM =================
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

  // ================= BOTÕES =================
  if (interaction.isButton()) {

    if (interaction.customId === 'cancelar') {
      return interaction.update({ content: '❌ Cancelado.', components: [] });
    }

    // ENVIAR PRA STAFF
    if (interaction.customId.startsWith('confirmar')) {

      const [, nome, id, recrutador] = interaction.customId.split('|');

      registrosPendentes.add(String(interaction.user.id));

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
            .setThumbnail(interaction.user.displayAvatarURL())
            .setColor(0x2b2d31)
            .setFooter({ text: 'Sistema de Recrutamento' })
            .setTimestamp()
        ],
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`aprovar|${interaction.user.id}|${nome}|${id}|${recrutador}`)
              .setLabel('Aprovar')
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId(`recusar|${interaction.user.id}|${nome}|${id}|${recrutador}`)
              .setLabel('Recusar')
              .setStyle(ButtonStyle.Danger)
          )
        ]
      });

      return interaction.update({ content: '✅ Enviado para análise!', components: [] });
    }

    // ================= APROVAR =================
    if (interaction.customId.startsWith('aprovar')) {

      const [, userId, nome, id, recrutador] = interaction.customId.split('|');

      try {
        const membro = await interaction.guild.members.fetch(userId);

        registrosPendentes.delete(String(userId));
        usuariosAprovados.add(String(userId));

        await membro.setNickname(`${nome} | ${id}`).catch(() => {});
        await membro.roles.add(CARGO_APROVADO).catch(() => {});

        recrutadores[recrutador] = (recrutadores[recrutador] || 0) + 1;

        // 🔥 REMOVE BOTÃO SEM QUEBRAR EMBED
        try {
          await interaction.update({
            embeds: interaction.message.embeds,
            components: []
          });
        } catch {
          await interaction.message.edit({
            components: []
          });
        }

        // LOG
        const canalAprovados = interaction.guild.channels.cache.get(CANAL_APROVADOS);
        if (canalAprovados) {
          canalAprovados.send({
            embeds: [
              new EmbedBuilder()
                .setTitle('🟢 Aprovado')
                .setDescription(`${nome} | ${id}`)
                .setColor(0x00ff88)
            ]
          });
        }

        // TOP
        const lista = Object.entries(recrutadores)
          .sort((a, b) => b[1] - a[1])
          .map(([nome, qtd]) => `🏅 ${nome}: ${qtd}`)
          .join('\n');

        const canalTop = interaction.guild.channels.cache.get(CANAL_CONTADOR);
        if (canalTop) {
          await canalTop.bulkDelete(5).catch(() => {});
          canalTop.send({
            embeds: [
              new EmbedBuilder()
                .setTitle('🏆 Top Recrutadores')
                .setDescription(lista || 'Nenhum ainda.')
                .setColor(0x2b2d31)
            ]
          });
        }

        // DM
        try {
          const user = await client.users.fetch(userId);
          await user.send(`✅ Você foi aprovado!\n\n${nome} | ${id}`);
        } catch {}

      } catch (err) {
        console.log(err);
      }
    }

    // ================= RECUSAR =================
    if (interaction.customId.startsWith('recusar')) {

      const [, userId, nome, id, recrutador] = interaction.customId.split('|');

      try {
        registrosPendentes.delete(String(userId));

        try {
          await interaction.update({
            embeds: interaction.message.embeds,
            components: []
          });
        } catch {
          await interaction.message.edit({
            components: []
          });
        }

        const canalRecusados = interaction.guild.channels.cache.get(CANAL_RECUSADOS);
        if (canalRecusados) {
          canalRecusados.send({
            embeds: [
              new EmbedBuilder()
                .setTitle('🔴 Recusado')
                .setDescription(`${nome} | ${id}`)
                .setColor(0xff0000)
            ]
          });
        }

      } catch (err) {
        console.log(err);
      }
    }
  }
});

client.login(TOKEN);