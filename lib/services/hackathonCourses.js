const CONSTANTS = require('../config');
const Schmervice = require('schmervice');
const logger = require('../../server/logger');

module.exports = class HackathonCoursesService extends Schmervice.Service {
    // create a function with name createHackathonCourses for enrolling the courses, and the first parramter receiving user_email and second parameter receiving course_name
    async createHackathonCourses(user_email, course_id) {
        const { HackathonCourses, HackathonLogin } = this.server.models();
        let errorData = {
            Error: true,
            code: 403,
            message: `Same course cannot be enrolled again. please try with some ther COURSE`,
        };
        try {
            // check user exists or not
            const checkUserExists = await HackathonLogin.query().where('email', user_email);
            if (checkUserExists.length == 0) {
                return [
                    {
                        Error: true,
                        code: 403,
                        message: `This email is not registered with us. Please register first.`,
                    },
                    null,
                ];
            } else {
                const checkEmailExists = await HackathonCourses.query().where('email', user_email).andWhere('course_id', course_id);
                if (checkEmailExists.length > 0) {
                    return [errorData, null];
                } else {
                    // add progress 0% to payload while enrolling the course
                    let payloadData = {
                        email: user_email,
                        course_id: course_id,
                        progress: "0%"
                    }
                    await HackathonCourses.query().insert(payloadData);
                    let EnrolledData = await HackathonCourses.query().where('email', user_email);
                    return [null, { message: "User ENROLLED successfully.", data: EnrolledData }];
                }
            }
        } catch (error) {
            console.log(error, "error 333")
            logger.error(JSON.stringify(error));
            return [error, null];
        }
    }

    // write a function with name updateProgress for updating the progress of the course of hackathonCourses table and update the progress of the course and the lenth of the course is maximum 4 and less than it.
    async updateProgress(payload, course_id) {
        const { HackathonCourses, HackathonLogin } = this.server.models();
        try {
            let checkCourseExists = await HackathonCourses.query().where('email', payload.email).andWhere('course_id', course_id);
            if (checkCourseExists.length == 0) {
                return [
                    {
                        Error: true,
                        code: 403,
                        message: `This course is not enrolled by you. Please enroll first.`,
                    },
                    null,
                ];
            } else {
                let exercise_id;
                let progress;
                
                let checkExerciseData = checkCourseExists[0].exercise_id;
                if (checkExerciseData == null) {
                    exercise_id = 1;
                    progress = "25%";
                }else if (checkExerciseData === 1) {
                    exercise_id = checkExerciseData + 1;
                    progress = "50%";
                }else if (checkExerciseData === 2) {
                    exercise_id = checkExerciseData + 1;
                    progress = "75%";
                }
                else if (checkExerciseData === 3) {
                    exercise_id = checkExerciseData + 1;
                    progress = "100%";
                }else {
                    let finalData = await HackathonCourses.query().where('email', payload.email).andWhere('course_id', course_id);
                    return [null, { message: "User progress updated successfully.", data: finalData }]
                }
                await HackathonCourses.query().update({email: payload.email,course_id: course_id,exercise_id: exercise_id, progress: progress}).where('email', payload.email).andWhere('course_id', course_id);
                let finalData = await HackathonCourses.query().where('email', payload.email).andWhere('course_id', course_id);
                return [null, { message: "User progress updated successfully.", data: finalData }];
            }
        } catch (error) {
            logger.error(JSON.stringify(error));
            return [error, null];
        }
    }

    // create a function with name getEnrolledCourses and fetch the courses details by email id
    async getEnrolledCourses(email) {
        const { HackathonCourses, HackathonLogin } = this.server.models();
        try {
                let checkEnrolledCourses = await HackathonCourses.query().where('email', email);
                if (checkEnrolledCourses.length == 0) {
                    return [
                        {
                            Error: true,
                            code: 403,
                            message: `This email is not enrolled with any course. Please enroll first.`,
                        },
                        null,
                    ];
                } else {
                    return [null, { message: "User enrolled courses fetched successfully.", data: checkEnrolledCourses }];
                }
        } catch (error) {
            logger.error(JSON.stringify(error));
            return [error, null];
        }
    }
}