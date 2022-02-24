/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
const Schmervice = require('schmervice');
// const Boom = require('@hapi/boom');
const _ = require('lodash');
const { transaction } = require('objection');
const { errorHandler } = require('../errorHandling');
const { UTCToISTConverter } = require('../helpers/index');

module.exports = class classesService extends Schmervice.Service {
  // this temporary function is for use in the '/classes/update_classes_to_courses_table' route
  async getClassesTemp() {
    const { Classes } = this.server.models();
    let classes;
    try {
      // classes = await Classes.query().where('course_id IS NOT NULL').orderBy('start_time');
      classes = await Classes.query()
        .skipUndefined()
        .where('course_id', '>', '-1')
        .orderBy('start_time')
        .withGraphFetched('pathways');
      // eslint-disable-next-line
      return [null, classes];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getAllClasses(startDate) {
    const { Classes } = this.server.models();
    let classes;
    try {
      classes = await Classes.query()
        .skipUndefined()
        .where('start_time', '>=', startDate)
        .orderBy('start_time');
      // eslint-disable-next-line
      return [null, classes];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getUpcomingClasses(filters, userId) {
    const { Classes, ClassRegistrations } = this.server.models();
    const { startDate, endDate, lang, classType } = filters;

    let classes;
    try {
      classes = await Classes.query()
        .skipUndefined()
        .where('start_time', '>=', startDate)
        .andWhere('end_time', '>=', endDate)
        .andWhere('lang', lang)
        .andWhere('type', classType)
        .limit(100)
        .orderBy('start_time');
    } catch (err) {
      return [errorHandler(err), null];
    }

    if (userId !== undefined) {
      const enrolledClassIdList = [];
      let classesOfUser;
      try {
        classesOfUser = await ClassRegistrations.query().where('user_id', userId);
      } catch (err) {
        return [errorHandler(err), null];
      }
      classesOfUser.map((enrClass) => {
        return enrolledClassIdList.push(enrClass.class_id);
      });
      const onlyEnrolledClasses = _.filter(classes, (o) => {
        return enrolledClassIdList.indexOf(o.id) < 0;
      });
      return [null, onlyEnrolledClasses];
    }
    return [null, classes];
  }

  async createRecurringEvent(recurringPayload) {
    const { RecurringClasses } = this.server.models();
    let recurringClassEntry;
    try {
      recurringClassEntry = await RecurringClasses.query().insert(recurringPayload);
      return [null, recurringClassEntry];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async updateRecurringEvent(recurringPayload, id) {
    const { RecurringClasses } = this.server.models();
    let recurringClassUpdated;
    try {
      recurringClassUpdated = await RecurringClasses.query()
        .skipUndefined()
        .patch(recurringPayload)
        .where('id', id);
      return [null, recurringClassUpdated];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async insertIntoClassesToCourses(classes) {
    const { ClassesToCourses } = this.server.models();
    const data = [];
    classes.forEach((class_) => {
      data.push({
        class_id: class_.id,
        course_v1: class_.course_id,
        exercise_v1: class_.exercise_id,
        pathway_v1: class_.pathway_id,
      });
    });
    console.log(data);
    const res = await ClassesToCourses.query().insert(data);
    return [null, res];
  }

  async createClass(newClassData, role = null) {
    const { Classes, UserRole, ClassesToCourses } = this.server.models();
    let newClass;
    let newClassToCourse;
    // eslint-disable-next-line
    /**
     * check if role is already assigned to the user.
     * Objection doesn't support on_conflict function that inserts if row doesn't match otherwise simply ignore
     */
    const ifRoleAssigned = await UserRole.query()
      .skipUndefined()
      .where('user_id', newClassData[0].facilitator_id)
      .andWhere('role', role);
    // Check if role is sent in headers, check if facilitator is creating class for themselves and & check if role is not alreadt assigned
    if (role && newClassData[0].facilitator_id && !ifRoleAssigned.length > 0) {
      const assignRole = { user_id: parseInt(newClassData[0].facilitator_id, 10), role };
      await UserRole.query().insert(assignRole);
    }
    // class_id, courses_v2, exercises_v2, pathways_v2
    const classes_to_courses_data = [];

    newClassData.forEach((class_) => {
      class_.course_version = 'v2';
      classes_to_courses_data.push({
        course_v2: class_.course_id,
        exercise_v2: class_.exercise_id,
        pathway_v2: class_.pathway_id,
      });
      delete class_.course_id;
      delete class_.exercise_id;
      delete class_.pathway_id;
    });

    try {
      newClass = await Classes.query().insertGraph(newClassData);
      newClass.forEach((class_, i) => {
        classes_to_courses_data[i].class_id = class_.id;
      });
      // only if the class has a course_id insert in the ClassesToCourses table
      if (classes_to_courses_data[0].course_v2 !== undefined) {
        newClassToCourse = await ClassesToCourses.query().insertGraph(classes_to_courses_data);
      }
      return [null, newClass];
    } catch (err) {
      // eslint-disable-next-line
      console.log(err);
      return [errorHandler(err), null];
    }
  }

  async deleteClass(classId, txn) {
    const { Classes, ClassRegistrations, ClassesToCourses } = this.server.models();
    try {
      const deleteClassAndClearReg = await transaction(
        Classes,
        ClassRegistrations,
        ClassesToCourses,
        async (ClassesModel, ClassRegistrationsModel, ClassesToCoursesModel) => {
          try {
            await ClassRegistrationsModel.query(txn).delete().where('class_id', classId);
            await ClassesToCoursesModel.query(txn).delete().where('class_id', classId);
          } catch (err) {
            return errorHandler(err);
          }
          await ClassesModel.query(txn).delete().where('id', classId);
          return { success: true };
        }
      );
      return [null, deleteClassAndClearReg];
    } catch (err) {
      return [errorHandler(err), null];
    }
    // await ClassRegistrations.query().delete().where('class_id', classId);
    // const deleted = await Classes.query().delete().where('id', classId);
    // if (deleted > 0) {
    //   return { success: true };
    // }
    // throw Boom.badRequest("Class doesn't exist");
  }

  // check version of the class
  // if version is v1, then send v1 data from classes_to_courses table
  // else send v2 data from classes_to_courses table

  async getClassById(classId) {
    const { Classes } = this.server.models();
    let classes;
    try {
      classes = await Classes.query()
        .throwIfNotFound()
        .findById(classId)
        .withGraphFetched({ parent_class: true, classes_to_courses: true });

      if (classes.classes_to_courses) {
        classes.course_id =
          classes.course_version === 'v1'
            ? classes.classes_to_courses.course_v1
            : classes.classes_to_courses.course_v2;
        classes.exercise_id =
          classes.course_version === 'v1'
            ? classes.classes_to_courses.exercise_v1
            : classes.classes_to_courses.exercise_v2;
        classes.pathway_id =
          classes.course_version === 'v1'
            ? classes.classes_to_courses.pathway_v1
            : classes.classes_to_courses.pathway_v2;
      }
      delete classes.classes_to_courses;
      return [null, classes];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getClassesByRecurringId(recurringId) {
    const { Classes } = this.server.models();
    let classes;
    try {
      classes = await Classes.query()
        .throwIfNotFound()
        .where('recurring_id', recurringId)
        .withGraphFetched({
          parent_class: true,
          registrations: true,
          facilitator: true,
        })
        // Another way to do this could be only fetch graph by matching user id
        .modifyGraph('registrations', (builder) => builder.select('user_id'));
      return [null, classes];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getClassesIdByRecurringId(recurringId) {
    const { Classes } = this.server.models();
    let classes;
    try {
      classes = await Classes.query().select('id').where('recurring_id', recurringId);
      const classesId = [];
      classes.forEach((c) => {
        classesId.push(c.id);
      });
      return [null, classesId];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getRecurringClassesIdByUserId(userId) {
    const { ClassRegistrations } = this.server.models();
    let instances;
    try {
      instances = await ClassRegistrations.query()
        .select('class_id as id')
        .throwIfNotFound()
        .where('user_id', userId);
      const classesId = [];
      instances.forEach((c) => {
        classesId.push(c.id);
      });
      return [null, classesId];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async updateClass(id, classUpdates) {
    const { Classes, ClassRegistrations, ClassesToCourses } = this.server.models();
    let updatedClass;
    let classes_to_courses_data;
    try {
      if (classUpdates.max_enrolment) {
        const totalRegistrations = await ClassRegistrations.query().where('class_id', id);
        if (totalRegistrations.length > classUpdates.max_enrolment) {
          return [
            {
              error: true,
              message: `${totalRegistrations.length} students already enrolled. Please set the class limit above ${totalRegistrations.length}`,
              code: 400,
            },
            null,
          ];
        }
      }

      if (classUpdates.pathway_id || classUpdates.course_id || classUpdates.exercise_id) {
        const { course_version } = (
          await Classes.query().select('course_version').where('id', id)
        )[0];

        classes_to_courses_data =
          course_version === 'v1'
            ? {
                course_v1: classUpdates.course_id,
                pathway_v1: classUpdates.pathway_id,
                exercise_v1: classUpdates.exercise_id,
              }
            : {
                course_v2: classUpdates.course_id,
                pathway_v2: classUpdates.pathway_id,
                exercise_v2: classUpdates.exercise_id,
              };

        delete classUpdates.pathway_id;
        delete classUpdates.course_id;
        delete classUpdates.exercise_id;
      }
      if (Object.keys(classUpdates).length > 0) {
        updatedClass = await Classes.query().throwIfNotFound().patchAndFetchById(id, classUpdates);
      }
      if (classes_to_courses_data) {
        const class_to_courses = (await ClassesToCourses.query().where('class_id', id))[0];
        classes_to_courses_data = JSON.parse(JSON.stringify(classes_to_courses_data));
        const update_classes_to_courses = await ClassesToCourses.query()
          .throwIfNotFound()
          .patchAndFetchById(class_to_courses.id, classes_to_courses_data);
      }
      const [res_err, res] = await this.getClassById(id);
      if (res_err) {
        return errorHandler(res_err);
      }
      return [null, res];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async deleteMultipleClasses(recurringId, txn) {
    const {
      Classes,
      ClassRegistrations,
      RecurringClasses,
      ClassesToCourses,
    } = this.server.models();
    try {
      const deleteClassesAndClearReg = await transaction(
        Classes,
        ClassRegistrations,
        RecurringClasses,
        ClassesToCourses,
        async (
          ClassesModel,
          ClassRegistrationsModel,
          RecurringClassesModel,
          ClassesToCoursesModel
        ) => {
          try {
            const getClassesId = await ClassesModel.query(txn)
              .select('id')
              .throwIfNotFound()
              .where('recurring_id', recurringId);
            const filterIds = _.map(getClassesId, (c) => {
              return c.id;
            });
            await ClassRegistrationsModel.query(txn).delete().whereIn('class_id', filterIds);
            await ClassesToCoursesModel.query(txn).delete().whereIn('class_id', filterIds);
          } catch (err) {
            return errorHandler(err);
          }
          await ClassesModel.query(txn).delete().where('recurring_id', recurringId);
          await RecurringClassesModel.query(txn).delete().where('id', recurringId);
          return { success: true };
        }
      );
      return [null, deleteClassesAndClearReg];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async recommendedClasses() {
    const { Classes } = this.server.models();
    let classRecommendations;
    try {
      classRecommendations = await Classes.query().orderByRaw(`random()`).limit(4);
      return [null, classRecommendations];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async registerToClassById(registrationDetails) {
    const { ClassRegistrations } = this.server.models();
    let successReg;
    try {
      successReg = await ClassRegistrations.query().insertGraph(registrationDetails);
      return [null, successReg];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async removeRegistrationById(classIds, userId, txn) {
    const { ClassRegistrations } = this.server.models();

    try {
      await ClassRegistrations.query(txn)
        .delete()
        .whereIn('class_id', classIds)
        .andWhere('user_id', userId);
      return [null, { success: true }];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getClasses() {
    const { Classes } = this.server.models();
    let classes;
    const dateIST = UTCToISTConverter(new Date());
    try {
      classes = await Classes.query()
        .where('end_time', '>', dateIST)
        .orderBy('start_time')
        .withGraphFetched({ registrations: true, facilitator: true, parent_class: true })
        // Another way to do this could be only fetch graph by matching user id
        .modifyGraph('registrations', (builder) => builder.select('user_id'));

      // eslint-disable-next-line
      return [null, classes];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getClassesByUserId(userId) {
    const { ClassRegistrations } = this.server.models();
    let userClasses;
    const dateIST = UTCToISTConverter(new Date());
    try {
      userClasses = await ClassRegistrations.query()
        .where('user_id', userId)
        .orderBy('registered_at')
        .withGraphJoined('classes')
        .modify((builder) => builder.where('classes.end_time', '>', dateIST));

      return [null, userClasses];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getRegistrationsByClassId(classId) {
    const { ClassRegistrations } = this.server.models();
    try {
      const classRegistrations = await ClassRegistrations.query()
        .where('class_id', classId)
        .count();
      return [null, classRegistrations];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }
};
