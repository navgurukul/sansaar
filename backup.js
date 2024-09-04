const fs = require('fs');
const path = require('path');

// Directories
const logsDirectory = '/home/navgurukul/sansaar/logs';
const backupDirectory = path.join(logsDirectory, 'backup');

// Ensure the logs directory exists
if (!fs.existsSync(logsDirectory)) {
  fs.mkdirSync(logsDirectory, { recursive: true });
}

function restoreFiles() {
  console.log('Running restoration of .gz files from the backup directory...');

  fs.readdir(backupDirectory, (err, files) => {
    if (err) {
      console.error('Error reading backup directory:', err.message);
      return;
    }

    files.forEach(file => {
      if (path.extname(file) === '.gz') {
        const backupPath = path.join(backupDirectory, file);
        const filePath = path.join(logsDirectory, file);

        // Step 1: Copy file from backup directory to logs directory
        fs.copyFile(backupPath, filePath, err => {
          if (err) {
            console.error(`Error restoring file ${file}: ${err.message}`);
          } else {
            console.log(`Restored file: ${file}`);
          }
        });
      }
    });
  });
}

restoreFiles();
