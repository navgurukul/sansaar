const logger = require('../../server/logger');

module.exports = [
  {
    method: 'GET',
    path: '/certificate',
    options: {
      description: 'Generate certificate',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      handler: async (request, h) => {
        const { generateCertificateService } = request.services();
        const certificate_data = {
          Course: 'Python Programming',
          weekDuration: '14 Weeks',
          Year: '2022',
        };
        const [err, certificate] = await generateCertificateService.generateCertificate(
          // certificate_data.user_id,
          // certificate_data.Name,
          request.auth.credentials.id,
          request.auth.credentials.name,
          certificate_data.Course,
          certificate_data.weekDuration,
          certificate_data.Year
        );
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        return { url: certificate };
      },
    },
  },
];