/* eslint-disable prettier/prettier */
/* eslint-disable prefer-const */
/* eslint-disable array-callback-return */
/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
/* eslint-disable class-methods-use-this */
/* eslint-disable no-unused-expressions */
/* eslint-disable dot-notation */
/* eslint-disable eqeqeq */
const Schmervice = require('schmervice');
const Boom = require('@hapi/boom');
const fs = require('fs-extra');
const path = require('path');
const _ = require('lodash');
const globals = require('node-global-storage');
const { Translate } = require('@google-cloud/translate').v2;
const Strapi = require('strapi-sdk-js');
const CONFIG = require('../config/index');
const logger = require('../../server/logger');
const { UTCToISTConverter } = require('../helpers/index');

const CREDENTIALS = JSON.parse(CONFIG.auth.translation.googleTranslation);
const { errorHandler } = require('../errorHandling');
const strapiToMerakiConverter = require('../helpers/strapiToMeraki');

const strapi = new Strapi({
  url: process.env.STRAPI_URL,
});

const translate = new Translate({
  credentials: CREDENTIALS,
  projectId: CREDENTIALS.project_id,
});

module.exports = class ExercisesServiceV2 extends Schmervice.Service {
  // eslint-disable-next-line
  async googleTranslate(text, target) {
    try {
      const [translation] = await translate.translate(text, target);
      return translation;
    } catch (error) {
      return error;
    }
  }

  async getExerciseByName(name) {
    const { ExercisesV2 } = this.server.models();
    let exercise;
    try {
      exercise = await ExercisesV2.query().where('name', name);
      return [null, exercise];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getExerciseById(id) {
    const { ExercisesV2 } = this.server.models();
    let exercise;
    try {
      exercise = await ExercisesV2.query().where('id', id);
      return [null, exercise];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async addExercises(data) {
    const { ExercisesV2, CoursesV2 } = this.server.models();
    try {
      const courseDetails = await CoursesV2.query().findById(data.course_id);
      if (courseDetails !== undefined) {
        const courseFolderName = `curriculum_new/${courseDetails.name}_${data.course_id}`;
        if (fs.existsSync(`${courseFolderName}`)) {
          fs.writeFileSync(
            path.resolve(`${courseFolderName}/${data.name}.json`),
            JSON.stringify(JSON.parse(data.content), null, '\t')
          );
        }
        const exerciseContant = await this.parsedModifiedContent(
          courseFolderName,
          data.name,
          data.content,
          'curriculum_new'
        );
        data.content = exerciseContant;
        const propertiesFilePath = `${courseFolderName}/PARSED_CONTENT/PROPERTIES_FILES/${courseDetails.name}_${data.course_id}_${data.name}`;
        await this.doTranslate(propertiesFilePath);
      }
      // const exercisesV2Details = await ExercisesV2.query().where('name', data.name);
      // let newExercise;
      // if (
      //   exercisesV2Details.length > 0 &&
      //   exercisesV2Details !== undefined &&
      //   exercisesV2Details !== null
      // ) {
      //   newExercise = await ExercisesV2.query().patch(data).where('id', exercisesV2Details[0].id);
      // } else {
      //   newExercise = await ExercisesV2.query().insert(data);
      // }
      const newExercise = await ExercisesV2.query().insert(data);
      return [null, newExercise];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async parsedModifiedContent(
    courseFolderName,
    exerciseName,
    exerciseContent,
    basePath = 'curriculum_new'
  ) {
    const contentByParts = [];
    let contentKeys = '';
    let allJSONKeys;
    let beginKeyOn = 0;
    const parsedDataInString = JSON.parse(exerciseContent);
    _.map(parsedDataInString, (img) => {
      if (img.component === 'image') {
        if (!img.value.startsWith('http')) {
          const imagePath = `${courseFolderName}/${img.value}`;
          const awsS3Path = `https://${CONFIG.auth.aws.s3Bucket
            }.s3.ap-south-1.amazonaws.com/course_images_v2/${imagePath.split(`${basePath}/`)[1]}`;
          img.value = awsS3Path;
        }
      }
      if (img.component === 'table') {
        // eslint-disable-next-line no-restricted-syntax
        for (const head in img.value) {
          if (img.value[head].header.includes('Image')) {
            // eslint-disable-next-line no-restricted-syntax, guard-for-in
            for (const src in img.value[head].items) {
              // eslint-disable-next-line no-console
              const a = img.value[head].items[src];
              const actualSrc = a.split('src="')[1].split('" alt=')[0];
              const awsS3Path = `https://${CONFIG.auth.aws.s3Bucket
                }.s3.ap-south-1.amazonaws.com/course_images_v2/${courseFolderName.split(`/`)[1]
                }/${actualSrc}`;
              img.value[head].items[src] = a.replace(actualSrc, awsS3Path);
            }
          }
        }
      }
    });

    const parsedContent = JSON.parse(
      await this.parseIntoModifiedContent(
        `${courseFolderName}/${exerciseName}`,
        parsedDataInString,
        beginKeyOn
      )
    );
    if (parsedContent.length > 0) {
      const { beginKeyFrom, jsonKeys, ...contents } = parsedContent[0];
      beginKeyOn = beginKeyFrom;
      contentKeys += JSON.stringify(contents.value, null, 2);
      allJSONKeys = { ...allJSONKeys, ...jsonKeys };
      contentByParts.push(JSON.stringify(contents));
    }
    await this.createParsedContent(
      courseFolderName,
      exerciseName,
      contentKeys,
      allJSONKeys,
      basePath
    );
    const allContentByParts = JSON.stringify(contentByParts);
    return allContentByParts;
  }

  // eslint-disable-next-line
  async parseIntoModifiedContent(filePath, jsonContent, beginKeyOn) {
    const exerciseName = filePath.split('/').pop().split('.')[0];
    let keyNumber = beginKeyOn;
    let keyProp;
    const keyPropMapping = {};
    const exercise = [];
    _.map(jsonContent, (jsonData) => {
      if (
        jsonData.component !== 'code' &&
        jsonData.component !== 'questionCode' &&
        jsonData.component !== 'table' &&
        jsonData.component !== 'youtube' &&
        jsonData.component !== 'image' &&
        jsonData.component !== 'banner' &&
        jsonData.component !== 'solution' &&
        jsonData.component !== 'options' &&
        jsonData.component !== 'output'
      ) {
        let modifiedContent = '';
        keyNumber += 1;
        keyProp = `${exerciseName}_key${keyNumber}`;
        modifiedContent += `${keyProp}`;
        keyPropMapping[keyProp] = `${jsonData.value}`;
        jsonData.value = modifiedContent;
      } else if (jsonData.component === 'table') {
        _.map(jsonData.value, (table) => {
          let modifiedContent = '';
          keyNumber += 1;
          keyProp = `${exerciseName}_key${keyNumber}`;
          modifiedContent += `${keyProp}`;
          keyPropMapping[keyProp] = `${table.header}`;
          const itemsTable = [];
          _.map(table.items, (tokenText) => {
            let modifiedContentItems = '';
            keyNumber += 1;
            keyProp = `${exerciseName}_key${keyNumber}`;
            modifiedContentItems += `${keyProp}`;
            keyPropMapping[keyProp] = `${tokenText}`;
            itemsTable.push(modifiedContentItems);
          });
          table.header = modifiedContent;
          table.items = itemsTable;
        });
      } else if (jsonData.component === 'image') {
        let modifiedContent = '';
        keyNumber += 1;
        keyProp = `${exerciseName}_key${keyNumber}`;
        modifiedContent += `${keyProp}`;
        keyPropMapping[keyProp] = `${jsonData.alt}`;
        jsonData.alt = modifiedContent;
      } else if (jsonData.component === 'options') {
        // eslint-disable-next-line
        _.forEach(jsonData.value, (innerList) => {
          let modifiedContent = '';
          keyNumber += 1;
          keyProp = `${exerciseName}_key${keyNumber}`;
          modifiedContent += `${keyProp}`;
          keyPropMapping[keyProp] = `${innerList.value}`;
          innerList.value = modifiedContent;
        });
      } else if (jsonData.component === 'output') {
        _.forEach(jsonData.value, (innerList) => {
          _.forEach(innerList, (innerToken) => {
            let modifiedContent = '';
            keyNumber += 1;
            keyProp = `${exerciseName}_key${keyNumber}`;
            modifiedContent += `${keyProp}`;
            keyPropMapping[keyProp] = `${innerToken.value}`;
            innerToken.value = modifiedContent;
          });
        });
      }
    });
    exercise.push({
      value: jsonContent,
      jsonKeys: keyPropMapping,
      beginKeyFrom: keyNumber,
    });

    const formattedExercise = _.filter(exercise, (x) => x.value);
    return JSON.stringify(formattedExercise);
  }
  // eslint-disable-next-line
  async createParsedContent(
    courseFolderName,
    exerciseFileName,
    contentKeys,
    allJSONKeys,
    basePath = 'curriculum_new'
  ) {
    if (!fs.existsSync(`${courseFolderName}/PARSED_CONTENT`)) {
      fs.mkdirSync(`${courseFolderName}/PARSED_CONTENT`);
      fs.mkdirSync(`${courseFolderName}/PARSED_CONTENT/MODIFIED_FILES`);
      fs.mkdirSync(`${courseFolderName}/PARSED_CONTENT/PROPERTIES_FILES`);
    }
    const partPath = courseFolderName.split(`${basePath}/`)[1];
    if (basePath === 'assessment') {
      fs.writeFileSync(
        path.resolve(`${courseFolderName}/PARSED_CONTENT/MODIFIED_FILES/${exerciseFileName}.json`),
        contentKeys
      );
      fs.writeFileSync(
        path.resolve(
          `${courseFolderName}/PARSED_CONTENT/PROPERTIES_FILES/${exerciseFileName}_en.json`
        ),
        JSON.stringify(allJSONKeys, null, '\t')
      );
    } else {
      fs.writeFileSync(
        path.resolve(
          `${courseFolderName}/PARSED_CONTENT/MODIFIED_FILES/${partPath}_${exerciseFileName}.json`
        ),
        contentKeys
      );
      fs.writeFileSync(
        path.resolve(
          `${courseFolderName}/PARSED_CONTENT/PROPERTIES_FILES/${partPath}_${exerciseFileName}_en.json`
        ),
        JSON.stringify(allJSONKeys, null, '\t')
      );
    }
  }

  async updateSingleExercises(exerciseId, data) {
    const { ExercisesV2, CoursesV2 } = this.server.models();
    let exerciseContant;
    try {
      if (data.name !== undefined || data.content !== undefined) {
        const exerciseDetails = await ExercisesV2.query().findById(exerciseId);
        const courseDetails = await CoursesV2.query().findById(exerciseDetails.course_id);
        const language = ['hi', 'en', 'te', 'mr', 'ta'];
        if (courseDetails !== undefined) {
          const courseFolderName = `curriculum_new/${courseDetails.name}_${courseDetails.id}`;
          const partPath = courseFolderName.split('curriculum_new/')[1];
          if (data.name !== undefined) {
            if (fs.existsSync(`${courseFolderName}`)) {
              const courseData = fs.readFileSync(
                `${courseFolderName}/${exerciseDetails.name}.json`
              );
              const allJsonData = courseData.toString().trim();
              fs.renameSync(
                `${courseFolderName}/${exerciseDetails.name}.json`,
                `${courseFolderName}/${data.name}.json`
              );
              fs.renameSync(
                `${courseFolderName}/PARSED_CONTENT/MODIFIED_FILES/${partPath}_${exerciseDetails.name}.json`,
                `${courseFolderName}/PARSED_CONTENT/MODIFIED_FILES/${partPath}_${data.name}.json`
              );
              // eslint-disable-next-line
              for (const lang in language) {
                if (
                  fs.existsSync(
                    `${courseFolderName}/PARSED_CONTENT/PROPERTIES_FILES/${partPath}_${exerciseDetails.name}_${language[lang]}.json`
                  )
                ) {
                  fs.renameSync(
                    `${courseFolderName}/PARSED_CONTENT/PROPERTIES_FILES/${partPath}_${exerciseDetails.name}_${language[lang]}.json`,
                    `${courseFolderName}/PARSED_CONTENT/PROPERTIES_FILES/${partPath}_${data.name}_${language[lang]}.json`
                  );
                }
              }
              exerciseDetails.name = data.name;
              if (data.content === undefined) {
                exerciseContant = await this.parsedModifiedContent(
                  courseFolderName,
                  data.name,
                  allJsonData
                );
                const propertiesFilePath = `${courseFolderName}/PARSED_CONTENT/PROPERTIES_FILES/${partPath}_${data.name}`;
                await this.doTranslate(propertiesFilePath);
              }
            }
          }
          if (data.content !== undefined) {
            if (fs.existsSync(`${courseFolderName}`)) {
              fs.writeFileSync(
                path.resolve(`${courseFolderName}/${exerciseDetails.name}.json`),
                JSON.stringify(JSON.parse(data.content), null, '\t')
              );
            }
            exerciseContant = await this.parsedModifiedContent(
              courseFolderName,
              exerciseDetails.name,
              data.content
            );
            data.content = exerciseContant;
            const propertiesFilePath = `${courseFolderName}/PARSED_CONTENT/PROPERTIES_FILES/${partPath}_${exerciseDetails.name}`;
            await this.doTranslate(propertiesFilePath);
          }
        }
      }
      const updated = await ExercisesV2.query().patch(data).where('id', exerciseId);
      return [null, updated];
    } catch (err) {
      logger.error(JSON.stringify(err));
      return [errorHandler(err), null];
    }
  }


  async calculateCourseModulePathwayPercent(userId = null, course_id, team_id = null) {
    const { CourseCompletionV3, PathwayCompletionV2, ModuleCompletionV2 } = this.server.models();
    const { progressTrackingService, pathwayServiceV2 } = this.server.services();

    const dateIST = UTCToISTConverter(new Date());

    try {

      if (course_id !== null && course_id !== undefined) {

        let coursePercentage = 0

        if (team_id) {
          const [
            errInPercentage, coursePer
            // eslint-disable-next-line
          ] = await progressTrackingService.getProgressTrackPercentagec4ca(
            team_id,
            course_id
          );

          coursePercentage = coursePer
        } else {
          const [
            errInPercentage,
            coursePer
            // eslint-disable-next-line
          ] = await progressTrackingService.getProgressTrackPercentage(
            userId,
            course_id
          );
          coursePercentage = coursePer
        }
        let existsCourse;
        let completedCourse;
        if (team_id) {
          completedCourse = { course_id: course_id, complete_at: dateIST, percentage: coursePercentage, team_id: team_id };
          existsCourse = await CourseCompletionV3.query().where({
            team_id: team_id,
            course_id: course_id
          });
        } else {
          completedCourse = { user_id: userId, course_id: course_id, complete_at: dateIST, percentage: coursePercentage };
          existsCourse = await CourseCompletionV3.query().where({
            user_id: userId,
            course_id: course_id
          });
        }
        if (existsCourse !== null && existsCourse !== undefined && existsCourse.length > 0) {
          if (team_id) {
            await CourseCompletionV3.query().update(completedCourse).where("team_id", team_id).andWhere("course_id", course_id);
          } else {
            await CourseCompletionV3.query().update(completedCourse).where("user_id", userId).andWhere("course_id", course_id);
          }
        } else {
          await CourseCompletionV3.query().insert(completedCourse);
        }

        const moduleCourseDetails = await strapi.findOne('courses', course_id, {
          populate: ['modules']
        });

        const modules = moduleCourseDetails&&moduleCourseDetails.data&&moduleCourseDetails.data.attributes&&moduleCourseDetails.data.attributes.modules

        if (modules !== null && modules !== undefined && modules.data.length > 0) {
          const module_id = moduleCourseDetails&&moduleCourseDetails.data&&moduleCourseDetails.data.attributes&&moduleCourseDetails.data.attributes.modules&&moduleCourseDetails.data.attributes.modules.data[0]&&moduleCourseDetails.data.attributes.modules.data[0].id
          if (module_id !== null && module_id !== undefined) {

            let sum = 0;
            let count = 0;

            const moduleDetails = await strapi.findOne(
              'modules',
              module_id,
              { populate: ['courses'] }
            );
            const moduleCoursePercentDetails = moduleDetails&&moduleDetails.data&&moduleDetails.data.attributes&&moduleDetails.data.attributes.courses&&moduleDetails.data.attributes.courses.data

            if (moduleCoursePercentDetails !== null && moduleCoursePercentDetails !== undefined) {

              for (const singleCourse of moduleCoursePercentDetails) {
                let coursePercent;
                if (team_id) {
                  coursePercent = await CourseCompletionV3.query().where({
                    user_id: userId,
                    course_id: singleCourse.id,
                  });

                } else {
                  coursePercent = await CourseCompletionV3.query().where({
                    team_id: team_id,
                    course_id: singleCourse.id,
                  });
                }


                if (coursePercent !== null && coursePercent !== null && coursePercent.length > 0) {
                  sum += coursePercent[0].percentage;
                }
                count += 1;
              }
              const avg = Math.floor((sum / (count * 100)) * 100);

              let existsModule;

              let completedModule;
              if (team_id) {
                completedModule = { module_id: module_id, complete_at: dateIST, percentage: avg, team_id: team_id };
                existsModule = await ModuleCompletionV2.query().where({
                  team_id: team_id,
                  module_id: module_id
                });
              } else {
                completedModule = { user_id: userId, module_id: module_id, complete_at: dateIST, percentage: avg };
                existsModule = await ModuleCompletionV2.query().where({
                  user_id: userId,
                  module_id: module_id
                });

              }
              if (existsModule !== null && existsModule !== undefined && existsModule.length > 0) {
                if (team_id) {
                  await ModuleCompletionV2.query().update(completedModule).where("team_id", team_id).andWhere("module_id", module_id);
                } else {
                  await ModuleCompletionV2.query().update(completedModule).where("user_id", userId).andWhere("module_id", module_id);
                }
              } else {
                await ModuleCompletionV2.query().insert(completedModule);
              }

              const modulePathwayDetails = await strapi.findOne(
                'modules',
                module_id,
                { populate: ['pathway'] }
              );

              const pathway_id = modulePathwayDetails&&modulePathwayDetails.data&&modulePathwayDetails.data.attributes&&modulePathwayDetails.data.attributes.pathway&&modulePathwayDetails.data.attributes.pathway.data.id

              let moduleSum = 0;
              let mduleCount = 0;

              if (pathway_id !== null && pathway_id !== undefined) {
                const pathwayDetails = await strapi.findOne(
                  'pathways',
                  pathway_id,
                  { populate: ['modules'] }
                );

                const pathwayModule = pathwayDetails&&pathwayDetails.data&&pathwayDetails.data.attributes&&pathwayDetails.data.attributes.modules.data

                if (pathwayModule !== null && pathwayModule !== undefined && pathwayModule.length > 0) {
                  for (const singleModule of pathwayModule) {
                    let modulePercent;
                    if (team_id) {
                      modulePercent = await ModuleCompletionV2.query().where({
                        team_id: team_id,
                        module_id: singleModule.id,
                      });
                    } else {
                      modulePercent = await ModuleCompletionV2.query().where({
                        user_id: userId,
                        module_id: singleModule.id,
                      });
                    }

                    if (modulePercent !== null && modulePercent !== null && modulePercent.length > 0) {
                      moduleSum += modulePercent[0].percentage;
                    }
                    mduleCount += 1;
                  }
                  const moduleAvg = Math.floor((moduleSum / (mduleCount * 100)) * 100);

                  let existspathway;

                  let completedPathway;
                  if (team_id) {
                    completedPathway = { pathway_id: pathway_id, complete_at: dateIST, percentage: moduleAvg, team_id: team_id };
                    existspathway = await PathwayCompletionV2.query().where({
                      team_id: team_id,
                      pathway_id: pathway_id
                    });
                  } else {
                    completedPathway = { user_id: userId, pathway_id: pathway_id, complete_at: dateIST, percentage: moduleAvg };
                    existspathway = await PathwayCompletionV2.query().where({
                      user_id: userId,
                      pathway_id: pathway_id
                    });
                  }

                  if (existspathway !== null && existspathway !== undefined && existspathway.length > 0) {
                    if (team_id) {
                      await PathwayCompletionV2.query().update(completedPathway).where("team_id", team_id).andWhere("pathway_id", pathway_id);
                    } else {
                      await PathwayCompletionV2.query().update(completedPathway).where("user_id", userId).andWhere("pathway_id", pathway_id);
                    }
                  } else {
                    await PathwayCompletionV2.query().insert(completedPathway);
                  }
                }
              }
            }
          }

        } else {
          const courseDetails = await strapi.findOne('courses', course_id, {
            populate: ['pathway']
          });

          let sum = 0;
          let count = 0;

          const pathway_id = courseDetails&&courseDetails.data&&courseDetails.data.attributes&&courseDetails.data.attributes.pathway&&courseDetails.data.attributes.pathway.data.id

          if (pathway_id !== null && pathway_id !== undefined) {
            const [err, pathway] = await pathwayServiceV2.findById(pathway_id, true);
            if (pathway !== null && pathway !== undefined) {

              for (const singleCourse of pathway.courses) {
                let coursePercent;
                if (team_id) {
                  coursePercent = await CourseCompletionV3.query().where({
                    team_id: team_id,
                    course_id: singleCourse.id,
                  });

                } else {
                  coursePercent = await CourseCompletionV3.query().where({
                    user_id: userId,
                    course_id: singleCourse.id,
                  });
                }

                if (coursePercent !== null && coursePercent !== null && coursePercent.length > 0) {
                  sum += coursePercent[0].percentage;
                }
                count += 1;
              }
              const avg = Math.floor((sum / (count * 100)) * 100);

              let existspathway;
              let completedPathway;
              if (team_id) {
                completedPathway = { pathway_id: pathway_id, complete_at: dateIST, percentage: avg, team_id: team_id };
                existspathway = await PathwayCompletionV2.query().where({
                  team_id: team_id,
                  pathway_id: pathway_id
                });
              } else {
                completedPathway = { user_id: userId, pathway_id: pathway_id, complete_at: dateIST, percentage: avg };
                existspathway = await PathwayCompletionV2.query().where({
                  user_id: userId,
                  pathway_id: pathway_id
                });
              }

              if (existspathway !== null && existspathway !== undefined && existspathway.length > 0) {
                if (team_id) {
                  await PathwayCompletionV2.query().update(completedPathway).where("team_id", team_id).andWhere("pathway_id", pathway_id);
                } else {
                  await PathwayCompletionV2.query().update(completedPathway).where("user_id", userId).andWhere("pathway_id", pathway_id);
                }
              } else {
                await PathwayCompletionV2.query().insert(completedPathway);
              }
            }
          }
        }
      }
    } catch (err) {
      console.log(err, "err")
      const errorObj = errorHandler(err);
      if (typeof errorObj === 'UniqueViolationError')
        errorObj.message = 'Exercise might have already been marked completed';
      return [errorObj, null];

    }

  }



  async markExerciseComplete(userId = null, exerciseId, team_id = null) {

    const { ExerciseCompletionV2 } = this.server.models();
    const { coursesServiceV2, progressTrackingService } = this.server.services();

    const dateIST = UTCToISTConverter(new Date());
    try {
      let completedExercise
      let existsExercise


      const { data } = await strapi.findOne('exercises', exerciseId, {
        populate: ['course']
      });

      const course_id = data&&data.attributes&&data.attributes.course&&data.attributes.course.data&&data.attributes.course.data.id;

      const [errInPathwayId, getPathwayId] = await coursesServiceV2.getPathwayIdByCourseId(
        course_id
      );

      const moduleCourseDetails = await strapi.findOne('courses', course_id, {
        populate: ['modules']
      });

      let modules_id = 0
      const modules = moduleCourseDetails&&moduleCourseDetails.data&&moduleCourseDetails.data.attributes&&moduleCourseDetails.data.attributes.modules
      if (modules !== null && modules !== undefined && modules.data.length > 0) {
        modules_id = moduleCourseDetails&&moduleCourseDetails.data&&moduleCourseDetails.data.attributes&&moduleCourseDetails.data.attributes.modules&&moduleCourseDetails.data.attributes.modules.data[0]&&moduleCourseDetails.data.attributes.modules.data[0].id
      }

      const jsonDetails = {}
      jsonDetails.user_id = userId ? userId : null;
      jsonDetails.team_id = team_id ? team_id : null;
      jsonDetails.module_id = modules_id;
      jsonDetails.course_id = course_id;
      jsonDetails.pathway_id = getPathwayId;
      jsonDetails.exercise_id = exerciseId;
      jsonDetails.assessment_id = null;
      jsonDetails.project_topic_id = null;
      jsonDetails.project_solution_id = null;  
      await progressTrackingService.insertPathwayOngoingTopic(jsonDetails);

      if (team_id) {
        completedExercise = { exercise_id: exerciseId, complete_at: dateIST, team_id: team_id };
        existsExercise = await ExerciseCompletionV2.query().where({
          team_id: team_id,
          exercise_id: exerciseId
        });
      } else {
        completedExercise = { exercise_id: exerciseId, complete_at: dateIST, user_id: userId };
        existsExercise = await ExerciseCompletionV2.query().where({
          user_id: userId,
          exercise_id: exerciseId
        });
      }

      if (existsExercise == null || existsExercise == undefined || existsExercise.length <= 0) {
        await ExerciseCompletionV2.query().insert(completedExercise);


        this.calculateCourseModulePathwayPercent(userId, course_id, team_id)
      }
      return [null, { success: true }];
    } catch (err) {
      console.log(err, "err")
      const errorObj = errorHandler(err);
      if (typeof errorObj === 'UniqueViolationError')
        errorObj.message = 'Exercise might have already been marked completed';
      return [errorObj, null];
    }
  }

  async getIdForRemoval(userId, exerciseId) {
    const { ExerciseCompletionV2 } = this.server.models();
    const exercise = await ExerciseCompletionV2.query().where({
      user_id: userId,
      exercise_id: exerciseId,
    });
    if (exercise.length > 0) {
      return exercise;
    }
    throw Boom.badRequest('Exercise might have already been marked incomplete');
  }

  async removeExerciseComplete(id, userId, exerciseId) {
    const { ExerciseCompletionV2 } = this.server.models();

    const exerciseCompletion = await ExerciseCompletionV2.fromJson({
      id,
      user_id: userId,
      exercise_id: exerciseId,
    });
    const success = await exerciseCompletion
      .$query()
      .context({ user_id: userId, exercise_id: exerciseId })
      .delete();
    if (success) return { success: true };
    throw Boom.badRequest('Exercise might have already been marked incomplete');
  }

  async getExerciseComplete(userId) {
    const { ExerciseCompletionV2 } = this.server.models();

    let completedExercise;
    try {
      completedExercise = await ExerciseCompletionV2.query()
        .throwIfNotFound()
        .where('user_id', userId);
      return [null, completedExercise];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async deleteExerciseById(id) {
    const {
      ExercisesV2,
      CoursesV2,
      Assessment,
      assessmentResult,
      PathwaysOngoingTopic,
      LearningTrackStatusOutcome,
    } = this.server.models();
    let deleted;
    try {
      const exerciseDetails = await ExercisesV2.query().findById(id);
      const assessmentDetails = await Assessment.query().where('exercise_id', id);
      const courseDetails = await CoursesV2.query().findById(exerciseDetails.course_id);
      const currentAssessmentFolderName = `assessment/${courseDetails.name}_${courseDetails.id}/${exerciseDetails.name}`;
      if (fs.existsSync(`${currentAssessmentFolderName}`)) {
        fs.removeSync(currentAssessmentFolderName);
      }
      // eslint-disable-next-line
      for (const data of assessmentDetails) {
        // eslint-disable-next-line
        await assessmentResult.query().delete().where('assessment_id', data.id);
        // eslint-disable-next-line
        await PathwaysOngoingTopic.query().delete().where('assessment_id', data.id);
        // eslint-disable-next-line
        await Assessment.query().delete().where('id', data.id);
      }
      await PathwaysOngoingTopic.query().delete().where('exercise_id', id);
      await LearningTrackStatusOutcome.query().delete().where('exercise_id', id);
      deleted = await ExercisesV2.query().delete().throwIfNotFound().where('id', id);
      let successfullyDeleted;
      if (deleted) {
        successfullyDeleted = { success: true };
      }
      const language = ['hi', 'en', 'te', 'mr', 'ta'];
      if (courseDetails !== undefined) {
        const courseFolderName = `curriculum_new/${courseDetails.name}_${courseDetails.id}`;
        const partPath = courseFolderName.split('curriculum_new/')[1];
        if (
          fs.existsSync(
            `${courseFolderName}/PARSED_CONTENT/MODIFIED_FILES/${partPath}_${exerciseDetails.name}_en.json`
          )
        ) {
          fs.unlinkSync(
            `${courseFolderName}/PARSED_CONTENT/MODIFIED_FILES/${partPath}_${exerciseDetails.name}_en.json`
          );
        }
        // eslint-disable-next-line
        for (const lang in language) {
          if (
            fs.existsSync(
              `${courseFolderName}/PARSED_CONTENT/PROPERTIES_FILES/${partPath}_${exerciseDetails.name}_${language[lang]}.json`
            )
          ) {
            fs.unlinkSync(
              `${courseFolderName}/PARSED_CONTENT/PROPERTIES_FILES/${partPath}_${exerciseDetails.name}_${language[lang]}.json`
            );
          }
        }
        if (fs.existsSync(`${courseFolderName}/${exerciseDetails.name}.json`)) {
          fs.unlinkSync(`${courseFolderName}/${exerciseDetails.name}.json`);
        }
      }
      return [null, successfullyDeleted];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async doTranslate(folderPath) {
    const hindiContent = globals.get('hi');
    const teContent = globals.get('te');
    const mrContent = globals.get('mr');
    const taContent = globals.get('ta');
    const language = { hi: hindiContent, te: teContent, mr: mrContent, ta: taContent };
    try {
      if (fs.existsSync(`${folderPath}_en.json`)) {
        const content = fs.readFileSync(`${folderPath}_en.json`);
        const parsedContent = JSON.parse(content.toString().trim());
        // eslint-disable-next-line
        for (const lang in language) {
          const keyPropMapping = {};
          // eslint-disable-next-line
          for (const jsonContent in parsedContent) {
            if (language[lang][0][parsedContent[jsonContent]] !== undefined) {
              keyPropMapping[jsonContent] = `${language[lang][0][parsedContent[jsonContent]]}`;
            } else {
              // eslint-disable-next-line
              const translatedData = await this.googleTranslate(parsedContent[jsonContent], lang);
              keyPropMapping[jsonContent] = translatedData;
            }
          }
          fs.writeFileSync(
            path.resolve(`${folderPath}_${lang}.json`),
            JSON.stringify(keyPropMapping, null, '\t')
          );
        }
      }
      return [null, 'courseName'];
    } catch (err) {
      logger.error(JSON.stringify(err));
      return [errorHandler(err), null];
    }
  }

  async getExerciseByExerciseId(id, lang = 'en') {
    let exercise = [];
    try {
      const { data } = await strapi.findOne('exercises', id);
      exercise.push({
        id: data.id,
        ...data.attributes,
        content: strapiToMerakiConverter(JSON.parse(data.attributes.content).blocks),
      })
      return [null, exercise];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async insertLearningTrackData() {
    const { LearningTrackStatusOutcome } = this.server.models();
    try {
      const lrningTrkData = await LearningTrackStatusOutcome.query().select('user_id', 'exercise_id');
      // eslint-disable-next-line no-plusplus
      for (let ind = 0; ind < lrningTrkData.length; ind++) {
        // eslint-disable-next-line no-await-in-loop, no-unused-vars
        const insrt = await this.markExerciseComplete(
          lrningTrkData[ind].user_id,
          lrningTrkData[ind].exercise_id
        );
      }
      return [null, lrningTrkData];
    } catch (error) {
      return [errorHandler(error), null];
    }
  }
};
