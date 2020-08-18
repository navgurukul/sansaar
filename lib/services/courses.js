const Schmervice = require('schmervice');
const Boom = require('@hapi/boom');
const _ = require('underscore');

module.exports = class CoursesService extends Schmervice.Service {
  async getAllCourses(authUser, txn = null) {
    const { Courses, CourseEnrolments } = this.server.models();
    const enrolledCourses = [];
    const availableCourses = await Courses.query(txn).orderBy('sequence_num', 'asc');
    if (authUser) {
      const enrolCourses = await CourseEnrolments.query(txn)
        .eager({ courses: true })
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

  async getCourseTopics(courseId, txn = null) {
    const { Exercises } = this.server.models();
    const listOfTopics = await Exercises.query(txn)
      .select('id', 'name')
      .where('course_id', courseId)
      .andWhere('parent_exercise_id', null)
      .orderBy('sequence_num', 'asc');
    return {
      courseTopics: listOfTopics,
    };
  }

  async enrollInCourse(courseId, authUser, txn = null) {
    const { CourseEnrolments, Courses } = this.server.models();
    const isEnroll = await CourseEnrolments.query(txn).where({
      student_id: authUser.id,
      course_id: courseId,
    });
    const isCourseAvailable = await Courses.query(txn).findById(courseId);
    if (isCourseAvailable) {
      if (isEnroll.length) {
        return {
          alreadyEnrolled: true,
        };
      }
      await CourseEnrolments.query(txn).insert({
        student_id: authUser.id,
        course_id: courseId,
        enrolled_at: new Date(),
      });
      return {
        enrolled: true,
      };
    }
    throw Boom.badRequest("The course for given id doesn't exists.");
  }
};
