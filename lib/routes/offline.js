/* eslint-disable prettier/prettier */
// const Joi = require('@hapi/joi');
// const fs = require('fs');
// const path = require('path');
// const Courses = require('../models/courses');
// const logger = require('../../server/logger');

module.exports = [
    {
        method: 'GET',
        path: '/offline/all',
        options: {
            description: 'Get all content at once for offline use',
            tags: ['api'],
            auth: {
                strategy: 'jwt',
                mode: 'optional',
            },
        },
        handler: async (request, h) => {
            const { pathwayServiceV2, coursesServiceV2 } = request.services();

            try {
              // Fetch all pathway data
              const [pathwayError, pathwayData] = await pathwayServiceV2.find(true);
          
              if (pathwayError) {
                // Handle pathway service error
                console.error('Pathway Service Error:', pathwayError);
                return h.response({ error: 'Error fetching pathway data' }).code(500);
              }
          
              // Use Promise.all to fetch course exercises concurrently
              const coursePromises = pathwayData[0].courses.map(async (course) => {
                const [courseError, courseData] = await coursesServiceV2.getCourseExercise(course.id);
                if (courseError) {
                  console.error(`Error fetching course exercises for course ID ${course.id}:`, courseError);
                  return { ...course, exercises: [] };
                }
          
                return { ...course, exercises: courseData[0].exercises };
              });
          
              // Wait for all coursePromises to resolve
              const allCourses = await Promise.all(coursePromises);

              pathwayData[0].courses = allCourses;
              return pathwayData;
            } catch (err) {
              // Handle unexpected errors
              console.error('Unexpected Error:', err);
              return h.response({ error: 'An unexpected error occurred' }).code(500);
            }
          }
    },
];
