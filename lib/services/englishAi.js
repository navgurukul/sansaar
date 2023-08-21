const Schmervice = require('schmervice');
const fs = require('fs-extra');
const path = require('path');
const _ = require('lodash');
const { errorHandler } = require('../errorHandling');
const logger = require('../../server/logger');

module.exports = class EnglishAiService extends Schmervice.Service {
    async getEnglishAiDataByLevel(level) {
        const { EnglishAiContent } = this.server.models();
        let EnglishAiData;
        try {
            EnglishAiData = await EnglishAiContent.query().where('level', level);
            return [null, EnglishAiData];
        } catch (error) {
            logger.error(JSON.stringify(error));
            return [errorHandler(error), null];
        }
    }

    async getEnglishAiDataByid(id) {
        try {
            const EnglishAiUserData = await EnglishAiContent.query().where('id', id);
            return [null, EnglishAiUserData];
        } catch (err) {
            logger.error(JSON.stringify(err));
            return [errorHandler(err), null];
        }
    }
};
