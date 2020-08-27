const Schmervice = require('schmervice');
const _ = require('lodash');

module.exports = class CourseService extends Schmervice.Service {
  async getAllCourses(authUser, txn = null) {
    const { Courses, CourseEnrolments } = this.server.models();
    const enrolledCourses = [];
    const availableCourses = await Courses.query(txn).orderBy('sequence_num', 'asc');
    if (authUser) {
      const enrolCourses = await CourseEnrolments.query(txn)
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

  async getCourseTopics(courseId, txn = null) {
    const { Exercises } = this.server.models();
    const courseTopics = await Exercises.query(txn)
      .select('id', 'name')
      .where('course_id', courseId)
      .andWhere('parent_exercise_id', null)
      .orderBy('sequence_num', 'asc');
    return { courseTopics,};
  }

  async enrollInCourse(courseId, authUser, txn = null) {
    const { CourseEnrolments } = this.server.models();
    const isEnroll = await CourseEnrolments.query(txn).where({
      student_id: authUser.id,
      course_id: courseId,
    });

    if (isEnroll.length) {
      return { alreadyEnrolled: true };
    }
    await CourseEnrolments.query(txn).insert({
      student_id: authUser.id,
      course_id: courseId,
      enrolled_at: new Date(),
    });
    return { success: true };
  }

  async deleteCourseById(courseId, txn) {
    const { Courses, CourseEnrolments, Exercises, Submissions } = this.server.models();
    // delete all course enrolment.
    await CourseEnrolments.query(txn).delete().where('course_id', courseId);
    // delete all submissions with respective course from submissios table.
    const promises = [];
    const exercises = await Exercises.findByCourseId(courseId);
    _.map(exercises, (exercise) => {
      promises.push(Submissions.query(txn).delete().where('exercise_id', exercise.id));
    });
    await Promise.all(promises);
    // delete all exercises with respective course.
    await Exercises.query(txn).delete().where('course_id', courseId);
    // finally delete course.
    await Courses.query(txn).deleteById(courseId);
    return true;
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

  async findByCourseName(name, graphFetchRelation = '', txn) {
    const { Courses } = this.server.models();
    const course = Courses.query(txn)
      .where('name', name)
      .withGraphFetched(graphFetchRelation);
    return course;
  }
  
  async createNewCourse(details, txn) {
    const { Courses } = this.server.models();
    console.log(details)
    const createCourse = Courses.query(txn).insert(details);
    return createCourse;
  }
};
