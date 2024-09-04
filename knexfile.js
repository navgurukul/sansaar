const ManifestFile = require('./server/manifest');

const manifest = ManifestFile.get('/register/plugins', process.env);

module.exports = manifest.find(({ plugin }) => plugin === 'schwifty').options.knex;


