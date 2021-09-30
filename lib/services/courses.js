const Schmervice = require('schmervice');
const Boom = require('@hapi/boom');
const _ = require('lodash');
const { transaction } = require('objection');
const fs = require('fs-extra');
const glob = require('glob');
const { errorHandler } = require('../errorHandling');

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
  async getCourseExercise(course_id, lang, txn) {
    const { Courses } = this.server.models();

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
      _.map(newExercises, (exercise) => {
        let modifiedFile = exercise.slug.split('/');
        if (modifiedFile.length > 1) {
          modifiedFile = `/PROPERTIES_FILES/${modifiedFile[0].split('__')[1]}/${courseName}_${
            modifiedFile[1]
          }_${lang}`;
        } else {
          modifiedFile = `/PROPERTIES_FILES/${courseName}_${
            modifiedFile[0].split('__')[1]
          }_${lang}`;
        }

        let finalPropertiesFiles = _.filter(Object.keys(allProperties), (x) => {
          return x.includes(modifiedFile);
        });
        if (finalPropertiesFiles.length === 0) {
          modifiedFile = exercise.slug.split('/');
          if (modifiedFile.length > 1) {
            modifiedFile = `/PROPERTIES_FILES/${modifiedFile[0].split('__')[1]}/${courseName}_${
              modifiedFile[1]
            }_en`;
          } else {
            modifiedFile = `/PROPERTIES_FILES/${courseName}_${modifiedFile[0].split('__')[1]}_en`;
          }
          finalPropertiesFiles = _.filter(Object.keys(allProperties), (x) => {
            return x.includes(modifiedFile);
          });
        }
        const keys = exercise.content;
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
            if (contentValue.type === 'markdown') {
              if (key !== '') {
                contentValue.value = contentValue.value.replace(key, value);
              }
            }
          });
        });
        exercise.content = keysArr;
      });
      return [null, parsedData];
    } catch (err) {
      // console.log(err, 'err\n\n');
      return [errorHandler(err), null];
    }
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

  async findByCourseName(name,course_type=undefined) {
    const { Courses } = this.server.models();
    const nameLowerCase = name.toLowerCase();
    let course;
    try {
      course = await Courses.query().skipUndefined().whereRaw(`LOWER(name) LIKE ?`, [`%${nameLowerCase}%`]).andWhere("course_type",course_type);
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
