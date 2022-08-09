const logger = require('../../server/logger');

module.exports = [
  {
    method: 'GET',
    path: '/certificate',
    options: {
      description: 'Generate certificate',
      tags: ['api'],
      //   auth: {
      //     strategy: 'jwt',
      //   },
      handler: async (request, h) => {
        const { generateCertificateService } = request.services();
        const [err, certificate] = await generateCertificateService.generateCertificate();
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        return { url: certificate };
      },
    },
  },
];
