const { token } = require('./config.json');
const { channelID } = require('./config.json');
const fs = require('node:fs');
const path = require('node:path');
const { Client, Events, GatewayIntentBits} = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
// Google integration
const { google } = require('googleapis');
const serviceAccountKeyFile = "./keys/launchpad-idea-tracking-d88b60ead8dc.json";
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
  console.log("Wiping old sheet before reading backlog")
  _resetDataGoogleSheet(sheetId, tabName);
  fetchAllMessages();
});

client.on('messageCreate', (message) => {
    // Ignore bot messages
    if (message.author.bot) return;

    //Ignore posts when searching for replies
    if (message.channel.isThread()) {
        if (message.id === message.channel.id) return;
    }

    // Only proceed if the message is in the "ideas" channel
    if (message.channel.parent?.name === "ideas") {
        console.log(`Reply made by: ${message.author.displayName} (${message.author.username})`);
        logReply(`${message.author.displayName} (${message.author.username})`, message.createdAt);

    }
});

client.on('threadCreate', async (thread) => {
    const threadCreator = await client.users.fetch(thread.ownerId);
    console.log(`Thread made by: ${threadCreator.displayName} (${threadCreator.username})`);
    logThread(`${threadCreator.displayName} (${threadCreator.username})`, thread.createdAt);
    
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

async function batchWrite(dataArray){
  const googleSheetClient = await _getGoogleSheetClient();
  
  let dataToBeInserted = []
  dataArray.map( data =>
    dataToBeInserted.push([data.time, data.type, data.name])
  )
  await _writeGoogleSheet(googleSheetClient, sheetId, tabName, range, dataToBeInserted);
}

async function fetchAllMessages() {
  const forum = client.channels.cache.get(channelID);
  console.log("Fetching and processing all old messages.")
  
  threads = forum.threads.cache;
  
  const threadsInfo = (
    await Promise.all(
      threads.map(async thread => {
        const fetchedUser = await client.users.fetch(thread.ownerId);
        return {
          name: `${fetchedUser.displayName} (${fetchedUser.username})`,
          time: thread.createdAt.toISOString(), 
          type: "Thread",
        };
      })
    )
  );
  
  const repliesInfo = (
    await Promise.all(
      threads.map(async message =>
        (await message.messages.fetch()).map(reply => ({
          name: `${reply.author.displayName} (${reply.author.username})`,
          time: reply.createdAt.toISOString(),
          type: "Reply",
        }))
      )
    )
  ).flat();

  const allInfo = [...threadsInfo, ...repliesInfo].sort((a, b) => new Date(b.time) - new Date(a.time));

  console.log("All old threads and replies logged, pushing to sheet.")

  batchWrite(allInfo);

  console.log("Logged to sheet, scanning for new messages now.")

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

async function _resetDataGoogleSheet(sheetId, tabName) {
  const googleSheetClient = await _getGoogleSheetClient();
  await googleSheetClient.spreadsheets.values.clear({
    spreadsheetId: sheetId,
    range: `${tabName}!A2:C`,
  });
}

// Logging in
client.login(token);