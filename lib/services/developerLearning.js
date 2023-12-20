/* eslint-disable prettier/prettier */
/* eslint-disable class-methods-use-this */
const Schmervice = require('schmervice');
const fs = require('fs-extra');
const path = require('path');
const _ = require('lodash');
const { errorHandler } = require('../errorHandling');
const logger = require('../../server/logger');


module.exports = class DeveloperLearning extends Schmervice.Service {
    async createDeveloper(data) {
        const { DevelopersResume } = this.server.models();

        try {
            // Assuming request.payload contains the data for the new developer
            const newDeveloper = await DevelopersResume.query().insert(data);
            return newDeveloper
        } catch (error) {
            return { error: 'Internal Server Error' }
        }
    }

    async createResources(data) {
        const { LearningResource } = this.server.models();
        try {
            // Assuming request.payload contains the data for the new developer
            const newResource = await LearningResource.query().insert(data);
            return newResource
        } catch (error) {
            return { error: 'Internal Server Error' }
        }
    }

    async getResources() {
        const { LearningResource } = this.server.models();
        try {
            const resource = await LearningResource.query().select('*');
            return resource;
        } catch (error) {
            return { error: 'Internal Server Error', details: error.message };
        }
    }

    async createDeveloperProgressById(devprogress) {
        const { LearningProgress } = this.server.models();
        try {
            const progress = await LearningProgress.query().insert(devprogress);
            return progress;
        } catch (error) {
            return { error: 'Internal Server Error', details: error.message };
        }
    }

    async getDeveloperProgressById(id) {
        const { LearningProgress } = this.server.models();
        try {
            const progress = await LearningProgress.query().where('developers_resume_id',id);
            return progress;
        } catch (error) {
            return { error: 'Internal Server Error', details: error.message };
        }
    }

      
};

