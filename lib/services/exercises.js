const Schmervice = require('schmervice');
const _ = require('lodash');

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

  async addUpdateExercise(details, txn) {
    const { exercise } = details;
    const { Exercises } = this.server.models();
    if (exercise.childExercise) {
      await this.addUpdateChildExercise(exercise.childExercise);
    }
    const ifExist = await Exercises.query(txn).where('course_id', exercise.course_id).andWhere('slug', exercise.slug);
    if (ifExist.length) {
      return await Exercises.query(txn).update(exercise).where('course_id', exercise.course_id).andWhere('slug', exercise.slug);
    }
    return await Exercises.query(txn).insert(exercise);
  }

  async addUpdateChildExercise(childExercise, txn) {
    const { Exercises } = this.server.models();
    const promises = [];
    const promises2 = [];
    let parent_exercise_id;
    const ifExist = await Exercises.query(txn).where('course_id', childExercise[0].course_id).andWhere('slug', childExercise[0].slug);

    if (!ifExist.length) {
      const addFirstChildExercise = await Exercises.query(txn).insert(childExercise[0]);
      parent_exercise_id = addFirstChildExercise.id;
    } else {
      parent_exercise_id = ifExist[0].id;
    }
    
    const updatedChildExercise = childExercise.filter(x => x.parent_exercise_id = parent_exercise_id)

    _.map(updatedChildExercise, (exercise) => {
      promises.push(Exercises.query().where('course_id', exercise.course_id).andWhere('slug', exercise.slug))
    })
    
    const updateOradd = await Promise.all(promises);
    
    _.map(updateOradd, (ifExist, index) => {
      if(ifExist.length) {
        promises2.push(Exercises.query(txn).update(updatedChildExercise[index] ).where('course_id', updatedChildExercise[index].course_id).andWhere('slug', updatedChildExercise[index].slug))
      } else {
        promises2.push(Exercises.query(txn).insert(updatedChildExercise[index]))
      }
    })
    await Promise.all(promises2)
    return true;
  }
};
