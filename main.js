const { google } = require('googleapis');
const fs = require('fs');
const express = require('express')
const app = express()
const port = 4000


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
app.get('/', async (req, res) => {
    try {
        await client.authorize();
        const sheets = google.sheets({ version: 'v4', auth: client });
        const response = await sheets.spreadsheets.values.get({range,spreadsheetId });
        const rows = response.data.values;
        const json = [];
    
        // Convert the rows to JSON format
        let currentBlock = {};
        let currentCredits = [];
        let roleName=""
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const blockName = row[0];
          roleName= row[1]?.length>1?row[1]:roleName;
          const name = row[2];
          if (blockName) {
            // Start a new block
            if (currentCredits && currentBlock?.blockName) {
              currentBlock.credits = currentCredits;
              json.push(currentBlock);
            }
            currentBlock = { blockName };
            currentCredits = [];
          }
    
          if (roleName && name) {
            // Add a new credit
            const existingCredit = currentCredits.find(c => c.roleName == roleName);
            if (existingCredit) {
              existingCredit.names.push(name);
            } else {
              currentCredits.push({ roleName, names: [name] });
            }
          }
        }
    
        // Add the last block to the JSON array
        if (currentBlock) {
          currentBlock.credits = currentCredits;
          json.push(currentBlock);
        }
        res.send(json);
      } catch (error) {
        console.log(error);
      } 
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})



