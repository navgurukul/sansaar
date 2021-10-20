const Schmervice = require('schmervice');
const Boom = require('@hapi/boom');
const _ = require('lodash');
const { transaction } = require('objection');
const fs = require('fs-extra');
const glob = require('glob');
const { errorHandler } = require('../errorHandling');
const { UTCToISTConverter } = require('../helpers/index');

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
module.exports = class CoursesService extends Schmervice.Service {
  // eslint-disable-next-line
  async reloadPropertiesFiles() {
    loadPropertiesFiles();
  }
  /* eslint-disable */
  async getCourseExercise(course_id, lang, course_type, txn) {
    const { Courses } = this.server.models();
    const banners = await this.getClassesBannerForCourses(course_id);
    let courseExercises;
    try {
      courseExercises = await Courses.query()
        .where('courses.id', course_id)
        .throwIfNotFound()
        .withGraphJoined('exercises')
        .modify((builder) => {
          builder.orderBy('exercises.sequence_num');
        });
      const { exercises, ...parsedData } = courseExercises[0];
      const newExercises = [];

      courseExercises[0].exercises.forEach((ele) => {
        const { content, ...newEle } = ele;
        try {
          newEle.content = JSON.parse(ele.content);
        } catch {
          newEle.content = ele.content;
        }
        newExercises.push(newEle);
      });
      parsedData.exercises = newExercises;

      const course = await Courses.query(txn).where({
        id: course_id,
      });

      const courseName = course[0].name;
      const alreadyAddedBanners = [];

      _.map(newExercises, (exercise) => {
        // modifiedFile = exercise.slug.split('/');
        let modifiedFile = exercise.slug;
        if (modifiedFile.slice(-5) === '_json') {
          modifiedFile = modifiedFile.slice(0, -5);
        } else if (modifiedFile.slice(-3) === '_md') {
          modifiedFile = modifiedFile.slice(0, -3);
        }
        modifiedFile = modifiedFile.split('/');
        if (modifiedFile.length > 1) {
          modifiedFile = `${modifiedFile[0].split('__')[0]}/PARSED_CONTENT/PROPERTIES_FILES/${
            modifiedFile[0].split('__')[1]
          }/${courseName}_${modifiedFile[1]}_${lang}`;
        } else {
          modifiedFile = `${
            modifiedFile[0].split('__')[0]
          }/PARSED_CONTENT/PROPERTIES_FILES/${courseName}_${
            modifiedFile[0].split('__')[1]
          }_${lang}`;
        }

        let finalPropertiesFiles = _.filter(Object.keys(allProperties), (x) => {
          return x.includes(modifiedFile);
        });
        if (finalPropertiesFiles.length === 0) {
          // modifiedFile = exercise.slug.split('/');
          let modifiedFile = exercise.slug;
          if (modifiedFile.slice(-5) === '_json') {
            modifiedFile = modifiedFile.slice(0, -5);
          } else if (modifiedFile.slice(-3) === '_md') {
            modifiedFile = modifiedFile.slice(0, -3);
          }
          modifiedFile = modifiedFile.split('/');
          if (modifiedFile.length > 1) {
            modifiedFile = `${modifiedFile[0].split('__')[0]}/PARSED_CONTENT/PROPERTIES_FILES/${
              modifiedFile[0].split('__')[1]
            }/${courseName}_${modifiedFile[1]}_en`;
          } else {
            modifiedFile = `${
              modifiedFile[0].split('__')[0]
            }/PARSED_CONTENT/PROPERTIES_FILES/${courseName}_${modifiedFile[0].split('__')[1]}_en`;
          }
          finalPropertiesFiles = _.filter(Object.keys(allProperties), (x) => {
            return x.includes(modifiedFile);
          });
        }
        // keys = exercise.content;
        let keys;
        let parseExerContent = JSON.parse(exercise.content[0]);
        if (parseExerContent.type !== undefined) {
          keys = exercise.content;
        } else {
          keys = JSON.parse(exercise.content[0]).value;
        }
        const keysArr = [];
        _.map(keys, (obj) => {
          if (typeof obj === 'string') {
            keysArr.push(JSON.parse(obj));
          } else {
            keysArr.push(obj);
          }
        });
        // Render the existing markdown data.
        let courseMapFiles;
        if (finalPropertiesFiles.length === 0) {
          courseMapFiles = [];
        } else {
          courseMapFiles = Object.keys(allProperties[finalPropertiesFiles[0]]);
        }
        _.map(courseMapFiles.reverse(), (exerKey) => {
          const [key, value] = [exerKey, allProperties[finalPropertiesFiles[0]][exerKey]];
          _.map(keysArr, (contentValue) => {
            if (contentValue.component === 'table') {
              if (key !== '') {
                contentValue.value = contentValue.value.map((item) => {
                  item.header = item.header.replace(key, value);
                  item.items = item.items.map((items) => {
                    return items.replace(key, value);
                  });
                  return item;
                });
              }
            }
            if (
              contentValue.type === 'markdown' ||
              contentValue.component === 'header' ||
              contentValue.component === 'text'
            ) {
              if (key !== '') {
                contentValue.value = contentValue.value.replace(key, value);
              }
            }
          });
        });

        const linkedBanners = [];
        _.forEach(banners, (b) => {
          // add classes banners to corresponding exercises
          if (b.metaData.exercise_id == exercise.id) {
            const { metaData, ...bnnr } = b;
            linkedBanners.push(bnnr);
            alreadyAddedBanners.push(b.metaData.id);
          }
          // randomly add classes banners with no exercise_id
          else if (
            !b.metaData.exercise_id &&
            _.shuffle([false, true, false])[0] &&
            alreadyAddedBanners.indexOf(b.metaData.id) < 0
          ) {
            const { metaData, ...bnnr } = b;
            linkedBanners.push(bnnr);
            alreadyAddedBanners.push(b.metaData.id);
          }
        });
        if (linkedBanners.length > 0) {
          keysArr = [...keysArr, ...linkedBanners];
        }
        exercise.content = keysArr;
      });

      // randomly add classes banners with no exercise_id if not added in the previous else
      if (banners.length !== alreadyAddedBanners.length) {
        _.forEach(banners, (b) => {
          if (alreadyAddedBanners.indexOf(b.metaData.id) < 0) {
            console.log(b);
            const randomIdx = Math.floor(Math.random() * (parsedData.exercises.length - 1));
            const { metaData, ...bnnr } = b;
            parsedData.exercises[randomIdx].content = [
              ...parsedData.exercises[randomIdx].content,
              bnnr,
            ];
          }
        });
      }

      return [null, parsedData];
    } catch (err) {
      console.log(err, 'err\n\n');
      return [errorHandler(err), null];
    }
  }

  async getClassesBannerForCourses(course_id) {
    const { Classes } = this.server.models();
    const dateIST = UTCToISTConverter(new Date());
    const classes = await Classes.query()
      .where('course_id', course_id)
      .andWhere('end_time', '>', dateIST)
      .andWhere('type', '!=', 'cohort');
    const classBanner = [];
    _.map(classes, (c) => {
      const banner = {};
      banner['component'] = 'banner';
      banner['title'] = c.title;
      banner['text'] = c.description;
      const actions = {};
      actions['url'] = `https://merakilearn.org/classes/${c.id}`;
      actions['label'] = c.type;
      banner['actions'] = [];
      banner['actions'].push(actions);
      banner['metaData'] = {};
      banner['metaData']['id'] = c.id;
      banner['metaData']['exercise_id'] = c.exercise_id;
      banner['metaData']['course_id'] = c.course_id;
      classBanner.push(banner);
    });
    return classBanner;
  }

  async getAllCourses(txn = null) {
    const { Courses } = this.server.models();
    let availableCourses;
    try {
      availableCourses = await Courses.query(txn);
      return [null, availableCourses];
    } catch (err) {
      return [errorHandler(err), availableCourses];
    }
  }

  async getRecommendedCourses() {
    const { Courses } = this.server.models();
    // #REVIEW
    const typingGuru = await Courses.query().where(`name`, `LIKE`, `Typing-Guru`);
    let randomCourses;
    try {
      randomCourses = await Courses.query()
        .whereRaw(`name NOT LIKE ?`, `%(Typing-Guru)`)
        .orderByRaw(`random()`)
        .limit(2);
      const courses = [...randomCourses, ...typingGuru];
      return [null, courses];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getCourseById(courseId) {
    const { Courses } = this.server.models();
    let courses;
    try {
      courses = await Courses.query().findById(courseId);
      return [null, courses];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async enrollInCourse(courseId, authUser, txn) {
    const { CourseEnrolments } = this.server.models();
    try {
      await CourseEnrolments.query(txn).insert({
        student_id: authUser.id,
        course_id: courseId,
        enrolled_at: new Date(),
      });
      return [null, { success: true }];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async deleteCourseById(courseId) {
    const { Courses, CourseEnrolments, Exercises } = this.server.models();
    try {
      const deleteCourse = await transaction(
        CourseEnrolments,
        Exercises,
        Courses,
        async (CourseEnrolmentModel, ExerciseModel, CourseModel) => {
          try {
            await CourseEnrolmentModel.query().delete().where('course_id', courseId);
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

  // ##TODO
  async updateCourse(exercises, txn) {
    const { Exercises } = this.server.models();
    const promises = [];
    _.map(exercises, (exercise) => {
      promises.push(Exercises.query(txn).update(exercise).where('name', exercise.name));
    });
    await Promise.all(promises);
    return true;
  }

  async findByCourseName(name, course_type = undefined) {
    const { Courses } = this.server.models();
    let course;
    try {
      // Comparing it with a string type of null because course_type is passed as string even if null
      if (course_type == 'null' || course_type === undefined) {
        course = await Courses.query()
          .skipUndefined()
          .whereNull('course_type')
          .andWhere('name', name);
        // .whereRaw(`LOWER(nam e) LIKE ?`, [`%${nameLowerCase}%`]);
      } else if (course_type !== undefined) {
        course = await Courses.query()
          .skipUndefined()
          .where('name', name)
          // .whereRaw(`LOWER(name) LIKE ?`, [`%${nameLowerCase}%`])
          .andWhere('course_type', course_type);
      }
      return [null, course];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  // ##TODO
  async createNewCourse(details, txn) {
    const { Courses } = this.server.models();
    const createCourse = await Courses.query(txn).insert(details);
    return createCourse;
  }

  // ##TODO
  async createCategory(category) {
    const { Category } = this.server.models();
    const courseCategory = { ...category, created_at: new Date() };
    return Category.query().insert(courseCategory);
  }

  async markCourseComplete(userId, courseId) {
    const { CourseCompletion } = this.server.models();
    const completedCourse = { user_id: userId, course_id: courseId };
    try {
      await CourseCompletion.query()
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

  // ##TODO
  async getIdForRemoval(userId, courseId) {
    const { CourseCompletion } = this.server.models();
    const course = await CourseCompletion.query().where({
      user_id: userId,
      course_id: courseId,
    });
    if (course.length > 0) {
      return course;
    }
    throw Boom.badRequest('Course might have already been marked incomplete');
  }

  // ##TODO
  async removeCourseComplete(id, userId, courseId) {
    const { CourseCompletion } = this.server.models();
    const courseCompletion = await CourseCompletion.fromJson({
      id,
      user_id: userId,
      course_id: courseId,
    });

    const success = await courseCompletion
      .$query()
      .context({ user_id: userId, course_id: courseId })
      .delete();

    // const success = await CourseCompletion.query()
    //   .context({ user_id: userId, course_id: courseId })
    //   .del()
    //   .where('user_id', userId)
    //   .andWhere('course_id', courseId);
    if (success) return { success: true };
    throw Boom.badRequest('Course might have already been marked incompleted');
  }

  async getCourseComplete(userId) {
    const { CourseCompletion } = this.server.models();
    let completedCourse;
    try {
      completedCourse = await CourseCompletion.query().throwIfNotFound().where('user_id', userId);
      return [null, completedCourse];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }
};
