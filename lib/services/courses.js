const Schmervice = require('schmervice');
const _ = require('lodash');

module.exports = class CoursesService extends Schmervice.Service {
  async getAllCourses(authUser) {
    const { Courses, CourseEnrolments } = this.server.models();
    const enrolledCourses = [];
    const availableCourses = await Courses.query().orderBy('sequence_num', 'asc');
    if (authUser) {
      const enrolCourses = await CourseEnrolments.query()
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

  async findCoursesByPathwayId(pathwayId) {
    const { PathwayCourses } = this.server.models();
    return PathwayCourses.query().where('pathway_id', pathwayId).withGraphFetched('courses');
  }

  async updateCoursesByPathwayId(pathwayId, payloadObj) {
    const { PathwayCourses } = this.server.models();
    const allPathwayCourses = await PathwayCourses.query().where('pathway_id', pathwayId);
    allPathwayCourses.push(payloadObj);
    allPathwayCourses.sort((a, b) => a.sequenceNum - b.sequenceNum);
    await PathwayCourses.query().where('pathway_id', pathwayId).del();
    await PathwayCourses.query().insertGraph(allPathwayCourses);
  }
};
