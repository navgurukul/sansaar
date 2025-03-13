'use strict';

const { Service } = require('@hapipal/schmervice');
const crypto = require('crypto');

module.exports = class UrlShortnerService extends Service {
    constructor() {
        super();
        this.shortCodeLength = 6;
    }

    /**
     * Generate a random string for short codes
     * @param {number} length Length of string to generate
     * @returns {string} Random string
     */
    generateRandomString(length) {
        // Use characters that are URL-safe
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const randomBytes = crypto.randomBytes(length);
        let result = '';
        
        for (let i = 0; i < length; i++) {
            // Map the random byte to a character in our set
            const index = randomBytes[i] % characters.length;
            result += characters.charAt(index);
        }
        
        return result;
    }

    /**
     * Generate a unique short code
     * @returns {Promise<string>} Unique short code
     */
    async generateUniqueCode() {
        const { knex } = this.server.app;
        let shortCode;
        let isUnique = false;
        let attempts = 0;
        const maxAttempts = 10; // Prevent infinite loops
        
        while (!isUnique && attempts < maxAttempts) {
            shortCode = this.generateRandomString(this.shortCodeLength);
            // Check if code already exists
            const exists = await knex('short_links')
                .where({ short_code: shortCode })
                .first();
                
            isUnique = !exists;
            attempts++;
        }
        
        if (!isUnique) {
            throw new Error('Could not generate a unique code after multiple attempts');
        }
        
        return shortCode;
    }

    /**
     * Create a new shortened URL
     * @param {Object} data URL data
     * @param {string} data.longUrl The original URL to shorten
     * @param {string} [data.customCode] Optional custom code
     * @param {number} [data.created_by] User ID who created the URL
     * @returns {Promise<Array>} [error, result]
     */
    async createUrlShortner(data) {
        try {
            const { knex } = this.server.app;
            const { longUrl, customCode, created_by } = data;
            
            // Validate URL format
            try {
                new URL(longUrl);
            } catch (error) {
                return [new Error('Invalid URL format'), null];
            }
            
            // Get short code (custom or generated)
            let shortCode;
            
            // if (customCode) {
            //     // Check if custom code already exists
            //     const exists = await knex('short_links')
            //         .where({ short_code: customCode })
            //         .first();
                
            //     if (exists) {
            //         return [new Error('Custom code already in use'), null];
            //     }
                
            //     shortCode = customCode;
            // } else {
                // }
                
            shortCode = await this.generateUniqueCode();
            // Create the short URL
            const now = new Date();
            const [id] = await knex('short_links').insert({
                short_code: shortCode,
                original_url: longUrl,
                created_at: now,
                created_by: created_by || null
            }).returning('id');
            
            // Get host info from server settings
            const host = this.server.info.uri;
            
            // Return the new short URL info
            return [null, {
                id,
                original_url: longUrl,
                short_code: shortCode,
                short_url: `${host}/s/${shortCode}`,
                created_at: now
            }];
        } catch (error) {
            return [error, null];
        }
    }

    /**
     * Get the original URL from a short code
     * @param {string} shortCode The short code to look up
     * @returns {Promise<Array>} [error, originalUrl]
     */
    async getOriginalUrl(shortCode) {
        try {
            const { knex } = this.server.app;
            
            const result = await knex('short_links')
                .where({ short_code: shortCode })
                .first('original_url');
            
            if (!result) {
                return [new Error('Short URL not found'), null];
            }
            
            return [null, result.original_url];
        } catch (error) {
            return [error, null];
        }
    }

    /**
     * Record an access to a short URL
     * @param {string} shortCode The short code that was accessed
     * @returns {Promise<void>}
     */
    async recordAccess(shortCode) {
        const { knex } = this.server.app;
        
        await knex('short_links')
            .where({ short_code: shortCode })
            .update({
                last_accessed: new Date()
            });
    }

    /**
     * List all shortened URLs with pagination
     * @param {number} limit Maximum results per page
     * @param {number} page Page number (1-based)
     * @returns {Promise<Array>} [error, result]
     */
    async listShortUrls(limit, page) {
        try {
            const { knex } = this.server.app;
            const offset = (page - 1) * limit;
            
            // Get paginated results
            const urls = await knex('short_links')
                .select('*')
                .orderBy('created_at', 'desc')
                .limit(limit)
                .offset(offset);
            
            // Get total count for pagination
            const [{ count }] = await knex('short_links')
                .count('id as count');
            
            // Get host info from server settings
            const host = this.server.info.uri;
            
            // Add short_url to each result
            const results = urls.map(url => ({
                ...url,
                short_url: `${host}/s/${url.short_code}`
            }));
            
            return [null, {
                data: results,
                pagination: {
                    total: parseInt(count, 10),
                    page,
                    limit,
                    pages: Math.ceil(parseInt(count, 10) / limit)
                }
            }];
        } catch (error) {
            return [error, null];
        }
    }

    /**
     * Check if a user can delete a short URL
     * @param {string} shortCode The short code
     * @param {number} userId The user ID
     * @returns {Promise<Array>} [error, canDelete]
     */
    async canUserDeleteUrl(shortCode, userId) {
        try {
            const { knex } = this.server.app;
            
            // Get the URL
            const url = await knex('short_links')
                .where({ short_code: shortCode })
                .first();
                
            if (!url) {
                return [new Error('Short URL not found'), false];
            }
            
            // Check if user is the creator or has admin role
            const isCreator = url.created_by === userId;
            
            // Check if user has admin role (implement according to your auth system)
            const userInfo = await knex('users')
                .where({ id: userId })
                .first('role');
                
            const isAdmin = userInfo && userInfo.role === 'admin';
            
            return [null, isCreator || isAdmin];
        } catch (error) {
            return [error, false];
        }
    }

    /**
     * Delete a shortened URL
     * @param {string} shortCode The short code to delete
     * @returns {Promise<Array>} [error, success]
     */
    async deleteShortUrl(shortCode) {
        try {
            const { knex } = this.server.app;
            
            const deleted = await knex('short_links')
                .where({ short_code: shortCode })
                .delete();
                
            if (!deleted) {
                return [new Error('Short URL not found'), false];
            }
            
            return [null, true];
        } catch (error) {
            return [error, false];
        }
    }
};