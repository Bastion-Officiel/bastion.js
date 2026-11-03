# @bastion-hub/bastion.js

<div align="center">
  <h1>🛡️ Bastion.js</h1>
  <p><b>SDK Officiel pour concevoir des bots interactifs sur la plateforme BASTION</b></p>
  <p>Gérez vos événements temps réel, commandes slash, composants d'interface et modération.</p>
</div>

---

## 📦 Installation

Installez le package via npm :

```bash
npm install @bastion-hub/bastion.js
```

---

## 🚀 Démarrage Rapide

### 1. Configuration (`.env`)
```env
BASTION_TOKEN=votre_token_bot_ici
CLIENT_ID=votre_client_id_ici
```

---

### 2. Client Principal (`index.js`)
```javascript
const { Client, GatewayIntentBits, Partials, Events } = require('@bastion-hub/bastion.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Message, Partials.Channel, Partials.User]
});

// Événement quand le bot est prêt
client.on(Events.ClientReady, (c) => {
    console.log(`🤖 Connecté avec succès : ${c.user.username}`);
    console.log(`🏰 Connecté à ${c.guilds.cache.size} serveur(s).`);
});

// Événement lors de la réception d'un message
client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    if (message.content === '!ping') {
        await message.reply('🏓 Pong !');
    }
});

client.login(process.env.BASTION_TOKEN);
```

---

### 3. Enregistrement des Commandes Slash (`deploy-commands.js`)
```javascript
const { REST, Routes, SlashCommandBuilder } = require('@bastion-hub/bastion.js');
require('dotenv').config();

const commands = [
    new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Vérifier la latence du bot'),
    new SlashCommandBuilder()
        .setName('help')
        .setDescription('Afficher le centre d\'aide interactif')
].map(cmd => cmd.toJSON());

const rest = new REST().setToken(process.env.BASTION_TOKEN);

(async () => {
    try {
        console.log('🚀 Déploiement des commandes slash...');
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );
        console.log('✅ Commandes déployées avec succès !');
    } catch (error) {
        console.error('❌ Erreur lors du déploiement :', error);
    }
})();
```

---

### 4. Embeds & Boutons Interactifs
```javascript
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events } = require('@bastion-hub/bastion.js');

client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'help') {
            const embed = new EmbedBuilder()
                .setTitle('🛡️ Centre d\'aide Bastion')
                .setDescription('Sélectionnez une action ci-dessous.')
                .setColor('#5865F2')
                .addFields(
                    { name: 'Statut', value: 'En ligne ✅', inline: true },
                    { name: 'Sécurité', value: 'Optimale 🛡️', inline: true }
                )
                .setFooter({ text: 'Bastion Hub' })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('btn_info')
                    .setLabel('En savoir plus')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('btn_support')
                    .setLabel('Support')
                    .setStyle(ButtonStyle.Secondary)
            );

            await interaction.reply({ embeds: [embed], components: [row] });
        }
    } else if (interaction.isButton()) {
        if (interaction.customId === 'btn_info') {
            await interaction.reply({ content: 'Voici les informations demandées.', ephemeral: true });
        }
    }
});
```

---

## 📚 Fonctionnalités Incluses
* **Gateway WebSocket** : Gestion temps réel du cycle de vie du bot, détection des présences, messages et interactions.
* **REST API v10** : Création et envoi de messages, gestion des rôles, permissions et modération.
* **Composants d'UI** : Rendu des Boutons colorés (Primary, Secondary, Success, Danger, Link), menus déroulants (String Select) et Embeds complets.

---

## 📄 Licence
Ce projet est sous licence MIT.
