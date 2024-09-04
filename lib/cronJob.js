const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

// Directory where .gz files are stored
const directory = '/path/to/your/directory';

cron.schedule('0 0 * * *', () => {
  console.log('Running cleaning of .gz files...');

  fs.readdir(directory, (err, files) => {
    if (err) {

      return {
        errmassage:err.message
      }
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

