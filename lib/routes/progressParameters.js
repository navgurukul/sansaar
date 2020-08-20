module.exports = [
  {
    method: 'GET',
    path: '/whatever/path/you/want1',
    options: {
      description: 'This description will appear in swagger.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: ['team', 'facha', 'dumbeldore', 'trainingAndPlacement'],
      },
      handler: async (request, h) => ({
        request,
        h,
        message: 'This endpoint is still under construction.',
      }),
    },
  },
];
