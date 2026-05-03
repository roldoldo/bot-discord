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

// 🔑 CONFIGURAÇÃO
const TOKEN = process.env.TOKEN;

const CARGO_APROVADO = '1500373943293579314';

// 📌 CANAIS
const CANAL_FORMULARIO = '1500374089099903076';
const CANAL_APROVACAO = '1500374091151179836';
const CANAL_APROVADOS = '1500374093373902888';
const CANAL_RECUSADOS = '1500374095458603030';


// 🚀 BOT ONLINE
client.once(Events.ClientReady, async () => {
  console.log(`✅ Online como ${client.user.tag}`);

  const canal = client.channels.cache.get(CANAL_FORMULARIO);
  if (!canal) return console.log('❌ Canal do formulário não encontrado');

  const embedPainel = new EmbedBuilder()
    .setTitle('🎭 | Sistema de Setagem')
    .setDescription(
      'Preencha corretamente.\n\n' +
      '⚠️ **AVISO IMPORTANTE:**\n' +
      '• Siga as calls\n' +
      '• Rádio obrigatória\n' +
      '• Aguarde aprovação'
    )
    .setColor(0x2b2d31);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('abrir_formulario')
      .setLabel('Recrutamento')
      .setStyle(ButtonStyle.Secondary)
  );

  await canal.send({ embeds: [embedPainel], components: [row] });
});


// 📌 INTERAÇÕES
client.on(Events.InteractionCreate, async (interaction) => {

  // 1. ABRIR MODAL
  if (interaction.isButton() && interaction.customId === 'abrir_formulario') {
    const modal = new ModalBuilder()
      .setCustomId('registroModal')
      .setTitle('Sistema de Setagem');

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('nome').setLabel('Nome').setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('id_passaporte').setLabel('ID').setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('recrutador_nome').setLabel('Recrutador').setStyle(TextInputStyle.Short)
      )
    );

    return interaction.showModal(modal);
  }


  // 2. MODAL SUBMIT
  if (interaction.isModalSubmit() && interaction.customId === 'registroModal') {

    const nome = interaction.fields.getTextInputValue('nome');
    const idPass = interaction.fields.getTextInputValue('id_passaporte');
    const recNome = interaction.fields.getTextInputValue('recrutador_nome');

    return interaction.reply({
      content: `Confirma?\n\n👤 ${nome} | ${idPass}\n📌 ${recNome}`,
      ephemeral: true,
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`conf|${nome}|${idPass}|${recNome}`)
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


  // 3. BOTÕES
  if (interaction.isButton()) {
    const data = interaction.customId.split('|');
    const acao = data[0];

    if (acao === 'cancelar') {
      return interaction.update({ content: '❌ Cancelado.', components: [] });
    }

    // ENVIAR PARA STAFF
    if (acao === 'conf') {
      const [, nome, idPass, recNome] = data;

      const canalAprovacao = interaction.guild.channels.cache.get(CANAL_APROVACAO);

      const embedAnalise = new EmbedBuilder()
        .setTitle('📋 | Novo Registro')
        .setDescription(
          `👤 <@${interaction.user.id}>\n\n` +
          `**Nome:** ${nome}\n**ID:** ${idPass}\n**Recrutador:** ${recNome}`
        )
        .setColor(0x2b2d31);

      const botoesStaff = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`aprovar|${interaction.user.id}|${idPass}`)
          .setLabel('Aceitar')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`negar|${interaction.user.id}|${idPass}`)
          .setLabel('Negar')
          .setStyle(ButtonStyle.Danger)
      );

      await canalAprovacao.send({ embeds: [embedAnalise], components: [botoesStaff] });

      return interaction.update({ content: '✅ Enviado para análise!', components: [] });
    }


    // STAFF DECISÃO
    if (acao === 'aprovar' || acao === 'negar') {
      const candidatoId = data[1];
      const idPass = data[2];
      const aprovado = acao === 'aprovar';

      const canalLog = interaction.guild.channels.cache.get(
        aprovado ? CANAL_APROVADOS : CANAL_RECUSADOS
      );

      const embedLog = new EmbedBuilder()
        .setTitle(aprovado ? '✅ Registro Aprovado' : '❌ Registro Negado')
        .setColor(aprovado ? 0x00FF00 : 0xFF0000)
        .addFields(
          { name: 'Candidato:', value: `<@${candidatoId}> (ID: ${idPass})`, inline: true },
          { name: 'Staff:', value: `<@${interaction.user.id}>`, inline: true }
        )
        .setTimestamp();

      if (canalLog) await canalLog.send({ embeds: [embedLog] });

      if (aprovado) {
        const membro = await interaction.guild.members.fetch(candidatoId).catch(() => null);
        if (membro) await membro.roles.add(CARGO_APROVADO).catch(() => {});
      }

      await interaction.update({
        content: `Ação realizada por <@${interaction.user.id}>!`,
        embeds: [],
        components: []
      });

      setTimeout(() => {
        interaction.message?.delete().catch(() => {});
      }, 2000);
    }
  }
});

client.login(TOKEN);
