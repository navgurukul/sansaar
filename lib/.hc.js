const modelTempalte = require('./models/helpers/template.model.js');

const templates = {
  models: modelTempalte
};

module.exports = {
  recursive: true,
  add: [
    {
      place: 'models',
      method: 'schwifty',
      list: true,
      after: ['plugins', 'path'],
      meta: {
        exampleUseStrict: false,
      },
      example: {
        $requires: ['templates.models.requires'],
        $value: 'templates.models.templateCode',
      }
    },
  ]
};