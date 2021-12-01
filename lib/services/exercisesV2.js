const Schmervice = require('schmervice');
const Boom = require('@hapi/boom');

const { errorHandler } = require('../errorHandling');

module.exports = class ExercisesServiceV2 extends Schmervice.Service {
  async addExercises(data) {
    const { ExercisesV2 } = this.server.models();
    try {
      const newExercise = await ExercisesV2.query().insert(data);
      return [null, newExercise];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async updateSingleExercises(exerciseId, data) {
    const { ExercisesV2 } = this.server.models();
    try {
      const updated = await ExercisesV2.query().patch(data).where('id', exerciseId);
      return [null, updated];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async markExerciseComplete(userId, exerciseId) {
    const { ExerciseCompletionV2 } = this.server.models();
    const completedExercise = { user_id: userId, exercise_id: exerciseId };
    try {
      await ExerciseCompletionV2.query()
        .context({ user_id: userId, exercise_id: exerciseId })
        .insert(completedExercise);
      return [null, { success: true }];
    } catch (err) {
      const errorObj = errorHandler(err);
      if (errorObj.type === 'UniqueViolationError')
        errorObj.message = 'Exercise might have already been marked completed';
      return [errorObj, null];
    }
  }

  async getIdForRemoval(userId, exerciseId) {
    const { ExerciseCompletionV2 } = this.server.models();
    const exercise = await ExerciseCompletionV2.query().where({
      user_id: userId,
      exercise_id: exerciseId,
    });
    if (exercise.length > 0) {
      return exercise;
    }
    throw Boom.badRequest('Exercise might have already been marked incomplete');
  }

  async removeExerciseComplete(id, userId, exerciseId) {
    const { ExerciseCompletionV2 } = this.server.models();

    const exerciseCompletion = await ExerciseCompletionV2.fromJson({
      id,
      user_id: userId,
      exercise_id: exerciseId,
    });
    const success = await exerciseCompletion
      .$query()
      .context({ user_id: userId, exercise_id: exerciseId })
      .delete();
    if (success) return { success: true };
    throw Boom.badRequest('Exercise might have already been marked incomplete');
  }

  async getExerciseComplete(userId) {
    const { ExerciseCompletionV2 } = this.server.models();

    let completedExercise;
    try {
      completedExercise = await ExerciseCompletionV2.query()
        .throwIfNotFound()
        .where('user_id', userId);
      return [null, completedExercise];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }
};
