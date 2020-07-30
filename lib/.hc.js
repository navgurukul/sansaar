const modelTempalte = require('./models/template.model.js');

const templates = {
  models: modelTempalte
};

module.exports = {
  add: [{
    place: 'models',
    list: true,
    meta: {
      exampleUseStrict: false,
    },
    example: {
      $requires: templates.models.requires,
      $value: templates.models.templateCode,
    }
  }]
};