/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
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
          const skillsString = data.skills.toString()
          const newData = {
            ...data,
            skills: skillsString,
          }
          const newDeveloper = await DevelopersResume.query().insert(newData);
          return newDeveloper;
        } catch (error) {
          console.error(error);
          return { error: 'Internal Server Error' };
        }
      }
      

    async developerProfile(id) {
        const { DevelopersResume } = this.server.models();
        const profile = {};
        const completedCourse = [];
        try {
            const developer = await DevelopersResume.query().where('id', id);
            profile.profile = developer;
            const progress = await this.getDeveloperProgressById(id);
            for (const progressItem of progress) {
                const course = await this.getResourcesById(progressItem.learning_resource_id);
                completedCourse.push(course[0]);
            }
            profile.completedCourse = completedCourse;
            return profile;
        } catch (error) {
            return { error: 'Internal Server Error' };
        }
    }


    async createResources(data) {
        const { LearningResource } = this.server.models();
        try {
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

    async getResourcesById(id) {
        const { LearningResource } = this.server.models();
        try {
            const resource = await LearningResource.query().where('id', id);
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
            const progress = await LearningProgress.query().where('developers_resume_id', id);
            return progress;
        } catch (error) {
            return { error: 'Internal Server Error', details: error.message };
        }
    }


};

