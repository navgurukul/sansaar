/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
/* eslint-disable array-callback-return */
/* eslint-disable no-else-return */
/* eslint-disable prettier/prettier */
/* eslint-disable prefer-const */
/* eslint-disable no-unused-vars */
/* eslint-disable class-methods-use-this */
/* eslint-disable no-prototype-builtins */
const Schmervice = require('schmervice');
const Boom = require('@hapi/boom');
const { transaction, val } = require('objection');
const _ = require('lodash');
const fs = require('fs-extra');
// const glob = require('glob');
const {
  glob
} = require('glob')
const globals = require('node-global-storage');
const path = require('path');
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const { errorHandler } = require('../errorHandling');
const logger = require('../../server/logger');
const CONSTANTS = require('../config/index');
const { UTCToISTConverter } = require('../helpers/index');
require('dotenv').config();

const strapiToMerakiConverter = require('../helpers/strapiToMeraki');
const axios = require('axios');
// eslint-disable-next-line import/order
const Strapi = require('strapi-sdk-js');

const strapi = new Strapi({
  url: process.env.STRAPI_URL,
});

const S3Bucket = new AWS.S3({
  accessKeyId: CONSTANTS.auth.merakiCertificate.s3SecretKeyId,
  secretAccessKey: CONSTANTS.auth.merakiCertificate.s3SecretAccessKey,
  Bucket: CONSTANTS.auth.merakiCertificate.s3Bucket,
});

const allProperties = {};
function loadPropertiesFiles() {
  glob('**/PROPERTIES_FILES/**/*.json', (err, propertiesFiles) => {
    if (!err) {
      _.map(propertiesFiles, (fileName) => {
        allProperties[fileName] = JSON.parse(fs.readFileSync(`${fileName}`));
      });
    }
  });
}
loadPropertiesFiles();

