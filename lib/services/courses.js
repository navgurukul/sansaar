const Schmervice = require('schmervice');
const _ = require('lodash');
const { transaction } = require('objection');
const { val } = require('objection');
const Boom = require('@hapi/boom');
const { errorHandler } = require('../errorHandling');

module.exports = class CoursesService extends Schmervice.Service {
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

  async findByCourseName(name) {
    const { Courses } = this.server.models();
    const nameLowerCase = name.toLowerCase();
    let course;
    try {
      course = await Courses.query().whereRaw(`LOWER(name) LIKE ?`, [`%${nameLowerCase}%`]);
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

  async patchCourse(details, name) {
    const { Courses } = this.server.models();
    let { lang_available, ...data } = details;
    if (lang_available) {
      const findCourse = await Courses.query().where('name', name);
      let findLang = [];
      if (findCourse[0].lang_available) {
        findLang = findCourse[0].lang_available.join(',');
      }
      data = {
        ...data,
        lang_available:
          findLang.length > 0
            ? val(lang_available + ',' + findLang)
                .asArray()
                .castTo('text[]')
            : val(lang_available).asArray().castTo('text[]'),
      };
    }

    return Courses.query().throwIfNotFound().patch(data).skipUndefined().where('name', name);
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
