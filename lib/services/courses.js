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

  async updateCoursesByPathwayId(pathwayId, payloadObj, authUser, txn) {
    const { PathwayCourses } = this.server.models();
    payloadObj.pathway_id = pathwayId;
    const { pathwayCourseId } = payloadObj;

    // Update the pathway course by ID.
    if (pathwayCourseId) {
      delete payloadObj.pathwayCourseId;
      payloadObj.updated_at = new Date();
      const updatePathwayCourse = await PathwayCourses.query(txn)
        .update(payloadObj)
        .where('id', pathwayCourseId);
      return updatePathwayCourse;
    }
    delete payloadObj.pathwayCourseId;
    // Getting data from pathway_courses table for matching pathway id
    const allPathwayCourses = await PathwayCourses.query(txn).where('pathway_id', pathwayId);
    // Sorting it by sequence number
    allPathwayCourses.push(payloadObj);
    allPathwayCourses.sort((a, b) => a.sequence_num - b.sequence_num);
    if (authUser) {
      // Deleting all courses of the particular pathway id
      await PathwayCourses.query(txn).where('pathway_id', pathwayId).del();
      // Inserting all courses of the particular pathway id
      const addPathwayCourses = await PathwayCourses.query(txn).insert(allPathwayCourses);
      return addPathwayCourses;
    }
    return null;
  }
};
