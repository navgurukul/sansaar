const Schmervice = require('schmervice');
const Boom = require('@hapi/boom');
const _ = require('lodash');
const { errorHandler } = require('../errorHandling');

module.exports = class ExercisesService extends Schmervice.Service {
  async getExercisesByCourseId(courseId, authUser) {
    const { Exercises } = this.server.models();
    if (authUser) {
      let exercises;
      try {
        exercises = await Exercises.query()
          .where('course_id', courseId)
          .modifiers({
            whereUserAuth(builder) {
              builder.where('user_id', authUser.id);
            },
          });
        const newExercises = exercises.filter((x) => (x.childExercises = []));
        return [null, this.exercisesConvert(newExercises)];
      } catch (err) {
        return [errorHandler(err), null];
      }
    }
    try {
      const exercises = await Exercises.findByCourseId(courseId);
      const newExercises = exercises.filter((x) => (x.childExercises = []));
      return [null, this.exercisesConvert(newExercises)];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async updateSingleExercises(exerciseId, data) {
    const { Exercises } = this.server.models();
    try {
      const updated = await Exercises.query().patch(data).where('id', exerciseId);
      return [null, updated];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async exercisesConvert(exercises) {
    this.convertedExercises = [];
    let childExercisesData = [];
    _.map(exercises, (exercise) => {
      if (exercise.parent_exercise_id) {
        delete exercise.content;
        childExercisesData.push(exercise);
      } else {
        delete exercise.content;
        if (childExercisesData.length) {
          _.map(childExercisesData, (child, index) => {
            if (index > 0) {
              childExercisesData[0].childExercises.push(child);
            }
          });
          this.convertedExercises.push(childExercisesData[0]);
          childExercisesData = [];
        }
        this.convertedExercises.push(exercise);
      }
    });
    return this.convertedExercises;
  }

  async getExerciseBySlug(slug, authUser, txn = null) {
    const { Exercises } = this.server.models();
    let exercise;
    if (authUser) {
      try {
        exercise = await Exercises.query(txn)
          .where('slug', slug)
          .throwIfNotFound()
          .modifiers({
            whereUserAuth(builder) {
              builder.where('user_id', authUser.id);
            },
          });
        return [null, exercise];
      } catch (err) {
        return [errorHandler(err), null];
      }
    }
    try {
      exercise = await Exercises.query(txn).throwIfNotFound().where('slug', slug);
      return [null, exercise];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  // #TODO
  async upsertExercises(details, txn) {
    const { slugArr, exercise, childExercise } = details;
    const { Exercises } = this.server.models();
    // submissions model removed
    if (exercise.constructor === Object || childExercise.length > 0) {
      if (childExercise.length > 0) {
        const exercisesByCourseId = await Exercises.query(txn).where(
          'course_id',
          childExercise[0].course_id
        );
        const childExercises = exercisesByCourseId.filter(
          (childExer) => !slugArr.includes(childExer.slug)
        );
        // eslint-disable-next-line
        _.map(childExercises, async (exercise) => {
          await Exercises.query(txn).where('slug', exercise.slug).delete();
        });
      } else if (Object.keys(exercise).length > 0) {
        const exercisesByCourseId = await Exercises.query(txn).where(
          'course_id',
          exercise.course_id
        );
        const parentExercises = exercisesByCourseId.filter(
          (parentExer) => !slugArr.includes(parentExer.slug)
        );
        // eslint-disable-next-line
        _.map(parentExercises, async (exercise) => {
          await Exercises.query(txn).where('slug', exercise.slug).delete();
        });
      }
    }
    if (childExercise.length > 0) {
      return this.upsertChildExercises(childExercise);
    }
    if (exercise.constructor === Object) {
      const ifExerciseExist = await Exercises.query(txn).where('slug', exercise.slug);
      if (ifExerciseExist.length) {
        return Exercises.query(txn)
          .update(exercise)
          .where('course_id', exercise.course_id)
          .andWhere('slug', exercise.slug);
      }
      return Exercises.query(txn).insert(exercise);
    }
    return true;
  }

  async markExerciseComplete(userId, exerciseId) {
    const { ExerciseCompletion } = this.server.models();
    const completedExercise = { user_id: userId, exercise_id: exerciseId };
    try {
      await ExerciseCompletion.query()
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
    const { ExerciseCompletion } = this.server.models();
    const exercise = await ExerciseCompletion.query().where({
      user_id: userId,
      exercise_id: exerciseId,
    });
    if (exercise.length > 0) {
      return exercise;
    }
    throw Boom.badRequest('Exercise might have already been marked incomplete');
  }

  async removeExerciseComplete(id, userId, exerciseId) {
    const { ExerciseCompletion } = this.server.models();

    const exerciseCompletion = await ExerciseCompletion.fromJson({
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
    const { ExerciseCompletion } = this.server.models();

    let completedExercise;
    try {
      completedExercise = await ExerciseCompletion.query()
        .throwIfNotFound()
        .where('user_id', userId);
      return [null, completedExercise];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }
};
