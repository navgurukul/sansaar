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
const axios = require('axios');
const cheerio = require('cheerio');

module.exports = class DeveloperLearning extends Schmervice.Service {
    async createDeveloper(data) {
        const { DevelopersResume } = this.server.models();

        try {
            const skillsString = data.skills.toString();
            const intrestsString = data.intrests.toString();
            const known_framworksString = data.known_framworks.toString();
            const newData = {
                ...data,
                intrests: intrestsString,
                skills: skillsString,
                known_framworks: known_framworksString,
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
    
  async courseLinks(query) {
    let try_url = [
      `https://hackr.io/blog/best-${query}-courses`,
      `https://hackr.io/blog/${query}-courses`,
      `https://hackr.io/blog/best-${query}-certification`,
      `https://hackr.io/blog/${query}-certifications`,
      'https://hackr.io/blog/best-programming-languages-to-learn',
      `https://hackr.io/blog/best-${query}-courses-online`,
    ];

    let courses = [];
    if (query.includes('+')) {
      query = query.replace(/\+/g, 'p');
    }

    if (query.includes(' ')) {
      query = query.replace(/ /g, '-');
    }

    for (let i = 0; i < try_url.length; i++) {
      try {
        const response = await axios.get(try_url[i]);
        const html = response.data;
        const $ = cheerio.load(html);
        $('h3 a').each((index, element) => {
          const course = {};
          course.course_title = $(element).text();
          course.category = query;
          course.url = $(element).attr('href');
          course.rating = (Math.random() * (5 - 3) + 3).toFixed(1); // Random rating between 3 and 5
          course.enrolledStudents = Math.floor(Math.random() * 8000000) + 1; // Random enrolled students between 1 and 200,000
          course.reviews = Math.floor(Math.random() * 50000) + 1; // Random reviews between 1 and 5000
          course.Certificate = 'Yes';
          course.Price = $(element).text().includes('Educative') ? 'Paid' :( $(element).text().includes('Udemy') ? 'Paid & Free' : 'Free (with subscription)');        
          courses.push(course);
        });
        if (courses.length > 0) {
          let rem = courses.pop();
          return courses;
        }
      } catch (e) {
        console.log('e',e);
        continue;
      }
    }
  }
  async interestsDeveloper(id) {
    const { DevelopersResume } = this.server.models();
    try {
      const developer = await DevelopersResume.query().where('id', id);
      console.log(developer);
      let interests = developer[0].intrests.split(',');
      return interests;
    } catch (error) {
      console.log('error 160', error);
      return { error: 'Internal Server Error' };
    }
  }
  async developerLogin(data) {
    const { DevelopersResume } = this.server.models();
    try {
      const developer = await DevelopersResume.query().where('email', data.email);
      if (developer.length > 0) {
        if (developer[0].password === data.password) {
          return developer[0];
        } else {
          return { error: 'Password is incorrect' };
        }
      } else {
        return { error: 'Email is incorrect' };
      }
    } catch (error) {
      console.log('error 160', error);
      return { error: 'Internal Server Error' };
    }
  }
};

