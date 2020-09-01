const Schmervice = require('schmervice');
const _ = require('lodash');

module.exports = class ExerciseService extends Schmervice.Service {
  async getExercisesById(courseId, authUser) {
    const { Exercise } = this.server.models();
    if (authUser) {
      const exercises = await Exercise.query()
        .where('course_id', courseId)
        .withGraphFetched('submissions(whereUserAuth)')
        .modifiers({
          whereUserAuth(builder) {
            builder.where('user_id', authUser.id);
          },
        })
        .orderBy('sequence_num', 'asc');
      const newExercises = exercises.filter(x => x.childExercises = []);
      return await this.exercisesConvert(newExercises);
    }
    const exercises = await Exercise.findByCourseId(courseId);
    const newExercises = exercises.filter(x => x.childExercises = []);
    return await this.exercisesConvert(newExercises);
  }

  async exercisesConvert(exercises) {
    const convertedExercises = []
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
              childExercisesData[0].childExercises.push(child)
            }
          })
          convertedExercises.push(childExercisesData[0])
          childExercisesData = [];
        }
        convertedExercises.push(exercise)
      }
    });
    return convertedExercises;
  }

  async getExerciseBySlug(slug, authUser, txn = null) {
    const { Exercise } = this.server.models();
    let exercise;
    if (authUser) {
      exercise = await Exercise.query(txn)
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
    exercise = await Exercise.query(txn).where('slug', slug);
    return exercise;
  }

  async upsertExercise(details, txn) {
    const { exercise, childExercise } = details;
    const { Exercise } = this.server.models();
    
    if (childExercise) {
      if (childExercise.length) {
        return await this.addUpdateChildExercise(childExercise);
      }
    }

    if (exercise) {
      const ifExist = await Exercise.query(txn).where('slug', exercise.slug);
      if (ifExist.length) {
        return await Exercise.query(txn).update(exercise).where('course_id', exercise.course_id).andWhere('slug', exercise.slug);
      }
      return await Exercise.query(txn).insert(exercise);
    }
    return true;
  }

  async addUpdateChildExercise(childExercise, txn) {
    const { Exercise } = this.server.models();
    const promises = [];
    const promises2 = [];
    let parent_exercise_id;

    const ifExist = await Exercise.query(txn).where('slug', childExercise[0].slug);

    if (!ifExist.length) {
      // Adding first child exercise for getting parent_exercise_id to others child
      const addFirstChildExercise = await Exercise.query(txn).insert(childExercise[0]);
      parent_exercise_id = addFirstChildExercise.id;
    } else {
      // if already exist then set parent_exercise_id as it is for others.
      parent_exercise_id = ifExist[0].id;
    }

    // assing parent_exercise_id to all child exercise.
    const updatedChildExercise = childExercise.filter(x => x.parent_exercise_id = parent_exercise_id)

    // get to know which child exercise is already is in database.
    _.map(updatedChildExercise, (exercise) => {
      promises.push(Exercise.query().where('course_id', exercise.course_id).andWhere('slug', exercise.slug))
    })

    const updateOradd = await Promise.all(promises);
    
    _.map(updateOradd, (ifExist, index) => {
      if (ifExist.length) {
        // if child exercise is already their then update it otherwise insert them.
        promises2.push(Exercise.query(txn)
          .update(updatedChildExercise[index])
          .where('course_id', updatedChildExercise[index].course_id)
          .andWhere('slug', updatedChildExercise[index].slug)
        );
      } else {
        promises2.push(Exercise.query(txn).insert(updatedChildExercise[index]))
      }
    })
    await Promise.all(promises2)
    return true;
  }
};
