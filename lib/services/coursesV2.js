const Schmervice = require('schmervice');
const Boom = require('@hapi/boom');
const { transaction, val } = require('objection');
const _ = require('lodash');
const fs = require('fs-extra');
const glob = require('glob');
const globals = require('node-global-storage');
const path = require('path');
const { errorHandler } = require('../errorHandling');
const logger = require('../../server/logger');

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

module.exports = class CoursesServiceV2 extends Schmervice.Service {
  async getAllCourses(txn = null) {
    const { CoursesV2 } = this.server.models();
    let availableCourses;
    try {
      availableCourses = await CoursesV2.query(txn);
      return [null, availableCourses];
    } catch (err) {
      return [errorHandler(err), availableCourses];
    }
  }

  async getCourseById(courseId) {
    const { CoursesV2 } = this.server.models();
    let courses;
    try {
      courses = await CoursesV2.query().findById(courseId);
      return [null, courses];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getCourseByName(courseName) {
    const { CoursesV2 } = this.server.models();
    let courses;
    try {
      courses = await CoursesV2.query().where('name', courseName);
      return [null, courses];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  // eslint-disable-next-line
  async getCourseExercise(course_id, lang = 'en', txn) {
    const { CoursesV2 } = this.server.models();
    let courseExercises;
    try {
      courseExercises = await CoursesV2.query()
        .where('courses_v2.id', course_id)
        .throwIfNotFound()
        .withGraphJoined('exercisesV2')
        .modify((builder) => {
          builder.orderBy('exercisesV2.sequence_num');
        });
      _.map(courseExercises[0].exercisesV2, (exercise) => {
        const baseDir = `curriculum_new/${courseExercises[0].name}_${courseExercises[0].id}/PARSED_CONTENT`;
        const courseNameForModifiedFile = `${courseExercises[0].name}_${courseExercises[0].id}_${exercise.name}.json`;
        const courseName = `${courseExercises[0].name}_${courseExercises[0].id}_${exercise.name}_${lang}.json`;
        const modifiedFile = `${baseDir}/MODIFIED_FILES/${courseNameForModifiedFile}`;
        const propertiesFile = `${baseDir}/PROPERTIES_FILES/${courseName}`;
        if (fs.existsSync(modifiedFile) && fs.existsSync(propertiesFile)) {
          const modifiedDataInString = JSON.parse(fs.readFileSync(modifiedFile));
          const propertiesDataInString = JSON.parse(fs.readFileSync(propertiesFile));
          _.map(modifiedDataInString, (modifiedCont) => {
            if (modifiedCont.component === 'image') {
              // eslint-disable-next-line
              if (propertiesDataInString.hasOwnProperty(modifiedCont.alt)) {
                modifiedCont.alt = propertiesDataInString[modifiedCont.alt];
              }
            } else if (modifiedCont.component === 'table') {
              _.map(modifiedCont.value, (tableDetails) => {
                // eslint-disable-next-line
                if (propertiesDataInString.hasOwnProperty(tableDetails.header)) {
                  tableDetails.header = propertiesDataInString[tableDetails.header];
                }
                // eslint-disable-next-line
                for (const item in tableDetails.items) {
                  // eslint-disable-next-line
                  if (propertiesDataInString.hasOwnProperty(tableDetails.items[item])) {
                    tableDetails.items[item] = propertiesDataInString[tableDetails.items[item]];
                  }
                }
              });
            } else if (modifiedCont.component === 'banner') {
              modifiedCont.actions[0].variant = 'primary';
            } else {
              // eslint-disable-next-line
              if (propertiesDataInString.hasOwnProperty(modifiedCont.value)) {
                modifiedCont.value = propertiesDataInString[modifiedCont.value]
                  .split(
                    '<span style="color: #eb9371; background-color: rgba(39, 41, 43, 0.83); box-shadow: 2px 2px 2px rgba(22, 9, 1, 0.6); border-radius: 2px; padding: 2px">'
                  )
                  .join(
                    '<span style="background-color: rgba(233, 245, 233, 0.83); border-radius: 2px; padding: 2px">'
                  );
              }
            }
          });
          exercise.content = modifiedDataInString;
        } else {
          const parseContent = JSON.parse(JSON.parse(exercise.content));
          exercise.content = parseContent.value;
        }
      });
      return [null, courseExercises];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getRecommendedCourses() {
    const { CoursesV2 } = this.server.models();
    // #REVIEW
    const typingGuru = await CoursesV2.query().where(`name`, `LIKE`, `Typing-Guru`);
    let randomCourses;
    try {
      randomCourses = await CoursesV2.query()
        .whereRaw(`name NOT LIKE ?`, `%(Typing-Guru)`)
        .orderByRaw(`random()`)
        .limit(2);
      const courses = [...randomCourses, ...typingGuru];
      return [null, courses];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async deleteCourseById(courseId) {
    const { CoursesV2, CourseCompletionV2, ExercisesV2 } = this.server.models();
    try {
      const availableCourses = await CoursesV2.query().findById(courseId);
      const deleteCourse = await transaction(
        CourseCompletionV2,
        ExercisesV2,
        CoursesV2,
        async (CourseCompletionV2Model, ExerciseModel, CourseModel) => {
          try {
            if (availableCourses !== undefined) {
              const currentFolderName = `curriculum_new/${availableCourses.name}_${courseId}`;
              if (fs.existsSync(`${currentFolderName}`)) {
                fs.removeSync(currentFolderName);
              }
            }
            await CourseCompletionV2Model.query().delete().where('course_id', courseId);
            await ExerciseModel.query().delete().where('course_id', courseId);
            await CourseModel.query().throwIfNotFound().deleteById(courseId);
            return { success: true };
          } catch (err) {
            return errorHandler(err);
          }
        }
      );
      return [null, deleteCourse];
    } catch (err) {
      return [err, null];
    }
  }

  async findByCourseName(name) {
    const { CoursesV2 } = this.server.models();
    let course;
    try {
      course = await CoursesV2.query().skipUndefined().andWhere('name', name);
      return [null, course];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async createNewCourse(details, txn) {
    const { CoursesV2 } = this.server.models();
    if (details.lang_available) {
      details.lang_available = val(details.lang_available).asArray().castTo('text[]');
    }
    const createCourse = await CoursesV2.query(txn).insert(details);
    const courseFolderName = `${details.name}_${createCourse.id}`;
    if (!fs.existsSync(`curriculum_new/${courseFolderName}`)) {
      fs.mkdirSync(`curriculum_new/${courseFolderName}`);
    }
    return createCourse;
  }

  async updateCourse(courseId, courseDetails) {
    const { CoursesV2 } = this.server.models();
    if (courseDetails.lang_available) {
      courseDetails.lang_available = val(courseDetails.lang_available).asArray().castTo('text[]');
    }
    try {
      if (courseDetails.name !== undefined) {
        const availableCourses = await CoursesV2.query().findById(courseId);
        if (availableCourses !== undefined) {
          const currentFolderName = `${availableCourses.name}_${courseId}`;
          const newFolderName = `${courseDetails.name}_${courseId}`;
          if (fs.existsSync(`curriculum_new/${currentFolderName}/PARSED_CONTENT/MODIFIED_FILES`)) {
            const files = fs.readdirSync(
              `curriculum_new/${currentFolderName}/PARSED_CONTENT/MODIFIED_FILES`
            );
            _.map(files, (file) => {
              const newFileName = file.replace(currentFolderName, newFolderName);
              fs.renameSync(
                `curriculum_new/${currentFolderName}/PARSED_CONTENT/MODIFIED_FILES/${file}`,
                `curriculum_new/${currentFolderName}/PARSED_CONTENT/MODIFIED_FILES/${newFileName}`
              );
            });
          }
          if (
            fs.existsSync(`curriculum_new/${currentFolderName}/PARSED_CONTENT/PROPERTIES_FILES`)
          ) {
            const files = fs.readdirSync(
              `curriculum_new/${currentFolderName}/PARSED_CONTENT/PROPERTIES_FILES`
            );
            _.map(files, (file) => {
              const newFileName = file.replace(currentFolderName, newFolderName);
              fs.renameSync(
                `curriculum_new/${currentFolderName}/PARSED_CONTENT/PROPERTIES_FILES/${file}`,
                `curriculum_new/${currentFolderName}/PARSED_CONTENT/PROPERTIES_FILES/${newFileName}`
              );
            });
          }
          if (fs.existsSync(`curriculum_new/${currentFolderName}`)) {
            fs.renameSync(`curriculum_new/${currentFolderName}`, `curriculum_new/${newFolderName}`);
          }
        }
      }
      const course = await CoursesV2.query().patch(courseDetails).where('id', courseId);
      return [null, course];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async markCourseComplete(userId, courseId) {
    const { CourseCompletionV2 } = this.server.models();
    const completedCourse = { user_id: userId, course_id: courseId };
    try {
      await CourseCompletionV2.query()
        .context({ user_id: userId, course_id: courseId })
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
    const { CourseCompletionV2 } = this.server.models();
    const course = await CourseCompletionV2.query().where({
      user_id: userId,
      course_id: courseId,
    });
    if (course.length > 0) {
      return course;
    }
    throw Boom.badRequest('Course might have already been marked incomplete');
  }

  async removeCourseComplete(id, userId, courseId) {
    const { CourseCompletionV2 } = this.server.models();
    const courseCompletion = await CourseCompletionV2.fromJson({
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
    const { CourseCompletionV2 } = this.server.models();
    let completedCourse;
    try {
      completedCourse = await CourseCompletionV2.query().throwIfNotFound().where('user_id', userId);
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

  async createSingleCourses(course, courseV2) {
    const { Exercises } = this.server.models();
    const { exercisesServiceV2 } = this.server.services();
    const courseFolderName = `${course.name}_${courseV2.id}`;
    if (fs.existsSync(`curriculum_new/${courseFolderName}`)) {
      fs.removeSync(`curriculum_new/${courseFolderName}`);
    }
    if (!fs.existsSync(`curriculum_new/${courseFolderName}`)) {
      fs.mkdirSync(`curriculum_new/${courseFolderName}`);
    }
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
          exerciseData.course_id = courseV2.id;
          exerciseData.content = JSON.stringify(JSON.parse(dataInString.toString().trim()));
          exerciseData.sequence_num = singleExercise.sequence_num;
          exerciseData.type = 'exercise';
          // eslint-disable-next-line
          await exercisesServiceV2.addExercises(exerciseData);
        }
      }
    }
    return courseExercises;
  }

  async getPathwayIdByCourseId(id) {
    const { PathwayCoursesV2 } = this.server.models();
    let pathwayId;
    try {
      pathwayId = await PathwayCoursesV2.query().select('pathway_id').where('course_id', id);
      return [null, pathwayId[0].pathway_id];
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

  // copy all images from curriculum to curriculum_new
  async copyAssetsToV2(course, CourseDetails) {
    const { Exercises, ExercisesV2 } = this.server.models();
    try {
      const courseExercises = await Exercises.query()
        .where('course_id', course.id)
        .orderBy('sequence_num');
      if (courseExercises.length > 0) {
        // eslint-disable-next-line
        for (const singleExercise of courseExercises) {
          let file = singleExercise.slug.replace(/__/g, '/').split('/').slice(1, 3);
          if (file[1] && file[1].indexOf('_json' || '-json')) {
            // eslint-disable-next-line prettier/prettier
            file = singleExercise.slug
              .replace(/__/g, '/')
              .split('/')
              .slice(1, 3)
              .join('/')
              .replace(/_|-([^_|-]*)$/, '.$1');
          } else if (file[0].indexOf('_json' || '-json')) {
            // eslint-disable-next-line prettier/prettier
            file = singleExercise.slug
              .replace(/__/g, '/')
              .split('/')
              .slice(1, 3)
              .join('/')
              .replace(/_|-([^_|-]*)$/, '$&.json');
          }
          const courseName = singleExercise.slug.replace(/__/g, '/').split('/')[0];
          const filePath = `${courseName}/${file}`;
          const newName = filePath.split('/');
          const courseFolder = fs.readdirSync(path.resolve(`curriculum/${courseName}`));
          const modifiedFilePathNew = `curriculum_new/${CourseDetails.name}_${CourseDetails.id}`;
          // for direct assets or images inside course folder
          if (fs.existsSync(modifiedFilePathNew)) {
            if (courseFolder.indexOf('images') > -1) {
              fs.copySync(`curriculum/${courseName}/images`, `${modifiedFilePathNew}/images`);
            } else if (courseName.indexOf('assets') > -1) {
              fs.copySync(`curriculum/${courseName}/assets`, `${modifiedFilePathNew}/assets`);
            }
          }
          // for assets inside sub-directories of course folder
          if (newName.length > 2) {
            const subDir = newName[1];
            if (subDir.indexOf('.') > -1) return [null, null];
            const fileData = fs.readdirSync(path.resolve(`curriculum/${courseName}/${subDir}`));
            if (fileData.indexOf('assets') > -1) {
              fs.copySync(
                `curriculum/${courseName}/${subDir}/assets`,
                `${modifiedFilePathNew}/assets`
              );
            }
          }
        }
        //
        const [err, newExercise] = await ExercisesV2.addExercises(courseExercises);
        if (err) {
          return [errorHandler(err), null];
        }
        return [null, newExercise];
      }
      return [null, 'copy success'];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  // fixing the image url of courses
  async fixImageUrl(courseV2) {
    const { exercisesServiceV2 } = this.server.services();
    const { ExercisesV2 } = this.server.models();
    const exerciseData = await ExercisesV2.query().where('course_id', courseV2.id);
    const courseFolderName = `curriculum_new/${courseV2.name}_${courseV2.id}`;
    // eslint-disable-next-line no-restricted-syntax
    for (const exercise of exerciseData) {
      const exercisePath = `${courseFolderName}/${exercise.name}.json`;
      if (fs.existsSync(exercisePath)) {
        const dataInFile = fs.readFileSync(exercisePath);
        const jsonData = JSON.stringify(JSON.parse(dataInFile.toString().trim()));
        // eslint-disable-next-line no-unused-vars, no-await-in-loop
        const exerciseContant = await exercisesServiceV2.parsedModifiedContent(
          courseFolderName,
          exercise.name,
          jsonData,
          'curriculum_new'
        );
      }
    }
    return courseV2;
  }
};
