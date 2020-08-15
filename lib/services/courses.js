const Schmervice = require('schmervice');

module.exports = class CoursesService extends Schmervice.Service {
  async getAllCourses(authUser) {
    const { Courses, CourseEnrolments } = this.server.models();
    let enrolledCourses = [];
    const allAvailableCourses = await Courses.query();
    if (authUser) {
      enrolledCourses = await CourseEnrolments.query().where('student_id', authUser.id);
    }
    return {
      enrolledCourses,
      availableCourses: allAvailableCourses,
      completedCourses: [],
    };
  }
};
