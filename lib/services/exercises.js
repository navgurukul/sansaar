const Schmervice = require('schmervice');

module.exports = class ExercisesService extends Schmervice.Service {
  async getExercisesById(courseId, authUser) {
    const { Exercises } = this.server.models();
    if (authUser) {
      const exercises = await Exercises.query()
        .where('course_id', courseId)
        .withGraphFetched('submissions(whereUserAuth)')
        .modifiers({
          whereUserAuth(builder) {
            builder.where('user_id', authUser.id);
          },
        })
        .orderBy('sequence_num', 'asc');
      return exercises;
    }
    return Exercises.findByCourseId(courseId);
  }
};