const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const csv = require('csv-parser');
module.exports = class CoursesServiceV2 extends Schmervice.Service {

  async migrateExerciserDataWithSlug() {
    const { ExerciseCompletionV2 } = this.server.models();
    try {
      // ----------- this code is for updating the exercise_completion_v2 table 
      let uniqueIds = [];
      let exercises = await ExerciseCompletionV2.query();
      // Extract all the exercise_ids uniquely and store in an array
      for (let i of exercises) {
        if (!uniqueIds.includes(i.exercise_id)) {
          uniqueIds.push(i.exercise_id);
        }
      }

      for (let i of uniqueIds) {
        let temp = [];
        try {
          let exercise_id = i;
          let url = `http://3.110.213.190/api/exercises/${exercise_id}?populate=*`;
          let exerciseData = await axios.get(url);
          let checkDataExists = exerciseData.data;
          if (Object.keys(checkDataExists).length > 0) {
            let exerciseDataArray = exerciseData.data.data;

            // Extracting values
            const { locale, course, slug } = exerciseDataArray.attributes;
            temp.push(exercise_id);
            let data = {
              slug_id: slug.data.id,
              course_id: course.data.id,
              lang: locale,
              exercise_id: exercise_id,
            };
            console.log('data: ', data); // perfect data
            // console.log('temp: ', temp); // perfect data

            // write a update query here with condition whereIn(temp) in table exercise_completion_v2 table
            let updateData = await ExerciseCompletionV2.query().update(data).whereIn('exercise_id', temp);
            console.log('updateData: ', updateData);
          }
        } catch (error) {
          console.log(error, 'Error inside inner loop');
          // Handle the error here
          console.error('Error fetching data:', error.message);
          // Continue to the next iteration if an error occurs
          continue;
        }
      }
      // Return the final data
      console.log('Inserted Data Successfully');

      //-------- code for creating csv file and inserting data of exercise_completion_V2 table
      let extractData = await ExerciseCompletionV2.query().select('slug_id', 'course_id', 'lang', 'user_id', 'complete_at', 'updated_at', 'team_id');
      // console.log(extractData, 'extractData')

      //store date data in format of "2024-01-14 21:57:44" of column created_at and updated_at
      extractData.forEach((ele) => {
        ele.complete_at = ele.complete_at.toISOString().slice(0, 19).replace('T', ' ');
        ele.updated_at = ele.updated_at.toISOString().slice(0, 19).replace('T', ' ');
      })

      //  console.log(extractData, 'extractData')
      const csvWriter = createCsvWriter({
        path: 'file.csv',
        header: [
          { id: 'slug_id', title: 'slug_id' },
          { id: 'course_id', title: 'course_id' },
          { id: 'lang', title: 'lang' },
          { id: 'user_id', title: 'user_id' },
          { id: 'complete_at', title: 'complete_at' },
          { id: 'updated_at', title: 'updated_at' },
          { id: 'team_id', title: 'team_id' },
        ]
      });

      // Write data to CSV file
      await csvWriter.writeRecords(extractData);

      console.log('Data written to CSV file successfully.');
      return 'Data written to CSV file successfully.';
    } catch (err) {
      console.log(err, 'last error');
      console.error(err, 'last error');
      return [errorHandler(err), 'courses'];
    }
  }

  // ---------------------  pathways_ongoing_topic_outcome ---------------------------------
  async migratePathwaysOngoingTopicOutcome() {
    const { PathwaysOngoingTopicOutcome } = this.server.models();
    try {
      let uniqueExerciseIds = [];
      let uniqueAssessmentIds = [];
      let extractData = await PathwaysOngoingTopicOutcome.query();
      // Extract all the exercise_ids & assessments_ids uniquely and store in an array
      for (let i of extractData) {
        if (i.exercise_id !== null && i.exercise_id !== undefined) {
          if (!uniqueExerciseIds.includes(i.exercise_id)) {
            uniqueExerciseIds.push(i.exercise_id);
          }
        }
        if (i.assessment_id !== null && i.assessment_id !== undefined) {
          if (!uniqueAssessmentIds.includes(i.assessment_id)) {
            uniqueAssessmentIds.push(i.assessment_id);
          }
        }
      }

      // for EXERCISE data
      for (let i of uniqueExerciseIds) {
        let temp = [];
        try {
          let exercise_id = i;
          let url = `http://3.110.213.190/api/exercises/${exercise_id}?populate=*`;
          let exerciseData = await axios.get(url);
          let checkDataExists = exerciseData.data;
          if (Object.keys(checkDataExists).length > 0) {
            let exerciseDataArray = exerciseData.data.data;

            // Extracting values
            const { locale, course, slug } = exerciseDataArray.attributes;
            temp.push(exercise_id);
            let finalData = {
              slug_id: slug.data.id,
              course_id: course.data.id,
              exercise_id: exercise_id,
              type: 'exercise',
            };

            // updating the data in pathways_ongoing_topic_outcome table
            let updateData = await PathwaysOngoingTopicOutcome.query().update(finalData).whereIn('exercise_id', temp);
            console.log('updateData: ', updateData);
          }
        } catch (error) {
          console.log(error, 'Error inside inner loop');
          // Handle the error here
          console.error('Error fetching data:', error.message);
          // Continue to the next iteration if an error occurs
          continue;
        }
      }

      // for ASSESSMENT data
      for (let i of uniqueAssessmentIds) {
        let temp = [];
        try {
          let assessment_id = i;
          let url = `http://3.110.213.190/api/assessments/${assessment_id}?populate=*`;
          let exerciseData = await axios.get(url);
          let checkDataExists = exerciseData.data;
          if (Object.keys(checkDataExists).length > 0) {
            let exerciseDataArray = exerciseData.data.data;

            // Extracting values
            const { course, slug } = exerciseDataArray.attributes;
            temp.push(assessment_id);
            let finalData = {
              slug_id: slug.data.id,
              course_id: course.data.id,
              assessment_id: assessment_id,
              type: 'assessment',
            };

            // updating the data in pathways_ongoing_topic_outcome table 
            let updateData = await PathwaysOngoingTopicOutcome.query().update(finalData).whereIn('assessment_id', temp);
            console.log('updateData: ', updateData);
          }
        } catch (error) {
          console.log(error, 'Error inside inner loop');
          // Handle the error here
          console.error('Error fetching data:', error.message);
          // Continue to the next iteration if an error occurs
          continue;
        }
      }

      // took the data from the pathways_ongoing_topic_outcome table after updating the data
      let extractDataAfterUpdate = await PathwaysOngoingTopicOutcome.query().select('user_id', 'team_id', 'pathway_id', 'course_id', 'slug_id', 'type', 'module_id', 'project_topic_id', 'project_solution_id', 'created_at', 'updated_at');

      //store date data in format of "2024-01-14 21:57:44" of column created_at and updated_at
      extractDataAfterUpdate.forEach((ele) => {
        ele.created_at = ele.created_at.toISOString().slice(0, 19).replace('T', ' ');
        ele.updated_at = ele.updated_at.toISOString().slice(0, 19).replace('T', ' ');
      });

      // write the extractDataAfterUpdate in csv file
      const csvWriter = createCsvWriter({
        path: 'updated_pathway_outcome_.csv',
        header: [
          { id: 'user_id', title: 'user_id' },
          { id: 'team_id', title: 'team_id' },
          { id: 'pathway_id', title: 'pathway_id' },
          { id: 'course_id', title: 'course_id' },
          { id: 'slug_id', title: 'slug_id' },
          { id: 'type', title: 'type' },
          { id: 'module_id', title: 'module_id' },
          { id: 'project_topic_id', title: 'project_topic_id' },
          { id: 'project_solution_id', title: 'project_solution_id' },
          { id: 'created_at', title: 'created_at' },
          { id: 'updated_at', title: 'updated_at' },
        ]
      });
      // Write data to CSV file
      await csvWriter.writeRecords(extractDataAfterUpdate);

      console.log('Data written to CSV file successfully.');
      return 'Data written to CSV file successfully.';
    } catch (err) {
      console.log(err, 'last error');
      console.error(err, 'last error');
      return [errorHandler(err), 'courses'];
    }
  }



  // eslint-disable-next-line class-methods-use-this
  async getAllCourses() {
    let courses;
    try {
      //  pagination with limit -1 will return all data without any limit
      const res = await strapi.find('courses', {
        sort: 'createdAt:asc',
        populate: ['logo'],
        pagination: {
          start: 0,
          limit: -1,
        },
      });
      const courseData = res.data;
      courses = await courseData.map((ele) => {
        return {
          id: ele.id,
          name: ele.attributes.name,
          logo: ele.attributes.logo && ele.attributes.logo.data ? ele.attributes.logo.data.attributes.url : null,
          short_description: ele.attributes.short_description,
          lang_available: ele.attributes.lang_available,
        };
      });
      return [null, courses];
    } catch (err) {
      return [errorHandler(err), courses];
    }
  }

  // eslint-disable-next-line
  async getCourseExercise(course_id, lang = 'en', txn) {
    try {
      const { data } = await strapi.findOne('courses', course_id, {
        populate: ['exercises', 'logo', 'android_logo'],
        pagination: {
          start: 0,
          limit: -1,
        },
      });
      const exercises = data.attributes.exercises.data.map((exercise) => ({
        id: exercise.id,
        name: exercise.attributes.name,
        description: exercise.attributes.description,
        course_id,
        content: strapiToMerakiConverter(exercise.attributes.content),
        type: exercise.attributes.type,
        sequence_num: exercise.attributes.sequence_num,
        updated_at: exercise.attributes.updatedAt,
      }));
      const course = {
        id: data.id,
        name: data.attributes.name,
        logo: data.attributes.logo?.data?.attributes.url || null,
        android_logo: data.attributes.android_logo?.data?.attributes.url || null,
        short_description: data.attributes.short_description,
        lang_available: data.attributes.lang_available,
        exercises,
      };
      return [null, [course]];
    } catch (error) {
      return [errorHandler(error), null];
    }
  }


  async getCourseExercisesBySlug(course_id, lang) {
    const { exercisesServiceV2, assessmentService } = this.server.services();
    try {
      const { data } = await strapi.findOne('courses', course_id, {
        populate: ['slugs', 'logo', 'android_logo'],
        pagination: {
          start: 0,
          limit: -1,
        },
      });

      if (!data) {
        throw new Error('Course not found');
      }
      const courseSlugs = data && data.attributes && data.attributes.slugs;
      let content = [];
      if (courseSlugs && courseSlugs.data) {
        for (const slug of courseSlugs.data) {
          if (slug.attributes.type === 'prequiz') {
            // Skip the current iteration and move to the next slug without deleting
            continue;
          }
          else if (slug.attributes.type === 'exercise') {
            const exerciseData = await exercisesServiceV2.getSlugsExercises(slug.id, lang);
            const exercisesContent = { data: exerciseData.flat() };
            const exercises = exercisesContent.data.map((exercise) => ({
              content_type: slug.attributes.type,
              name: exercise.attributes.name,
              description: exercise.attributes.description,
              course_id,
              slug_id: exercise.slug_id,
              content: strapiToMerakiConverter(exercise.attributes.content),
            }));
            content.push(exercises);
          } else if (slug.attributes.type === 'assessment') {
            const assessmentData = await assessmentService.getSlugsAssessments(slug.id, lang);
            if (assessmentData && assessmentData[0] !== null && assessmentData[0] !== undefined) {
              assessmentData[0].course_id = course_id;
              assessmentData[0].slug_id = slug.id;
              content.push(assessmentData);
            }
          } else {
            logger.error('ERROR in fetching this language data');
            return [new Error('ERROR in fetching this language data')];
          }
        }
      } else {
        logger.error('Error: This course not contains any content');
        return ['Error: This course not contains any content']
      }
      const course = {
        id: data.id,
        name: data.attributes.name,
        logo: data.attributes.logo?.data?.attributes?.url || null,
        android_logo: data.attributes.android_logo?.data?.attributes?.url || null,
        short_description: data.attributes.short_description,
        lang_available: data.attributes.lang_available,
        course_content: content.flat(),
      };
      return [null, course];
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }


  async getRecommendedCourses() {
    try {
      let allCourses = await strapi.find('courses', {
        populate: ['logo'],
        // fields: ['id', 'name', 'logo', 'short_description', 'lang_available'],
      })
      const shuffled = allCourses.data.sort(() => 0.5 - Math.random());
      let courses = shuffled.slice(0, 2);
      let recommendedCourses = []
      courses = courses.map((cor) => {
        recommendedCourses.push({
          id: cor.id,
          name: cor.attributes.name,
          logo: cor.attributes.logo && cor.attributes.logo.data ? cor.attributes.logo.data.attributes.url : null,
          short_description: cor.attributes.short_description,
          lang_available: cor.attributes.lang_available,
        })
      })

      return [null, recommendedCourses];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }


  async findByCourseName(name) {
    try {
      const courses = await strapi.find('courses', {
        populate: ['logo'],
        filters: {
          name: {
            $eq: name
          }
        },
      });

      if (courses.data && courses.data.length > 0) {
        const matchedCourse = courses.data[0];

        const course = {
          id: matchedCourse.id,
          name: matchedCourse.attributes.name,
          logo: matchedCourse.attributes.logo && matchedCourse.attributes.logo.data ? matchedCourse.attributes.logo.data.attributes.url : null,
          short_description: matchedCourse.attributes.short_description,
          lang_available: matchedCourse.attributes.lang_available,
        };

        return [null, course];
      } else {
        // Course not found with the given name
        return [null, null];
      }
    } catch (err) {
      return [errorHandler(err), null];
    }
  }


  async markCourseComplete(userId, courseId) {
    const { CourseCompletionV3 } = this.server.models();
    const dateIST = UTCToISTConverter(new Date());
    const completedCourse = { user_id: userId, course_id: courseId, complete_at: dateIST };
    try {
      await CourseCompletionV3.query()
        .context({ user_id: userId, course_id: courseId, complete_at: dateIST })
        .insert(completedCourse);
      return [null, { success: true }];
    } catch (err) {
      const errorObj = errorHandler(err);
      if (errorObj.type === 'UniqueViolationError')
        errorObj.message = 'Course might have already been marked completed';
      return [errorObj, null];
    }
  }

  async getIdForRemoval(userId, courseId) {
    const { CourseCompletionV3 } = this.server.models();
    const course = await CourseCompletionV3.query().where({
      user_id: userId,
      course_id: courseId,
    });
    if (course.length > 0) {
      return course;
    }
    throw Boom.badRequest('Course might have already been marked incomplete');
  }

  async removeCourseComplete(id, userId, courseId) {
    const { CourseCompletionV3 } = this.server.models();
    const courseCompletion = await CourseCompletionV3.fromJson({
      id,
      user_id: userId,
      course_id: courseId,
    });
    const success = await courseCompletion
      .$query()
      .context({ user_id: userId, course_id: courseId })
      .delete();
    if (success) return { success: true };
    throw Boom.badRequest('Course might have already been marked incompleted');
  }

  async getCourseComplete(userId) {
    const { CourseCompletionV3 } = this.server.models();
    let completedCourse;
    try {
      completedCourse = await CourseCompletionV3.query().throwIfNotFound().where('user_id', userId);
      return [null, completedCourse];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async createCourses(v1Courses) {
    const { CoursesV2, Exercises } = this.server.models();
    const { exercisesServiceV2 } = this.server.services();
    // eslint-disable-next-line
    for (const course of v1Courses) {
      const courseSingle = _.pick(course, ['name', 'logo', 'short_description']);
      courseSingle.lang_available = val('en').asArray().castTo('text[]');
      // eslint-disable-next-line
      const courseDetail = await CoursesV2.query().insert(courseSingle);
      const courseFolderName = `${courseSingle.name}_${courseDetail.id}`;
      if (!fs.existsSync(`curriculum_new/${courseFolderName}`)) {
        fs.mkdirSync(`curriculum_new/${courseFolderName}`);
      }
      // eslint-disable-next-line
      const courseExercises = await Exercises.query()
        .where('course_id', course.id)
        .orderBy('sequence_num');
      if (courseExercises.length > 0) {
        // eslint-disable-next-line
        for (const singleExercise of courseExercises) {
          const exerciseData = {};
          exerciseData.name =
            singleExercise.parent_exercise_id == null
              ? singleExercise.name
              : singleExercise.slug
                .substring(
                  singleExercise.slug.lastIndexOf('__') + 2,
                  singleExercise.slug.lastIndexOf('_')
                )
                .replace(/\//g, '_');
          const filePath = singleExercise.slug.replace(/__/g, '/').replace(/_([^_]*)$/, '.$1');
          if (fs.existsSync(`curriculum/${filePath}`)) {
            const dataInString = fs.readFileSync(`curriculum/${filePath}`);
            exerciseData.description = `information about ${exerciseData.name}`;
            exerciseData.course_id = courseDetail.id;
            exerciseData.content = JSON.stringify(JSON.parse(dataInString.toString().trim()));
            exerciseData.sequence_num = singleExercise.sequence_num;
            exerciseData.type = 'exercise';
            // eslint-disable-next-line
            await exercisesServiceV2.addExercises(exerciseData);
          }
        }
      }
    }
    return v1Courses;
  }

  // eslint-disable-next-line class-methods-use-this
  async getPathwayIdByCourseId(id) {
    // const { PathwayCoursesV2 } = this.server.models();
    try {
      const { data } = await strapi.findOne('courses', id, {
        populate: ['pathway'],
      });
      return [null, data.attributes.pathway.data.id];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async StoreTranslatedContent() {
    const { Courses, Exercises, CoursesV2, ExercisesV2 } = this.server.models();
    try {
      const courses = await Courses.query().where('course_type', 'json');
      const coursesV2 = await CoursesV2.query();
      const language = ['hi', 'te', 'mr', 'ta'];
      // eslint-disable-next-line
      for (const lang of language) {
        const keyPropMapping = {};
        if (courses !== null && courses !== undefined && courses.length > 0) {
          // eslint-disable-next-line
          for (const course of courses) {
            const courseSingle = _.pick(course, ['name', 'logo', 'short_description']);
            courseSingle.lang_available = val('en').asArray().castTo('text[]');
            // eslint-disable-next-line
            const courseExercises = await Exercises.query()
              .where('course_id', course.id)
              .orderBy('sequence_num');
            if (courseExercises.length > 0) {
              // eslint-disable-next-line
              for (const singleExercise of courseExercises) {
                const filePath = singleExercise.slug
                  .replace(/__/g, '/')
                  .replace(/_([^_]*)$/, '.$1');
                if (fs.existsSync(`curriculum/${filePath}`)) {
                  const exerciseName = filePath.split('/').pop().split('.')[0];
                  const fileRelPath = filePath.split('/').slice(1).join('/');
                  const courseName = filePath.split('/')[0];
                  let propertiesFilePath;
                  if (fileRelPath.indexOf('/') > -1) {
                    const subDir = fileRelPath.split('/')[0];
                    propertiesFilePath = `curriculum/${courseName}/PARSED_CONTENT/PROPERTIES_FILES/${subDir}/${courseSingle.name}_json_${exerciseName}`;
                  } else {
                    propertiesFilePath = `curriculum/${courseName}/PARSED_CONTENT/PROPERTIES_FILES/${courseSingle.name}_json_${exerciseName}`;
                  }
                  if (fs.existsSync(`${propertiesFilePath}_en.json`)) {
                    const Content = fs.readFileSync(`${propertiesFilePath}_en.json`);
                    const parsedContent = JSON.parse(Content.toString().trim());
                    // eslint-disable-next-line
                    for (const enKey in parsedContent) {
                      if (fs.existsSync(`${propertiesFilePath}_${lang}.json`)) {
                        const translatedContent = fs.readFileSync(
                          `${propertiesFilePath}_${lang}.json`
                        );
                        const translatedParsedContent = JSON.parse(
                          translatedContent.toString().trim()
                        );
                        // eslint-disable-next-line
                        if (translatedParsedContent.hasOwnProperty(enKey)) {
                          keyPropMapping[
                            parsedContent[enKey]
                          ] = `${translatedParsedContent[enKey]}`;
                        }
                      }
                    }
                  }
                }
              }
            }
            if (fs.existsSync(`curriculum_v2/${courseSingle.name}/`)) {
              // eslint-disable-next-line
              const [err, course_version] = await this.findDetailInCourseVersionsById(
                courseSingle.name
              );
              // eslint-disable-next-line
              const version = parseInt(course_version[0].version.split('v')[1]);
              for (let i = 1; i <= version; i += 1) {
                if (fs.existsSync(`curriculum_v2/${courseSingle.name}/v${i}`)) {
                  if (
                    fs.existsSync(
                      `curriculum_v2/${courseSingle.name}/v${i}/PARSED_CONTENT/MODIFIED_FILES`
                    )
                  ) {
                    fs.readdirSync(
                      `curriculum_v2/${courseSingle.name}/v${i}/PARSED_CONTENT/MODIFIED_FILES`
                      // eslint-disable-next-line
                    ).forEach((file) => {
                      const propertiesFilePath = `curriculum_v2/${courseSingle.name
                        }/v${i}/PARSED_CONTENT/PROPERTIES_FILES/${file.split('.')[0]}`;
                      if (fs.existsSync(`${propertiesFilePath}_en.json`)) {
                        const Content = fs.readFileSync(`${propertiesFilePath}_en.json`);
                        const parsedContent = JSON.parse(Content.toString().trim());
                        // eslint-disable-next-line
                        for (const enKey in parsedContent) {
                          if (fs.existsSync(`${propertiesFilePath}_${lang}.json`)) {
                            const translatedContent = fs.readFileSync(
                              `${propertiesFilePath}_${lang}.json`
                            );
                            const translatedParsedContent = JSON.parse(
                              translatedContent.toString().trim()
                            );
                            // eslint-disable-next-line
                            if (translatedParsedContent.hasOwnProperty(enKey)) {
                              keyPropMapping[
                                parsedContent[enKey]
                              ] = `${translatedParsedContent[enKey]}`;
                            }
                          }
                        }
                      }
                    });
                  }
                }
              }
            }
          }
        }
        if (coursesV2 !== null && coursesV2 !== undefined && coursesV2.length > 0) {
          // eslint-disable-next-line
          for (const course of coursesV2) {
            const courseSingle = _.pick(course, ['name', 'logo', 'short_description']);
            courseSingle.lang_available = val('en').asArray().castTo('text[]');
            // eslint-disable-next-line
            const courseExercises = await ExercisesV2.query()
              .where('course_id', course.id)
              .orderBy('sequence_num');
            if (courseExercises.length > 0) {
              // eslint-disable-next-line
              for (const singleExercise of courseExercises) {
                const propertiesFilePath = `curriculum_new/${courseSingle.name}_${course.id}/PARSED_CONTENT/PROPERTIES_FILES/${singleExercise.name}`;
                if (fs.existsSync(`${propertiesFilePath}_en.json`)) {
                  const Content = fs.readFileSync(`${propertiesFilePath}_en.json`);
                  const parsedContent = JSON.parse(Content.toString().trim());
                  // eslint-disable-next-line
                  for (const enKey in parsedContent) {
                    if (fs.existsSync(`${propertiesFilePath}_${lang}.json`)) {
                      const translatedContent = fs.readFileSync(
                        `${propertiesFilePath}_${lang}.json`
                      );
                      const translatedParsedContent = JSON.parse(
                        translatedContent.toString().trim()
                      );
                      // eslint-disable-next-line
                      if (translatedParsedContent.hasOwnProperty(enKey)) {
                        keyPropMapping[parsedContent[enKey]] = `${translatedParsedContent[enKey]}`;
                      }
                    }
                  }
                }
              }
            }
          }
        }
        globals.set(lang, [keyPropMapping]);
      }
      return [null, courses];
    } catch (err) {
      logger.error(JSON.stringify(err));
      return [errorHandler(err), null];
    }
  }

  // eslint-disable-next-line
  async uploadToS3(fileObj) {
    const key = `courseEditor/${uuidv4()}-${fileObj.hapi.filename}`;
    // console.log(key, 'key.auth.aws.s3Bucket');
    try {
      // eslint-disable-next-line
      const uploaded = await S3Bucket.putObject({
        Bucket: CONSTANTS.auth.aws.s3Bucket,
        Key: key,
        Body: fileObj._data,
        ContentType: fileObj.hapi.headers['content-type'],
      }).promise();
      return {
        success: 1,
        file: {
          // eslint-disable-next-line
          url: `https://${CONSTANTS.auth.aws.s3Bucket}.s3.ap-south-1.amazonaws.com/` + key,
          // ... and any additional fields you want to store, such as width, height, color, extension, etc
        },
      };
    } catch (e) {
      return {
        success: 0,
      };
      // throw new Error(e);
    }
  }

  async updateImagesLinkCourses(course, getCourseDetails) {
    const { Exercises, ExercisesV2 } = this.server.models();
    const { exercisesServiceV2 } = this.server.services();
    try {
      const courseSingle = _.pick(course, ['name', 'logo', 'short_description']);
      courseSingle.lang_available = val('en').asArray().castTo('text[]');
      const courseExercises = await Exercises.query()
        .where('course_id', course.id)
        .orderBy('sequence_num');
      if (courseExercises.length > 0) {
        // eslint-disable-next-line
        for (const singleExercise of courseExercises) {
          const filePath = singleExercise.slug.replace(/__/g, '/').replace(/_([^_]*)$/, '.$1');
          if (fs.existsSync(`curriculum/${filePath}`)) {
            const exerciseName = filePath.split('/').pop().split('.')[0];
            const fileRelPath = filePath.split('/').slice(1).join('/');
            const courseName = filePath.split('/')[0];
            let modifiedFilePath;
            let modifiedFilePathNew;
            let fileName;

            if (fileRelPath.indexOf('/') > -1) {
              const subDir = fileRelPath.split('/')[0];
              modifiedFilePath = `curriculum/${courseName}/PARSED_CONTENT/MODIFIED_FILES/${subDir}/${courseSingle.name}_json_${exerciseName}.json`;
              modifiedFilePathNew = `curriculum_new/${getCourseDetails.name}_${getCourseDetails.id}/PARSED_CONTENT/MODIFIED_FILES/${getCourseDetails.name}_${getCourseDetails.id}_${subDir}_${exerciseName}.json`;
              fileName = `${subDir}_${exerciseName}`;
            } else {
              modifiedFilePath = `curriculum/${courseName}/PARSED_CONTENT/MODIFIED_FILES/${courseSingle.name}_json_${exerciseName}.json`;
              modifiedFilePathNew = `curriculum_new/${getCourseDetails.name}_${getCourseDetails.id}/PARSED_CONTENT/MODIFIED_FILES/${getCourseDetails.name}_${getCourseDetails.id}_${exerciseName}.json`;
              fileName = `${exerciseName}`;
            }
            let linkChanges = false;
            if (fs.existsSync(modifiedFilePathNew) && fs.existsSync(modifiedFilePath)) {
              const modifiedContent = JSON.parse(fs.readFileSync(modifiedFilePath));
              const newModifiedContent = JSON.parse(fs.readFileSync(modifiedFilePathNew));
              // eslint-disable-next-line
              for (const data in newModifiedContent) {
                if (
                  newModifiedContent[data] &&
                  modifiedContent[data] &&
                  newModifiedContent[data].component === 'image' &&
                  modifiedContent[data].component === 'image'
                ) {
                  linkChanges = true;
                  newModifiedContent[data].value = modifiedContent[data].value;
                }
              }
              if (linkChanges) {
                fs.writeFileSync(
                  path.resolve(modifiedFilePathNew),
                  JSON.stringify(newModifiedContent, null, '\t')
                );
                // eslint-disable-next-line
                const [err, exercise] = await exercisesServiceV2.getExerciseByName(fileName);
                exercise[0].content = JSON.stringify([
                  JSON.stringify({ value: newModifiedContent }),
                ]);
                // eslint-disable-next-line
                await ExercisesV2.query().patch(exercise[0]).where('id', exercise[0].id);
                linkChanges = false;
              }
            }
          }
        }
      }
      return [null, 'updated'];
    } catch (err) {
      logger.error(JSON.stringify(err));
      return [errorHandler(err), null];
    }
  }

  async getcourseByprequiz(course_id) {
    const { assessmentService } = this.server.services();
    try {
      const { data } = await strapi.findOne('courses', course_id, {
        populate: ['prequizs', 'prequizs.option', 'prequizs.slug'],
        pagination: {
          start: 0,
          limit: -1,
        },
      });
      if (!data) {
        throw new Error('Course not found');
      }

      let preQuizData = data.attributes.prequizs.data;
      let content = [];
      for (let prequiz of preQuizData) {
        let slug_id = prequiz.attributes.slug.data.id;
        delete prequiz.attributes.course_type;
        delete prequiz.attributes.slug;
        let preQuezes = await assessmentService.getSlugsPreQuiz(prequiz);

        if (preQuezes && preQuezes[0] !== null && preQuezes[0] !== undefined) {
          preQuezes[0].course_id = parseInt(course_id);;
          preQuezes[0].slug_id = slug_id;
          content.push(preQuezes);
        }
      }

      const course = {
        id: data.id,
        name: data.attributes.name,
        short_description: data.attributes.short_description,
        lang_available: data.attributes.lang_available,
        course_content: content.flat(),
      };
      return [null, course];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

};
