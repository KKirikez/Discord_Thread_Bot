const { token } = require('./config.json');
const fs = require('node:fs');
const path = require('node:path');
const { Client, Events, GatewayIntentBits} = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
// Google integration
const { google } = require('googleapis');
const serviceAccountKeyFile = "./keys/launchpad-idea-tracking-ae5146ca08d7.json";
const sheetId = '1cRY2_8tpMZt73O2FFWe3x6J2HRZ1bGnTR48EPzn-uxg';
const tabName = 'Idea Logs';
const range = 'A:C';

async function _getGoogleSheetClient() {
    const auth = new google.auth.GoogleAuth({
      keyFile: serviceAccountKeyFile,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const authClient = await auth.getClient();
    return google.sheets({
      version: 'v4',
      auth: authClient,
    });
  }

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
        logReply(`${message.author.globalName} (${message.author.username})`, message.createdAt);

    }
});

client.on('threadCreate', async (thread) => {
    const threadCreator = await client.users.fetch(thread.ownerId);
    console.log(`Thread made by: ${threadCreator.globalName} (${threadCreator.username})`);
    logThread(`${threadCreator.globalName} (${threadCreator.username})`, thread.createdAt);
    
});

async function logThread(name, date){
    const googleSheetClient = await _getGoogleSheetClient();
    
    let content = `${date}: ${name}\n`;
    
    fs.appendFile('threads.log', content, err => {
        if (err) {
          console.error(err);
        } else {
          console.log("Logged thread");
        }
      });

    const dataToBeInserted = [
        [date, 'Thread', name]
     ]
     await _writeGoogleSheet(googleSheetClient, sheetId, tabName, range, dataToBeInserted);
}

async function logReply(name, date){
    const googleSheetClient = await _getGoogleSheetClient();

    let content = `${date}: ${name}\n`;

    fs.appendFile('replies.log', content, err => {
        if (err) {
          console.error(err);
        } else {
            console.log("Logged reply");
        }
      });

      const dataToBeInserted = [
        [date, 'Reply', name]
     ]
     await _writeGoogleSheet(googleSheetClient, sheetId, tabName, range, dataToBeInserted);
    
}

async function _readGoogleSheet(googleSheetClient, sheetId, tabName, range) {
    const res = await googleSheetClient.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${tabName}!${range}`,
    });
  
    return res.data.values;
  }
  
async function _writeGoogleSheet(googleSheetClient, sheetId, tabName, range, data) {
    await googleSheetClient.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `${tabName}!${range}`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        "majorDimension": "ROWS",
        "values": data
      },
    })
}

// Logging in
client.login(token);