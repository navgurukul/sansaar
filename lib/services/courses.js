const Schmervice = require('schmervice');
const _ = require('lodash');
const Boom = require('@hapi/boom');

module.exports = class CoursesService extends Schmervice.Service {
  async getAllCourses(authUser, txn = null) {
    const { Courses, CourseEnrolment } = this.server.models();
    const enrolledCourses = [];
    const availableCourses = await Courses.query(txn).orderBy('sequence_num', 'asc');
    if (authUser) {
      const enrolCourses = await CourseEnrolment.query(txn)
        .withGraphFetched('courses')
        .where('student_id', authUser.id);
      enrolCourses.sort((a, b) => a.courses[0].sequence_num - b.courses[0].sequence_num);
      _.each(enrolCourses, (enrolCourse) => {
        enrolledCourses.push(enrolCourse.courses[0]);
      });
    }
    return {
      enrolledCourses,
      availableCourses,
    };
  }

  async courses(courseId) {
    const { Courses } = this.server.models();
    const courses = await Courses.query().findById(courseId).orderBy('sequence_num', 'asc');
    return courses;
  }

  async enrollInCourse(courseId, authUser, txn) {
    const { CourseEnrolment } = this.server.models();
    const isEnroll = await CourseEnrolment.query(txn).where({
      student_id: authUser.id,
      course_id: courseId,
    });
    if (isEnroll.length) {
      return { alreadyEnrolled: true };
    }
    await CourseEnrolment.query(txn).insert({
      student_id: authUser.id,
      course_id: courseId,
      enrolled_at: new Date(),
    });
    return { success: true };
  }

  async deleteCourseById(courseId) {
    const { Courses, CourseEnrolment, Exercises } = this.server.models();
    // delete all course enrolment.
    await CourseEnrolment.query().delete().where('course_id', courseId);
    // delete all exercises with respective course.
    await Exercises.query().delete().where('course_id', courseId);
    // finally delete course.
    if (await Courses.query().deleteById(courseId)) return { success: true };
    throw Boom.badRequest(`Course with id ${courseId} doesn't exist`);
  }

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
    const course = await Courses.query().whereRaw(`LOWER(name) LIKE ?`, [`%${nameLowerCase}%`]);
    return course;
  }

  async createNewCourse(details, txn) {
    const { Courses } = this.server.models();
    const createCourse = await Courses.query(txn).insert(details);
    return createCourse;
  }

  async toggleCourseCompletion(completionDetails, isCompleted) {
    const { Courses } = this.server.models();
    if (isCompleted) {
      return Courses.query().insert(completionDetails);
    }
    return Courses.query()
      .delete()
      .where(completionDetails.userId, 'user_id')
      .andWhere(completionDetails.courseId, 'courseId');
  }
};
