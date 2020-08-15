const Joi = require("@hapi/joi");
const Exercises = require("../models/exercises");

module.exports = [
    {
        method: 'GET',
        path: '/courses/{courseId}/exercises',
        options: {
            description: 'List exercises for a particular course.',
            tags: ['api'],
            validate: {
                params: Joi.object({
                    courseId: Exercises.field('course_id')
                })
            },
            handler: async (request) => {
                const { exerciseService, displayService } = request.services();
                const { courseId } = request.params;
                
                const exercise = await exerciseService.getExercisesById(courseId);

                return { exercise: exercise };
            }
        }
    }
]
