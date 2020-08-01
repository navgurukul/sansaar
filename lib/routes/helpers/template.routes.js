const routesTemplate = [
  {
    method: 'GET',
    path: '/whatever/path/you/want',
    options: {
      description: 'This description will appear in swagger.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      handler: async (request, h) => ({ message: "This endpoint is still under construction." }),
    },
  },
]

module.exports = {
  templateCode: routesTemplate,
  requires: [],
};