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
            // auth: {
            //     strategy: 'jwt',
            // },
            validate: {
                payload: Joi.object({
                    longUrl: Joi.string().uri().required().description('Original URL to be shortened'),
                    // customCode: Joi.string().min(3).max(10).optional().description('Optional custom code for the shortened URL')
                })
            },
            handler: async (request, h) => {
                const { urlShortnerService } = request.services();
                const { longUrl } = request.payload;
                
                try {
                    const [err, shortUrl] = await urlShortnerService.createUrlShortner({ 
                        longUrl
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
    
   
];