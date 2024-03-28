const { google } = require('googleapis');
require('dotenv').config();
const { articleSourceSheet } = require('../../config/index');

const accessGoogleSheet = async () => {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: articleSourceSheet.clientEmail,
      private_key: articleSourceSheet.privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth });

  const request = {
    spreadsheetId: articleSourceSheet.sheetId,
    range: `${articleSourceSheet.sheetName}!${articleSourceSheet.sheetRange}`,
  };

  // reading data from google sheet
  const response = (await sheets.spreadsheets.values.get(request)).data.values;
  console.log('response from readsheet');
  return [...response];
};

module.exports = accessGoogleSheet;
