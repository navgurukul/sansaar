const Schmervice = require("schmervice");


module.exports = class ExercisesService extends Schmervice.Service {
    async getExercisesById (courseId) {
        const { Exercises } = this.server.models();
        return await Exercises.query().findById(courseId);
    }
};