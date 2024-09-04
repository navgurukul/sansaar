
// const fs = require('fs');
// const path = require('path');
// const csv = require('csv-parser');
// const  UserStoreData  = require('../models/userStoreData');

// exports.seed = async function(knex) {
//   // Array to hold CSV data
//   const users = [];

//   // Read the CSV file
//   await new Promise((resolve, reject) => {
//     fs.createReadStream(path.join('../users.csv'))
//       .pipe(csv())
//       .on('data', (row) => {
//         users.push(row);
//       })
//       .on('end', () => {
//         console.log('CSV file successfully processed');
//         resolve();
//       })
//       .on('error', (error) => {
//         console.error('Error reading CSV file:', error);
//         reject(error);
//       });
//   });

  
//    await knex(UserStoreData.tableName).insert(users);
  
// };


const fs = require('fs');
const path = require('path');
const fastcsv = require('fast-csv');
const UserStoreData = require('../models/userStoreData'); // Adjust the path according to your file structure

exports.seed = async function(knex) {
  try {
    // Initialize the database connection
    UserStoreData.knex(knex);

    // Fetch data from the database
    const dbUsers = await UserStoreData.query().select('id', 'name', 'email');
    console.log(dbUsers, "Retrieved data");

    // Define the output CSV file path
    const outputCsvFilePath = "data.csv"
    console.log(outputCsvFilePath,"path")
    const ws = fs.createWriteStream(outputCsvFilePath);

    // Write data to CSV file
    await new Promise((resolve, reject) => {
      fastcsv
        .write(dbUsers, { headers: true })
        .pipe(ws)
        .on('finish', () => {
          console.log('Data successfully written to data.csv');
          resolve();
        })
        .on('error', (error) => {
          console.error('Error writing CSV file:', error);
          reject(error);
        });
    });

    console.log('CSV file created successfully with data from userStoreData table');
  } catch (error) {
    console.error('Error processing data:', error.message);
  }
};
