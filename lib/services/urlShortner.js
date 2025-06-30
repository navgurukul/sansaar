/* eslint-disable prettier/prettier */
const Schmervice = require('schmervice');
const crypto = require('crypto');
const { errorHandler } = require('../errorHandling');

module.exports = class UrlShortnerService extends Schmervice.Service {
    constructor(server) {
        super(server); // Pass the server instance to the parent class
        this.shortCodeLength = 6;
    }

    async generateRandomString(length) {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const randomBytes = crypto.randomBytes(length);
        let result = '';

        for (let i = 0; i < length; i++) {
            const index = randomBytes[i] % characters.length;
            result += characters.charAt(index);
        }

        return result;
    }

    async generateUniqueCode() {
        const { ShortLink } = this.server.models();
        let shortCode;
        let isUnique = false;
        let attempts = 0;
        const maxAttempts = 10; // Prevent infinite loops

        while (!isUnique && attempts < maxAttempts) {
            shortCode = this.generateRandomString(this.shortCodeLength);
            const exists = await ShortLink.query()
                .where('short_code', shortCode)
                .first();

            isUnique = !exists;
            attempts++;
        }

        if (!isUnique) {
            throw new Error('Could not generate a unique code after multiple attempts');
        }

        return shortCode;
    }

    async createUrlShortner(data) {
        try {
            const { ShortLink } = this.server.models();

            const longUrl = typeof data === 'string' ? data : data?.longUrl;
            if (!longUrl) {
                return [{ error: true, message: 'longUrl is missing in the input data', code: 400 }, null];
            }

            // Decode the URL-encoded parts of the URL
            const decodedUrl = decodeURIComponent(longUrl);

            // Validate URL format
            try {
                new URL(decodedUrl); // Use the decoded URL for validation
            } catch (error) {
                return [{ error: true, message: 'Invalid URL format', code: 400 }, null];
            }

            let shortCode = await this.generateUniqueCode();
            const now = new Date();
            const newShortLink = await ShortLink.query().insert({
                short_code: shortCode,
                original_url: decodedUrl,
                created_at: now,
            });

            // const host = this.server.info.uri;
            const host = process.env.BASE_URL + `${/s/}` + `${shortCode}`;

            return [null, {
                id: newShortLink.id,
                original_url: decodedUrl,
                short_code: shortCode,
                short_url: `${host}/s/${shortCode}`,
                created_at: now
            }];
        } catch (err) {
            return [errorHandler(err), null];
        }
    }

    async getOriginalUrl(shortCode) {
        try {
            const { ShortLink } = this.server.models();
            const shortLink = await ShortLink.query()
                .where('short_code', shortCode)
                .first();

            if (!shortLink) {
                return [{ error: true, message: 'Short URL not found', code: 404 }, null];
            }

            return [null, shortLink.original_url];
        } catch (err) {
            console.log("Error in getOriginalUrl: ", err);
            return [errorHandler(err), null];
        }
    }
};