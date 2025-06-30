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
const axios = require('axios');
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

          coursePercentage = coursePer;
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
          completedCourse = { course_id, complete_at: dateIST, percentage: coursePercentage, team_id };
          existsCourse = await CourseCompletionV3.query().where(
            "team_id", team_id).andWhere(
              "course_id", course_id
            );
        } else {
          completedCourse = { user_id: userId, course_id, complete_at: dateIST, percentage: coursePercentage };
          existsCourse = await CourseCompletionV3.query().where(
            "user_id", userId).andWhere(
              "course_id", course_id
            );
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
        const modules = moduleCourseDetails && moduleCourseDetails.data && moduleCourseDetails.data.attributes && moduleCourseDetails.data.attributes.modules

        if (modules !== null && modules !== undefined && modules && modules.data && modules.data.length > 0) {
          const module_id = moduleCourseDetails && moduleCourseDetails.data && moduleCourseDetails.data.attributes && moduleCourseDetails.data.attributes.modules && moduleCourseDetails.data.attributes.modules.data[0] && moduleCourseDetails.data.attributes.modules.data[0].id
          if (module_id !== null && module_id !== undefined) {

            let sum = 0;
            let count = 0;

            const moduleDetails = await strapi.findOne(
              'modules',
              module_id,
              { populate: ['courses'] }
            );
            const moduleCoursePercentDetails = moduleDetails && moduleDetails.data && moduleDetails.data.attributes && moduleDetails.data.attributes.courses && moduleDetails.data.attributes.courses.data

            if (moduleCoursePercentDetails !== null && moduleCoursePercentDetails !== undefined) {

              for (const singleCourse of moduleCoursePercentDetails) {
                let coursePercent;
                if (team_id) {
                  coursePercent = await CourseCompletionV3.query().where(
                    "team_id", team_id).andWhere(
                      "course_id", singleCourse.id
                    );

                } else {
                  coursePercent = await CourseCompletionV3.query().where(
                    "user_id", userId).andWhere(
                      "course_id", singleCourse.id
                    );

                }

                if (coursePercent !== null && coursePercent !== null && coursePercent.length > 0) {
                  sum += coursePercent[0].percentage;
                }
                count += 1;
              }
              const avg = Math.floor(sum / count);

              let existsModule;

              let completedModule;
              if (team_id) {
                completedModule = { module_id, complete_at: dateIST, percentage: avg, team_id };
                existsModule = await ModuleCompletionV2.query().where(
                  "team_id", team_id).andWhere(
                    "module_id", module_id
                  );
              } else {
                completedModule = { user_id: userId, module_id, complete_at: dateIST, percentage: avg };
                existsModule = await ModuleCompletionV2.query().where(
                  "user_id", userId).andWhere(
                    "module_id", module_id
                  );
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
              const pathway_id = modulePathwayDetails && modulePathwayDetails.data && modulePathwayDetails.data.attributes && modulePathwayDetails.data.attributes.pathway && modulePathwayDetails.data.attributes.pathway.data.id

              let moduleSum = 0;
              let mduleCount = 0;

              if (pathway_id !== null && pathway_id !== undefined) {
                const pathwayDetails = await strapi.findOne(
                  'pathways',
                  pathway_id,
                  { populate: ['modules'] }
                );
                const pathwayModule = pathwayDetails && pathwayDetails.data && pathwayDetails.data.attributes && pathwayDetails.data.attributes.modules.data

                if (pathwayModule !== null && pathwayModule !== undefined && pathwayModule.length > 0) {
                  for (const singleModule of pathwayModule) {
                    let modulePercent;
                    if (team_id) {
                      modulePercent = await ModuleCompletionV2.query().where(
                        "team_id", team_id).andWhere(
                          "module_id", singleModule.id,
                        );
                    } else {
                      modulePercent = await ModuleCompletionV2.query().where(
                        "user_id", userId).andWhere(
                          "module_id", singleModule.id
                        );
                    }
                    if (modulePercent !== null && modulePercent !== null && modulePercent.length > 0) {
                      moduleSum += modulePercent[0].percentage;
                    }
                    mduleCount += 1;
                  }
                  const moduleAvg = Math.floor(moduleSum / mduleCount);
                  let existspathway;

                  let completedPathway;
                  if (team_id) {
                    completedPathway = { pathway_id, complete_at: dateIST, percentage: moduleAvg, team_id };
                    existspathway = await PathwayCompletionV2.query().where(
                      "team_id", team_id).andWhere(
                        "pathway_id", pathway_id
                      );
                  } else {
                    completedPathway = { user_id: userId, pathway_id, complete_at: dateIST, percentage: moduleAvg };
                    existspathway = await PathwayCompletionV2.query().where(
                      "user_id", userId).andWhere(
                        "pathway_id", pathway_id
                      );
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
          const isPathway = courseDetails && courseDetails.data && courseDetails.data.attributes && courseDetails.data.attributes.pathway && courseDetails.data.attributes.pathway.data
          if (!isPathway) {
            return
          }
          const pathway_id = courseDetails && courseDetails.data && courseDetails.data.attributes && courseDetails.data.attributes.pathway && courseDetails.data.attributes.pathway.data.id

          if (pathway_id !== null && pathway_id !== undefined) {
            const [err, pathway] = await pathwayServiceV2.findById(pathway_id, true);
            if (pathway !== null && pathway !== undefined) {

              for (const singleCourse of pathway.courses) {
                let coursePercent;
                if (team_id) {
                  coursePercent = await CourseCompletionV3.query().where(
                    "team_id", team_id).andWhere(
                      "course_id", singleCourse.id
                    );

                } else {
                  coursePercent = await CourseCompletionV3.query().where(
                    "user_id", userId).andWhere(
                      "course_id", singleCourse.id
                    );
                }

                if (coursePercent !== null && coursePercent !== null && coursePercent.length > 0) {
                  sum += coursePercent[0].percentage;
                }
                count += 1;
              }
              const avg = Math.floor(sum / count);

              let existspathway;
              let completedPathway;
              if (team_id) {
                completedPathway = { pathway_id, complete_at: dateIST, percentage: avg, team_id };
                existspathway = await PathwayCompletionV2.query().where(
                  "team_id", team_id).andWhere(
                    "pathway_id", pathway_id
                  );
              } else {
                completedPathway = { user_id: userId, pathway_id, complete_at: dateIST, percentage: avg };
                existspathway = await PathwayCompletionV2.query().where(
                  "user_id", userId).andWhere(
                    "pathway_id", pathway_id
                  );
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
      const errorObj = errorHandler(err);
      if (typeof errorObj === 'UniqueViolationError')
        errorObj.message = 'Exercise might have already been marked completed';
      return [errorObj, null];

    }

  }

  async courseModulePathwayPercentCalculator(userId = null, course_id, team_id = null, module_id = null, pathway_id = null) {
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
          ] = await progressTrackingService.getC4caProgressInPercent(
            team_id,
            course_id
          );
          coursePercentage = coursePer;
        } else {
          const [errInPercentage, coursePer] = await progressTrackingService.getProgressInPercent(
            userId,
            course_id
          );
          coursePercentage = coursePer
        }
        let existsCourse;
        let completedCourse;
        if (team_id) {
          completedCourse = { course_id, complete_at: dateIST, percentage: coursePercentage, team_id };
          existsCourse = await CourseCompletionV3.query().where(
            "team_id", team_id).andWhere(
              "course_id", course_id
            );
        } else {
          completedCourse = { user_id: userId, course_id, complete_at: dateIST, percentage: coursePercentage };
          existsCourse = await CourseCompletionV3.query().where(
            "user_id", userId).andWhere(
              "course_id", course_id
            );
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

        if (module_id) {
          let sum = 0;
          let count = 0;

          const moduleDetails = await strapi.findOne(
            'modules',
            module_id,
            { populate: ['courses'] }
          );
          const moduleCoursePercentDetails = moduleDetails && moduleDetails.data && moduleDetails.data.attributes && moduleDetails.data.attributes.courses && moduleDetails.data.attributes.courses.data

          if (moduleCoursePercentDetails !== null && moduleCoursePercentDetails !== undefined) {
            // eslint-disable-next-line no-restricted-syntax
            for (const singleCourse of moduleCoursePercentDetails) {
              let coursePercent;
              if (team_id) {
                // eslint-disable-next-line no-await-in-loop
                coursePercent = await CourseCompletionV3.query().where(
                  "team_id", team_id).andWhere(
                    "course_id", singleCourse.id
                  );

              } else {
                // eslint-disable-next-line no-await-in-loop
                coursePercent = await CourseCompletionV3.query().where(
                  "user_id", userId).andWhere(
                    "course_id", singleCourse.id
                  );

              }

              if (coursePercent !== null && coursePercent !== null && coursePercent.length > 0) {
                sum += coursePercent[0].percentage;
              }
              count += 1;
            }
            const avg = Math.floor(sum / count);

            let existsModule;

            let completedModule;
            if (team_id) {
              completedModule = { module_id, complete_at: dateIST, percentage: avg, team_id };
              existsModule = await ModuleCompletionV2.query().where(
                "team_id", team_id).andWhere(
                  "module_id", module_id
                );
            } else {
              completedModule = { user_id: userId, module_id, complete_at: dateIST, percentage: avg };
              existsModule = await ModuleCompletionV2.query().where(
                "user_id", userId).andWhere(
                  "module_id", module_id
                );
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
            let moduleSum = 0;
            let mduleCount = 0;

            if (pathway_id !== null && pathway_id !== undefined) {
              const pathwayDetails = await strapi.findOne(
                'pathways',
                pathway_id,
                { populate: ['modules'] }
              );
              const pathwayModule = pathwayDetails && pathwayDetails.data && pathwayDetails.data.attributes && pathwayDetails.data.attributes.modules.data

              if (pathwayModule !== null && pathwayModule !== undefined && pathwayModule.length > 0) {
                // eslint-disable-next-line no-restricted-syntax
                for (const singleModule of pathwayModule) {
                  let modulePercent;
                  if (team_id) {
                    // eslint-disable-next-line no-await-in-loop
                    modulePercent = await ModuleCompletionV2.query().where(
                      "team_id", team_id).andWhere(
                        "module_id", singleModule.id,
                      );
                  } else {
                    // eslint-disable-next-line no-await-in-loop
                    modulePercent = await ModuleCompletionV2.query().where(
                      "user_id", userId).andWhere(
                        "module_id", singleModule.id
                      );
                  }
                  if (modulePercent !== null && modulePercent !== null && modulePercent.length > 0) {
                    moduleSum += modulePercent[0].percentage;
                  }
                  mduleCount += 1;
                }
                const moduleAvg = Math.floor(moduleSum / mduleCount);
                let existspathway;

                let completedPathway;
                if (team_id) {
                  completedPathway = { team_id, pathway_id, complete_at: dateIST, percentage: moduleAvg };
                  existspathway = await PathwayCompletionV2.query().where(
                    "team_id", team_id).andWhere(
                      "pathway_id", pathway_id
                    );
                    if (!existspathway){
                    completedPathway.team_id = team_id
                  }
                }
                else {
                  completedPathway = { user_id: userId, pathway_id, complete_at: dateIST, percentage: moduleAvg };
                  existspathway = await PathwayCompletionV2.query().where(
                    "user_id", userId).andWhere(
                      "pathway_id", pathway_id
                    );
                  if (!existspathway) {
                    completedPathway.user_id = userId
                  }
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

        else {
          let sum = 0;
          let count = 0;
          if (pathway_id !== null && pathway_id !== undefined) {
            const data = await strapi.findOne('pathways', pathway_id, {
              populate: ['courses']
            });
            const pathwayCourses = data.data.attributes.courses.data
            if (pathwayCourses !== null && pathwayCourses !== undefined) {

              // eslint-disable-next-line no-restricted-syntax
              for (const singleCourse of pathwayCourses) {
                let coursePercent;
                if (team_id) {
                  // eslint-disable-next-line no-await-in-loop
                  coursePercent = await CourseCompletionV3.query().where(
                    "team_id", team_id).andWhere(
                      "course_id", singleCourse.id
                    );

                } else {
                  // eslint-disable-next-line no-await-in-loop
                  coursePercent = await CourseCompletionV3.query().where(
                    "user_id", userId).andWhere(
                      "course_id", singleCourse.id
                    );
                }
                if (coursePercent !== null && coursePercent !== null && coursePercent.length > 0) {
                  sum += coursePercent[0].percentage;
                }
                count += 1;
              }
              const avg = Math.floor(sum / count);

              let existspathway;
              let completedPathway;
              if (team_id) {
                completedPathway = { team_id, pathway_id, complete_at: dateIST, percentage: avg };
                existspathway = await PathwayCompletionV2.query().where(
                  "team_id", team_id).andWhere(
                    "pathway_id", pathway_id
                  );
              } else {
                completedPathway = { user_id: userId, pathway_id, complete_at: dateIST, percentage: avg };
                existspathway = await PathwayCompletionV2.query().where(
                  "user_id", userId).andWhere(
                    "pathway_id", pathway_id
                  );
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

      return [null, 'success'];

    } catch (err) {
      const errorObj = errorHandler(err);
      if (typeof errorObj === 'UniqueViolationError')
        errorObj.message = 'Exercise might have already been marked completed';
      return [errorObj, null];

    }

  }


  // eslint-disable-next-line consistent-return
  async calculateModulePercentageByModuleId(userId = null, module_id, team_id = null, percentage) {
    const { CourseCompletionV3, PathwayCompletionV2, ModuleCompletionV2 } = this.server.models();
    const { progressTrackingService, pathwayServiceV2 } = this.server.services();

    const dateIST = UTCToISTConverter(new Date());

    try {

      if (module_id !== null && module_id !== undefined) {

        let existsModule;

        let completedModule;
        if (team_id) {
          completedModule = { module_id, complete_at: dateIST, percentage, team_id };
          existsModule = await ModuleCompletionV2.query().where(
            "team_id", team_id).andWhere(
              "module_id", module_id
            );
        } else {
          completedModule = { user_id: userId, module_id, complete_at: dateIST, percentage };
          existsModule = await ModuleCompletionV2.query().where(
            "user_id", userId).andWhere(
              "module_id", module_id
            );
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

        const pathway_id = modulePathwayDetails && modulePathwayDetails.data && modulePathwayDetails.data.attributes && modulePathwayDetails.data.attributes.pathway && modulePathwayDetails.data.attributes.pathway.data.id

        let moduleSum = 0;
        let mduleCount = 0;

        if (pathway_id !== null && pathway_id !== undefined) {
          const pathwayDetails = await strapi.findOne(
            'pathways',
            pathway_id,
            { populate: ['modules'] }
          );

          const pathwayModule = pathwayDetails && pathwayDetails.data && pathwayDetails.data.attributes && pathwayDetails.data.attributes.modules.data

          if (pathwayModule !== null && pathwayModule !== undefined && pathwayModule.length > 0) {
            for (const singleModule of pathwayModule) {
              let modulePercent;
              if (team_id) {
                modulePercent = await ModuleCompletionV2.query().where(
                  "team_id", team_id).andWhere(
                    "module_id", singleModule.id
                  );
              } else {
                modulePercent = await ModuleCompletionV2.query().where(
                  "user_id", userId).andWhere(
                    "module_id", singleModule.id
                  );
              }

              if (modulePercent !== null && modulePercent !== null && modulePercent.length > 0) {
                moduleSum += modulePercent[0].percentage;
              }
              mduleCount += 1;
            }
            const moduleAvg = Math.floor(moduleSum / mduleCount);

            let existspathway;

            let completedPathway;
            if (team_id) {
              completedPathway = { pathway_id, complete_at: dateIST, percentage: moduleAvg, team_id };
              existspathway = await PathwayCompletionV2.query().where(
                "team_id", team_id).andWhere(
                  "pathway_id", pathway_id
                );
            } else {
              completedPathway = { user_id: userId, pathway_id, complete_at: dateIST, percentage: moduleAvg };
              existspathway = await PathwayCompletionV2.query().where(
                "user_id", userId).andWhere(
                  "pathway_id", pathway_id
                );
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
    } catch (err) {
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

      const course_id = data && data.attributes && data.attributes.course && data.attributes.course.data && data.attributes.course.data.id;
      const [errInPathwayId, getPathwayId] = await coursesServiceV2.getPathwayIdByCourseId(
        course_id
      );

      const moduleCourseDetails = await strapi.findOne('courses', course_id, {
        populate: ['modules']
      });

      let modules_id = null
      const modules = moduleCourseDetails && moduleCourseDetails.data && moduleCourseDetails.data.attributes && moduleCourseDetails.data.attributes.modules
      if (modules && modules.data && modules.data.length > 0) {
        modules_id = modules.data[0].id;
      } else {
        modules_id = null; // Or throw new Error('Modules not available');
      }

      // if (modules !== null && modules !== undefined && modules.data.length > 0) {
      //   modules_id = moduleCourseDetails && moduleCourseDetails.data && moduleCourseDetails.data.attributes && moduleCourseDetails.data.attributes.modules && moduleCourseDetails.data.attributes.modules.data[0] && moduleCourseDetails.data.attributes.modules.data[0].id
      // }

      const jsonDetails = {}
      jsonDetails.user_id = userId || null;
      jsonDetails.team_id = team_id || null;
      jsonDetails.module_id = modules_id;
      jsonDetails.course_id = course_id;
      jsonDetails.pathway_id = getPathwayId;
      jsonDetails.exercise_id = exerciseId;
      jsonDetails.assessment_id = null;
      jsonDetails.project_topic_id = null;
      jsonDetails.project_solution_id = null;
      await progressTrackingService.insertPathwayOngoingTopic(jsonDetails);

      if (team_id) {
        completedExercise = { exercise_id: exerciseId, complete_at: dateIST, team_id };
        existsExercise = await ExerciseCompletionV2.query().where(
          "team_id", team_id).andWhere(
            "exercise_id", exerciseId
          );
      } else {
        completedExercise = { exercise_id: exerciseId, complete_at: dateIST, user_id: userId };
        existsExercise = await ExerciseCompletionV2.query().where(
          "user_id", userId).andWhere(
            "exercise_id", exerciseId
          );
      }

      if (existsExercise == null || existsExercise == undefined || existsExercise.length <= 0) {
        await ExerciseCompletionV2.query().insert(completedExercise);


        await this.calculateCourseModulePathwayPercent(userId, course_id, team_id)
      }
      return [null, { success: true }];
    } catch (err) {
      const errorObj = errorHandler(err);
      if (typeof errorObj === 'UniqueViolationError')
        errorObj.message = 'Exercise might have already been marked completed';
      return [errorObj, null];
    }
  }

  async exerciseComplete(user_id = null, slug_id, type = 'exercise', lang = 'en', team_id = null) {

    const { exercisessHistory } = this.server.models();
    const { progressTrackingService } = this.server.services();
    try {
      const url = `${process.env.STRAPI_URL}/slugs/${slug_id}?populate[course][populate][modules][populate]=pathway`
      const { data } = await axios.get(url)

      const ifExercise = data && data.data && data.data.attributes && data.data.attributes.type
      if (ifExercise !== 'exercise') {
        return [null, { success: 'invalid slug id for exercise' }];
      }

      const course = data && data.data && data.data.attributes && data.data.attributes.course.data
      const module = course ? course && course.attributes && course.attributes.modules && course.attributes.modules.data : null
      let pathway_id = module ? module && module.attributes && module.attributes.pathway && module.attributes.pathway.data.id : null
      if (!module) {
        const pathwayData = await strapi.findOne(
          'courses',
          course.id,
          { populate: ['pathway'] }
        );
        pathway_id = pathwayData.data.attributes.pathway.data.id;
      }
      const completedExercise = team_id
        ? { slug_id, lang, course_id: course.id, team_id }
        : { slug_id, lang, course_id: course.id, user_id };
      const existsExercise = await (team_id
        ? exercisessHistory.query().where("team_id", team_id).andWhere("slug_id", slug_id).first()
        : exercisessHistory.query().where("user_id", user_id).andWhere("slug_id", slug_id).first());

      if (existsExercise) {
        return [null, { success: 'already completed' }];
      }
      await exercisessHistory.query().insert(completedExercise);

      const jsonDetails = {}
      jsonDetails.user_id = user_id ? +user_id : null;
      jsonDetails.team_id = team_id ? +team_id : null;
      jsonDetails.course_id = course.id;
      jsonDetails.pathway_id = pathway_id || null;
      jsonDetails.slug_id = slug_id;
      jsonDetails.type = type;
      jsonDetails.module_id = module ? module.id : null;
      jsonDetails.project_topic_id = null;
      jsonDetails.project_solution_id = null;
      await progressTrackingService.insertOngoingTopic(jsonDetails);

      await this.courseModulePathwayPercentCalculator(user_id, jsonDetails.course_id, team_id, jsonDetails.module_id, jsonDetails.pathway_id)
      // await this.calculateCourseModulePathwayPercent(user_id, course.id, module_id, pathway.id, team_id)

      return [null, { success: true }];
    } catch (err) {
      // console.log(err, "err--->")
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

  async getExerciseByExerciseId(id, lang = 'en') {
    let exercise = [];
    try {
      const { data } = await strapi.findOne('exercises', id);
      exercise.push({
        id: data.id,
        ...data.attributes,
        content: strapiToMerakiConverter(data.attributes.content),
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

  async getSlugsExercises(id, lang) {
    try {
      const slugsExercises = await strapi.findOne('slugs', id, {
        populate: ['exercises']
      });

      const exercisedata = slugsExercises && slugsExercises.data && slugsExercises.data.attributes && slugsExercises.data.attributes.exercises;
      let requiredLangData = [];

      if (exercisedata && exercisedata.data) {
        exercisedata.data.forEach((exercise) => {
          if (exercise.attributes.locale === lang) {
            const exerciseWithSlugId = {
              slug_id: id,
              ...exercise,
            };
            requiredLangData.push(exerciseWithSlugId);
          }
        });
      }
      return requiredLangData;
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }

};
