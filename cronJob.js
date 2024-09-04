const cron = require('node-cron');
const fs = require('fs');
const path = require('path');


const directory = '/home/navgurukul/sansaar/logs';
console.log(directory )

cron.schedule('* * * * *', () => {
  console.log('Running cleaning of .gz files...');

  fs.readdir(directory, (err, files) => {
    if (err) { 
      console.error('Error reading directory:', err.message);
      return;
    }

    files.forEach(file => {
      if (path.extname(file) === '.gz') {
        const filePath = path.join(directory, file);

        fs.unlink(filePath, err => {
          if (err) {
            console.error(`Error deleting file ${file}: ${err.message}`);
          } else {
            console.log(`Deleted file: ${file}`);
          }
        });
      }
    });
  });
});
