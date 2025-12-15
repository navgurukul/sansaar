module.exports = [
    {
        method: 'GET',
        path: '/health',
        options: {
            description: 'Health check endpoint',
            tags: ['api'],
            auth: false, // No authentication required
            handler: async (request, h) => {
                return {
                    status: 'healthy',
                    uptime: process.uptime(),
                    timestamp: new Date().toISOString(),
                };
            },
        },
    },
];
