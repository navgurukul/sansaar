const Schmervice = require('schmervice');

module.exports = class ExerciseService extends Schmervice.Service {
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

  async getExerciseBySlug(slug, authUser, txn = null) {
    const { Exercises } = this.server.models();
    let exercise;
    if (authUser) {
      exercise = await Exercises.query(txn)
        .where('slug', slug)
        .withGraphFetched('submissions(whereUserAuth)')
        .modifiers({
          whereUserAuth(builder) {
            builder.where('user_id', authUser.id);
          },
        })
        .orderBy('sequence_num', 'asc');
      return exercise;
    }
    exercise = await Exercises.query(txn).where('slug', slug);
    return exercise;
  }
};
