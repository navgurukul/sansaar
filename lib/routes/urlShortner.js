/* eslint-disable prettier/prettier */
const Joi = require('@hapi/joi');
const logger = require('../../server/logger');

module.exports = [
    // Create short URL
    {
        method: 'POST',
        path: '/url/shortner',
        options: {
            description: 'Create a new short URL',
            tags: ['api'],
            auth: {
                strategy: 'jwt',
            },
            validate: {
                payload: Joi.object({
                    longUrl: Joi.string().uri().required().description('Original URL to be shortened'),
                    customCode: Joi.string().min(3).max(10).optional().description('Optional custom code for the shortened URL')
                })
            },
            handler: async (request, h) => {
                const { urlShortnerService } = request.services();
                const { longUrl, customCode } = request.payload;
                
                try {
                    const [err, shortUrl] = await urlShortnerService.createUrlShortner({ 
                        longUrl, 
                        // customCode,
                        created_by: request.auth.credentials.id 
                    });
                    
                    if (err) {
                        logger.error(JSON.stringify(err));
                        return h.response({ 
                            statusCode: 400,
                            error: true, 
                            message: err.message,
                            data: null 
                        }).code(400);
                    }
                    
                    return h.response({ 
                        statusCode: 201,
                        error: false, 
                        message: 'URL shortened successfully',
                        data: shortUrl 
                    }).code(201);
                } catch (error) {
                    logger.error(`Error in URL shortener: ${error.message}`);
                    return h.response({ 
                        statusCode: 500,
                        error: true, 
                        message: 'An error occurred while processing your request',
                        data: null 
                    }).code(500);
                }
            },
        },
    },
    
    // Access shortened URL
    {
        method: 'GET',
        path: '/s/{shortCode}',
        options: {
            description: 'Redirect to original URL',
            tags: ['api'],
            auth: false,
            validate: {
                params: Joi.object({
                    shortCode: Joi.string().required().description('Short code for the URL')
                })
            },
            handler: async (request, h) => {
                const { urlShortnerService } = request.services();
                const { shortCode } = request.params;
                
                try {
                    const [err, originalUrl] = await urlShortnerService.getOriginalUrl(shortCode);
                    
                    if (err || !originalUrl) {
                        logger.error(`Short URL not found: ${shortCode}`);
                        return h.response({ 
                            statusCode: 404,
                            error: true, 
                            message: 'Short URL not found',
                            data: null 
                        }).code(404);
                    }
                    
                    // Update access timestamp in the background
                    urlShortnerService.recordAccess(shortCode).catch(error => {
                        logger.error(`Failed to record access: ${error.message}`);
                    });
                    
                    return h.redirect(originalUrl);
                } catch (error) {
                    logger.error(`Error accessing short URL: ${error.message}`);
                    return h.response({ 
                        statusCode: 500,
                        error: true, 
                        message: 'An error occurred while processing your request',
                        data: null 
                    }).code(500);
                }
            },
        },
    },
    
    // List all shortened URLs (admin only)
    {
        method: 'GET',
        path: '/url/shortner',
        options: {
            description: 'List all shortened URLs',
            tags: ['api'],
            auth: {
                strategy: 'jwt',
                scope: ['admin']
            },
            validate: {
                query: Joi.object({
                    limit: Joi.number().integer().min(1).max(100).default(20).description('Number of results per page'),
                    page: Joi.number().integer().min(1).default(1).description('Page number')
                })
            },
            handler: async (request, h) => {
                const { urlShortnerService } = request.services();
                const { limit, page } = request.query;
                
                try {
                    const [err, result] = await urlShortnerService.listShortUrls(limit, page);
                    
                    if (err) {
                        logger.error(JSON.stringify(err));
                        return h.response({ 
                            statusCode: 400,
                            error: true, 
                            message: err.message,
                            data: null 
                        }).code(400);
                    }
                    
                    return h.response({ 
                        statusCode: 200,
                        error: false, 
                        message: 'URLs retrieved successfully',
                        data: result 
                    }).code(200);
                } catch (error) {
                    logger.error(`Error listing short URLs: ${error.message}`);
                    return h.response({ 
                        statusCode: 500,
                        error: true, 
                        message: 'An error occurred while processing your request',
                        data: null 
                    }).code(500);
                }
            },
        },
    },
    
    // Delete a shortened URL
    {
        method: 'DELETE',
        path: '/url/shortner/{shortCode}',
        options: {
            description: 'Delete a shortened URL',
            tags: ['api'],
            auth: {
                strategy: 'jwt'
            },
            validate: {
                params: Joi.object({
                    shortCode: Joi.string().required().description('Short code to delete')
                })
            },
            handler: async (request, h) => {
                const { urlShortnerService } = request.services();
                const { shortCode } = request.params;
                const userId = request.auth.credentials.id;
                
                try {
                    // Check if user owns this URL or is admin
                    const [checkErr, canDelete] = await urlShortnerService.canUserDeleteUrl(shortCode, userId);
                    
                    if (checkErr || !canDelete) {
                        return h.response({ 
                            statusCode: 403,
                            error: true, 
                            message: 'You do not have permission to delete this URL',
                            data: null 
                        }).code(403);
                    }
                    
                    const [err, result] = await urlShortnerService.deleteShortUrl(shortCode);
                    
                    if (err) {
                        logger.error(JSON.stringify(err));
                        return h.response({ 
                            statusCode: 400,
                            error: true, 
                            message: err.message,
                            data: null 
                        }).code(400);
                    }
                    
                    return h.response({ 
                        statusCode: 200,
                        error: false, 
                        message: 'URL deleted successfully',
                        data: null 
                    }).code(200);
                } catch (error) {
                    logger.error(`Error deleting short URL: ${error.message}`);
                    return h.response({ 
                        statusCode: 500,
                        error: true, 
                        message: 'An error occurred while processing your request',
                        data: null 
                    }).code(500);
                }
            },
        },
    }
];