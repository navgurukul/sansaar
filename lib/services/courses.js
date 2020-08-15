const Schmervice = require('schmervice');

module.exports = class CoursesService extends Schmervice.Service {
  async getAllCourses() {
    const { Courses, CourseEnrolments } = this.server.models();
    const allAvailableCourses = await Courses.query();
    return {
      enrolledCourses: [],
      availableCourses: allAvailableCourses,
      completedCourses: [],
    };
  }
};
