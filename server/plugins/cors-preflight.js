/**
 * Hapi plugin to automatically handle CORS preflight (OPTIONS) requests
 * This adds a wildcard OPTIONS handler that responds to any OPTIONS request
 * with a 204 No Content response, allowing the CORS headers from manifest.js
 * to be applied automatically.
 */

module.exports = {
    name: 'cors-preflight',
    version: '1.0.0',
    register: async (server) => {
        // Add a wildcard OPTIONS route handler
        server.route({
            method: 'OPTIONS',
            path: '/{any*}',
            options: {
                auth: false, // Don't require authentication for preflight requests
                description: 'Handle CORS preflight requests',
                handler: async (request, h) => {
                    // Return 204 No Content - CORS headers are added automatically by Hapi
                    return h.response().code(204);
                },
            },
        });
    },
};
