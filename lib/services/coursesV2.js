const Schmervice = require('schmervice');
const Boom = require('@hapi/boom');
const { transaction, val } = require('objection');

const _ = require('lodash');
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

  /* eslint-disable */
  async getCourseExercise(course_id, lang, course_type, txn) {
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
      return [null, courseExercises];
    } catch (err) {
      console.log(err, 'err\n\n');
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
      const deleteCourse = await transaction(
        CourseCompletionV2,
        ExercisesV2,
        CoursesV2,
        async (CourseCompletionV2Model, ExerciseModel, CourseModel) => {
          try {
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
    return createCourse;
  }

  async updateCourse(courseId, courseDetails) {
    const { CoursesV2 } = this.server.models();
    if (courseDetails.lang_available) {
      courseDetails.lang_available = val(courseDetails.lang_available).asArray().castTo('text[]');
    }
    try {
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
};
