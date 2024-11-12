const { token } = require('./config.json');
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits, ForumChannel } = require('discord.js');
const { MessageChannel } = require('node:worker_threads');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.once(Events.ClientReady, readyClient => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.on('messageCreate', (message) => {
    // Ignore bot messages
    if (message.author.bot) return;

    //Ignore posts when searching for replies
    if (message.channel.isThread()) {
        if (message.id === message.channel.id) return;
    }

    // Only proceed if the message is in the "ideas" category
    if (message.channel.parent?.name === "ideas") {
        console.log(`Reply made by: ${message.author.globalName} (${message.author.username})`);
    }
});

client.on('threadCreate', async (thread) => {
    const threadCreator = await client.users.fetch(thread.ownerId);
    console.log(`Thread made by: ${threadCreator.globalName} (${threadCreator.username})`);
});

// Logging in
client.login(token);