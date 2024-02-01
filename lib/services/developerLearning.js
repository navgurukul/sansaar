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
require('dotenv').config();


module.exports = class DeveloperLearning extends Schmervice.Service {
  async createDeveloper(data) {
    const { DevelopersResume } = this.server.models();

    try {
      const oldDeveloper = await DevelopersResume.query().where('email', data.email);
      if (oldDeveloper.length > 0) {
        return [{ Error: true, message: 'Developer already exists', code: 409 }, null];
      }

      const skillsString = data?.skills?.toString();
      const intrestsString = data?.intrests?.toString();
      const programming_languagesString = data?.programming_languages?.toString();
      const known_framworksString = data?.known_framworks?.toString();
      const newData = {
        ...data,
        intrests: intrestsString,
        skills: skillsString,
        programming_languages: programming_languagesString,
        known_framworks: known_framworksString,
      }
      const newDeveloper = await DevelopersResume.query().insert(newData);
      return [null, newDeveloper];
    } catch (error) {
      return [errorHandler(error), null];
    }
  }

  async developerProfile(id) {
    const { DevelopersResume, LearningResource } = this.server.models();
    try {
        const profile = {
            profile: await DevelopersResume.query().where('id', id),
            completedCourse: [await LearningResource.query().where('developers_id', id)],
        };
        return profile;
    } catch (error) {
        return { error: 'Internal Server Error' };
    }
}



  async createResources(data) {
    const { LearningResource } = this.server.models();
    try {
      let newData = await LearningResource.query().where('developers_id', data.developers_id).andWhere('course_name', data.course_name);
      if (newData.length == 0) {
        const newResource = await LearningResource.query().insert(data);
        return newResource;
      }
      return{Message: 'Resource already exists'};
    } catch (error) {
      return { error: 'Internal Server Error' };
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
    const { LearningResource } = this.server.models();
    try {
      const progress = await LearningResource.query().where('developers_id', id);
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
          course.Price = $(element).text().includes('Educative') ? 'Paid' : ($(element).text().includes('Udemy') ? 'Paid & Free' : 'Free (with subscription)');
          courses.push(course);
        });
        if (courses.length > 0) {
          return courses;
        }
      } catch (e) {
        continue;
      }
    }
  }

  async generateContent(recommendations) {
    const apiKey = process.env.API_GOOGLE;
    let { interests, skills } = recommendations
    let prompt = `I have a keen interest in ${interests}, coupled with proficiency in ${skills}. Could you furnish a 9 list of courses? I'm specifically looking for information on course titles, categories, URLs, ratings (preferably around 4.6), enrollment numbers, reviews, certificates, and pricing details. Please provide this information in an array of objects with keys such as course_title, category, url, rating, enrolledStudents, reviews, Certificate, and Price. Additionally. rule 1. must be in an array of objects. rule 2. must have course_title, category, url, rating, enrolledStudents, no_of_reviews, Certificate, and Price. rule 3. must have course links. 4. out put javascript array of object in json, 5. price must in indian rupees don't use icon.`

    if (!apiKey) {
      throw new Error('API_GOOGLE environment variable not set');
    }
    const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
    const payload = {
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ]
    };
    try {
      const response = await axios.post(apiUrl, payload, {
        params: { key: apiKey },
        headers: {
          'Content-Type': 'application/json'
        }
      });

      let rawText = response.data.candidates[0].content.parts[0].text.replace(/\`\`\`/g, '');
      let jsonString = JSON.stringify(rawText);
      let courseListString = JSON.parse(jsonString.replace('/json\\n/g', ''), null, 3);
      if (typeof courseListString !== 'string') {
        return [null, courseListString];
      }

      let courseEntries = courseListString.split('   ');
      let allCourses = [];
      let course = {};

      for (let entry of courseEntries) {
        if (entry.includes(':')) {
          let [validEntry, remainder] = entry.split(',').map(s => s.replace(/\n/g, '').trim());
          if (entry.includes('url')) {
            let match = entry.match(/https?:\/\/[^\s"]+/);
            course['url'] = match ? match[0] : '';
          } else {
            let [key, value] = validEntry.split(":").map(s => s.replace('}', '').trim());
            course[key] = value.replace(/"/g, '');
            if (course.hasOwnProperty('Price')) {
              allCourses.push(course);
              course = {};
            }
          }
        }
      }
      return [null, allCourses];
    } catch (error) {
      return [errorHandler(error), null];
    }
  }
  async interestsDeveloper(id) {
    const { DevelopersResume } = this.server.models();
    try {
      let recommendations = {}
      const developer = await DevelopersResume.query().where('id', id);
      if (developer.length === 0) {
        return [{ error: true, message: 'Developer not found', code: 404 }, null];
      }
      recommendations.interests = developer[0].intrests.split(',');
      recommendations.skills = developer[0].skills.split(',');
      return [null, recommendations];
    } catch (error) {
      return [errorHandler(error), null];
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
      return { error: 'Internal Server Error' };
    }
  }
  async messageAi(message) {
        const apiKey = process.env.API_GOOGLE;
      if (!apiKey) {
        throw new Error('API_GOOGLE environment variable not set');
      }
      const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
      const payload = {
        contents: [
          {
            parts: [
              {
                text: message + "NOTE: make sure that make the response make short and simple. avoid using long sentences."
              }
            ]
          }
        ]
      };
      try {
        const response = await axios.post(apiUrl, payload, {
          params: { key: apiKey },
          headers: {
            'Content-Type': 'application/json'
          }
        });
        let message  = response.data.candidates[0].content.parts[0].text;
        return message
      } catch(error) {
          return {error: 'Internal Server Error'};
      }
  }
};

