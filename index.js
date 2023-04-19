const { google } = require('googleapis');
const fs = require('fs');

// Load the service account credentials from the JSON key file
const keyFilePath = './hel.json';
const keyFileContent = fs.readFileSync(keyFilePath);
const credentials = JSON.parse(keyFileContent);

// Authorize a client with the loaded credentials
const client = new google.auth.JWT(
  credentials.client_email,
  null,
  credentials.private_key,
  ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  null
);

// Specify the sheet ID and range
const spreadsheetId = '12-UAhSfq0TQ05c4HDwboE-pbiql41oBa30lF9HcbNjU';
const range = '!B2:E954';

// Read the sheet data and convert it to JSON format
async function readSheet() {
  try {
    await client.authorize();
    const sheets = google.sheets({ version: 'v4', auth: client });
    const response = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    const rows = response.data.values;
    const json = [];

    // Convert the rows to JSON format
    let currentBlock = {};
    let currentCredits = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const blockName = row[0];
      const roleName = row[1];
      const name = row[2];
      console.log(row,roleName,i)
      if (blockName) {
        // Start a new block
        console.log(currentBlock,"current",currentBlock.credits)
        if (currentCredits) {
          currentBlock.credits = currentCredits;
          json.push(currentBlock);
        }
        currentBlock = { blockName };
        currentCredits = [];
      }

      if (roleName && name) {
        // Add a new credit
        const existingCredit = currentCredits.find(c => c.roleName === roleName);
        if (existingCredit) {
          existingCredit.names.push(name);
        } else {
          currentCredits.push({ roleName, names: [name] });
        }
      }
    }

    // Add the last block to the JSON array
    if (currentBlock.credits) {
      currentBlock.credits = currentCredits;
      json.push(currentBlock);
    }

    console.log(json,"jkl;");
  } catch (error) {
    console.log(error);
  }
}
readSheet()