const Schmervice = require('schmervice');
const Boom = require('@hapi/boom');
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
    const pathwaysCourses = await PathwayCourses.query()
      .where('pathway_id', pathwayId)
      .withGraphFetched('courses');
    _.map(pathwaysCourses, (pathwayCourse, index) => {
      pathwaysCourses[index].name = pathwayCourse.courses.name;
      pathwaysCourses[index].logo = pathwayCourse.courses.logo;
      pathwaysCourses[index].short_description = pathwayCourse.courses.short_description;
      delete pathwaysCourses[index].courses;
    });
    return pathwaysCourses;
  }

  async addCourseByPathwayId(pathwayId, payloadObj, txn) {
    const { PathwayCourses } = this.server.models();
    payloadObj.pathway_id = pathwayId;

    const ifExistPathwayCourse = await PathwayCourses.query(txn)
      .where('pathway_id', pathwayId)
      .andWhere('course_id', payloadObj.course_id);
    if (!ifExistPathwayCourse.length) {
      // Getting data from pathway_courses table for matching pathway id
      const allPathwayCourses = await PathwayCourses.query(txn).where('pathway_id', pathwayId);

      // Sorting it by sequence number
      allPathwayCourses.push(payloadObj);
      allPathwayCourses.sort((a, b) => a.sequence_num - b.sequence_num);

      // Deleting all courses of the particular pathway id
      await PathwayCourses.query(txn).where('pathway_id', pathwayId).del();

      // Inserting all courses of the particular pathway id
      const addPathwayCourses = await PathwayCourses.query(txn).insert(allPathwayCourses);
      return addPathwayCourses;
    }
    throw Boom.badRequest('Given course is already exist in course pathway.');
  }

  async updateCourseByPathwayId(pathwayId, pathwayCourseId, details, txn) {
    const { PathwayCourses } = this.server.models();

    const ifExistPathwayCourse = await PathwayCourses.query(txn)
      .where('pathway_id', pathwayId)
      .andWhere('course_id', details.course_id);
    if (!ifExistPathwayCourse.length) {
      // Update the pathway course by ID.
      details.updated_at = new Date();
      const updatePathwayCourse = await PathwayCourses.query(txn)
        .update(details)
        .where('id', pathwayCourseId)
        .andWhere('pathway_id', pathwayId);
      return updatePathwayCourse;
    }
    throw Boom.badRequest('Given course is already exist in course pathway');
  }
};
