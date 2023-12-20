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
        console.error(error);
        return { error: 'Internal Server Error' }
    }
}

};

