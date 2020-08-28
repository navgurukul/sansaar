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

  async courseDetails(course) {
    return {
      name: course.name,
      logo: course.logo,
      short_description: course.short_description,
    };
  }

  async findCoursesByPathwayId(pathwayId) {
    const { PathwayCourses } = this.server.models();
    const pathwaysCourses = await PathwayCourses.query()
      .where('pathway_id', pathwayId)
      .withGraphFetched('courses');
    _.map(pathwaysCourses, async (pathwayCourse, index) => {
      const courseDetails = await this.courseDetails(pathwayCourse.courses);
      pathwaysCourses[index] = { ...pathwaysCourses[index], ...courseDetails };
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
      const addPathwayCourse = await PathwayCourses.query(txn)
        .insert(payloadObj)
        .withGraphFetched('courses');
      const courseDetails = await this.courseDetails(addPathwayCourse.courses);
      delete addPathwayCourse.courses;
      return { ...addPathwayCourse, ...courseDetails };
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
      await PathwayCourses.query(txn)
        .update(details)
        .where('id', pathwayCourseId)
        .andWhere('pathway_id', pathwayId);
      const updatedCourse = await PathwayCourses.query(txn)
        .findById(pathwayCourseId)
        .withGraphFetched('courses');
      const courseDetails = await this.courseDetails(updatedCourse.courses);
      delete updatedCourse.courses;
      return { ...updatedCourse, ...courseDetails };
    }
    throw Boom.badRequest('Given course is already exist in course pathway');
  }

  async getPathwayCourseById(pathwayId, pathwayCourseId, txn) {
    const { PathwayCourses } = this.server.models();
    const [pathwayCourse] = await PathwayCourses.query(txn)
      .where('id', pathwayCourseId)
      .andWhere('pathway_id', pathwayId)
      .withGraphFetched('courses');
    console.log(pathwayCourse);
    const courseDetails = await this.courseDetails(pathwayCourse.courses);
    delete pathwayCourse.courses;
    return { ...pathwayCourse, ...courseDetails };
  }
};
