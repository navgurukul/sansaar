const modelTempalte = require('./models/helpers/template.model');
const routesTemplate = require('./routes/helpers/template.routes');

const templates = {
  models: modelTempalte,
  routes: routesTemplate
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
        $requires: templates.models.requires,
        $value: templates.models.templateCode,
      }
    },
    {
      place: 'routes',
      method: 'route',
      after: ['plugins', 'bind', 'handler-types', 'methods', 'path'],
      list: true,
      meta: {
        exampleUseStrict: false
      },
      example: {
        $requires: templates.routes.requires,
        $value: templates.routes.templateCode,
      }
    }
  ]
};