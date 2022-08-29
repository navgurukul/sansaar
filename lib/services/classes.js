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

  async getCompleteEnrolledClasses(course_id, recurring_id, data = null) {
    const { Classes, ClassesToCourses } = this.server.models();
    const dateIST = UTCToISTConverter(new Date());
    try {
      const class_ids = await ClassesToCourses.query()
        .where('course_v2', course_id)
        .select('class_id');
      const ids = [];
      class_ids.forEach((c) => {
        ids.push(c.class_id);
      });
      let classes;
      if (data === 'total') {
        classes = await Classes.query().whereIn('id', ids).where('recurring_id', recurring_id);
      } else {
        classes = await Classes.query()
          .whereIn('id', ids)
          .andWhere('end_time', '<', dateIST)
          .where('recurring_id', recurring_id);
      }
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
        .where('end_time', '>=', startDate)
        .withGraphFetched('classes_to_courses')
        .orderBy('start_time');
      // eslint-disable-next-line
      classes.forEach((c) => {
        if (c.classes_to_courses) {
          if (c.course_version === 'v2') {
            c.course_v2 = c.classes_to_courses.course_v2;
            c.pathway_v2 = c.classes_to_courses.pathway_v2;
            c.exercise_v2 = c.classes_to_courses.exercise_v2;
          } else {
            c.course_v1 = c.classes_to_courses.course_v1;
            c.pathway_v1 = c.classes_to_courses.pathway_v1;
            c.exercise_v1 = c.classes_to_courses.exercise_v1;
          }
        }
        delete c.classes_to_courses;
      });
      return [null, classes];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getAllClassesAfterDate(startDate, scope, partner_id) {
    const { Classes, PartnerSpecificBatches } = this.server.models();
    let classes;
    try {
      const partnerDetails = await PartnerSpecificBatches.query();
      const recurringIds = [];
      const doubtClassIds = [];
      partnerDetails.forEach((c) => {
        if (c.class_id !== null) {
          if (doubtClassIds.indexOf(c.class_id) < 0) {
            doubtClassIds.push(c.class_id);
          }
        }
        if (c.recurring_id !== null) {
          if (recurringIds.indexOf(c.recurring_id) < 0) {
            recurringIds.push(c.recurring_id);
          }
        }
      });
      if (scope.indexOf('admin') > -1) {
        classes = await Classes.query()
          .skipUndefined()
          .where('end_time', '>=', startDate)
          .withGraphFetched('classes_to_courses')
          .orderBy('start_time');
      } else if (partner_id !== null) {
        const classRecurringIds = await PartnerSpecificBatches.query().where(
          'partner_id',
          partner_id
        );
        const recurring_ids = [];
        const doubt_class_ids = [];
        classRecurringIds.forEach((c) => {
          if (c.class_id !== null) {
            if (doubt_class_ids.indexOf(c.class_id) < 0) {
              doubt_class_ids.push(c.class_id);
            }
          }
          if (c.recurring_id !== null) {
            if (recurring_ids.indexOf(c.recurring_id) < 0) {
              recurring_ids.push(c.recurring_id);
            }
          }
        });
        classes = await Classes.query()
          .skipUndefined()
          .where('end_time', '>=', startDate)
          .whereIn('recurring_id', recurring_ids)
          .orWhereIn('id', doubt_class_ids)
          .orderBy('start_time')
          .withGraphFetched('classes_to_courses');

        if (classes.length <= 0) {
          const recurringClasses = await Classes.query()
            .skipUndefined()
            .where('end_time', '>=', startDate)
            .whereNotNull('recurring_id')
            .whereNotIn('recurring_id', recurringIds)
            .orderBy('start_time')
            .withGraphFetched('classes_to_courses');

          const doubtClasses = await Classes.query()
            .skipUndefined()
            .where('end_time', '>=', startDate)
            .whereNull('recurring_id')
            .whereNotIn('id', doubtClassIds)
            .orderBy('start_time')
            .withGraphFetched('classes_to_courses');

          classes = [...recurringClasses, ...doubtClasses];
        }
      } else {
        const recurringClasses = await Classes.query()
          .skipUndefined()
          .where('end_time', '>=', startDate)
          .whereNotNull('recurring_id')
          .whereNotIn('recurring_id', recurringIds)
          .orderBy('start_time')
          .withGraphFetched('classes_to_courses');

        const doubtClasses = await Classes.query()
          .skipUndefined()
          .where('end_time', '>=', startDate)
          .whereNull('recurring_id')
          .whereNotIn('id', doubtClassIds)
          .orderBy('start_time')
          .withGraphFetched('classes_to_courses');

        classes = [...recurringClasses, ...doubtClasses];
      }
      // eslint-disable-next-line
      classes.forEach((c) => {
        if (c.classes_to_courses) {
          if (c.course_version === 'v2') {
            c.course_v2 = c.classes_to_courses.course_v2;
            c.pathway_v2 = c.classes_to_courses.pathway_v2;
            c.exercise_v2 = c.classes_to_courses.exercise_v2;
          } else {
            c.course_v1 = c.classes_to_courses.course_v1;
            c.pathway_v1 = c.classes_to_courses.pathway_v1;
            c.exercise_v1 = c.classes_to_courses.exercise_v1;
          }
        }
        delete c.classes_to_courses;
      });
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
      // data.push({
      //   class_id: class_.id,
      //   course_v2: class_.course_id,
      //   exercise_v2: class_.exercise_id,
      //   pathway_v2: class_.pathway_id,
      // });
      data.push({
        class_id: class_.id,
        course_v1: class_.course_id,
        exercise_v1: class_.exercise_id,
        pathway_v1: class_.pathway_id,
      });
    });
    const res = await ClassesToCourses.query().insert(data);
    return [null, res];
  }

  async createClass(newClassData, role = null) {
    const { Classes, UserRole, ClassesToCourses } = this.server.models();
    let newClass;
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
      if (classes_to_courses_data[0].pathway_v2 !== undefined) {
        await ClassesToCourses.query().insertGraph(classes_to_courses_data);
      }
      return [null, newClass];
    } catch (err) {
      // eslint-disable-next-line
      return [errorHandler(err), null];
    }
  }

  async deleteClass(classId, txn) {
    const {
      Classes,
      ClassRegistrations,
      ClassesToCourses,
      PartnerSpecificBatches,
    } = this.server.models();
    try {
      const deleteClassAndClearReg = await transaction(
        Classes,
        ClassRegistrations,
        ClassesToCourses,
        PartnerSpecificBatches,
        async (ClassesModel, ClassRegistrationsModel, ClassesToCoursesModel) => {
          try {
            await ClassRegistrationsModel.query(txn).delete().where('class_id', classId);
            await ClassesToCoursesModel.query(txn).delete().where('class_id', classId);
          } catch (err) {
            return errorHandler(err);
          }
          await PartnerSpecificBatches.query(txn).delete().where('class_id', classId);
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
        .withGraphFetched({ registrations: true, facilitator: true, parent_class: true })
        .withGraphFetched('classes_to_courses');
      if (classes.course_version === 'v2') {
        if (classes.classes_to_courses !== null) {
          classes.course_id = classes.classes_to_courses.course_v2;
          classes.pathway_id = classes.classes_to_courses.pathway_v2;
          classes.exercise_id = classes.classes_to_courses.exercise_v2;
        }
      } else {
        // eslint-disable-next-line
        if (classes.classes_to_courses !== null) {
          classes.course_id = classes.classes_to_courses.course_v1;
          classes.pathway_id = classes.classes_to_courses.pathway_v1;
          classes.exercise_id = classes.classes_to_courses.exercise_v1;
        }
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
        .orderBy('start_time')
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

  async getOldClassesByRecurringId(recurringId) {
    const { Classes } = this.server.models();
    const dateIST = UTCToISTConverter(new Date());

    let classes;
    try {
      classes = await Classes.query()
        .where('end_time', '<', dateIST)
        .where('recurring_id', recurringId)
        .orderBy('start_time')
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

  async getClassesByRecurringIdForUpdatingDetails(recurringId) {
    const { Classes } = this.server.models();
    let classes;
    try {
      classes = await Classes.query()
        .where('recurring_id', recurringId)
        .orderBy('start_time')
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
      classes = await Classes.query()
        .select('id')
        .where('recurring_id', recurringId)
        .orderBy('start_time')
        .withGraphFetched('classes_to_courses');
      classes.forEach((c) => {
        if (c.classes_to_courses !== null) {
          if (c.course_version === 'v2') {
            c.course_id = c.classes_to_courses.course_v2;
            c.pathway_id = c.classes_to_courses.pathway_v2;
            c.exercise_id = c.classes_to_courses.exercise_v2;
          } else {
            c.course_id = c.classes_to_courses.course_v1;
            c.pathway_id = c.classes_to_courses.pathway_v1;
            c.exercise_id = c.classes_to_courses.exercise_v1;
          }
        }
        delete c.classes_to_courses;
      });
      const classesId = [];
      classes.forEach((c) => {
        classesId.push(c.id);
      });
      return [null, classesId];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getRegisteredClassesIdByUserId(userId) {
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
        await Classes.query().throwIfNotFound().patchAndFetchById(id, classUpdates);
      }
      if (classes_to_courses_data) {
        const class_to_courses = (await ClassesToCourses.query().where('class_id', id))[0];
        classes_to_courses_data = JSON.parse(JSON.stringify(classes_to_courses_data));
        await ClassesToCourses.query()
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
      PartnerSpecificBatches,
    } = this.server.models();
    try {
      const deleteClassesAndClearReg = await transaction(
        Classes,
        ClassRegistrations,
        RecurringClasses,
        ClassesToCourses,
        PartnerSpecificBatches,
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
          await PartnerSpecificBatches.query(txn).delete().where('recurring_id', recurringId);
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
    const registrationClassWithGoogleStatus = registrationDetails.map((c) => ({
      ...c,
      google_registration_status: false,
    }));
    const { ClassRegistrations } = this.server.models();
    let successReg;
    try {
      successReg = await ClassRegistrations.query().insertGraph(registrationClassWithGoogleStatus);
      return [null, successReg];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  /* eslint-disable */
  /* update google_registration_status*/
  async updateGRegistrationStatusById(classId, userIds) {
    const { ClassRegistrations } = this.server.models();
    try {
      await ClassRegistrations.query()
        .update({ class_id: classId, google_registration_status: true })
        .whereIn('user_id', userIds)
        .andWhere('class_id', classId);
      // .andWhereNot('google_registration_status', null);
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  // get classes for a week
  async getClassesForXXXTime(duration) {
    const { Classes } = this.server.models();
    let classes;
    const dateIST = UTCToISTConverter(new Date());
    // const classForWeek = UTCToISTConverter(new Date(new Date().setDate(new Date().getDate() + 7)));
    try {
      classes = await Classes.query()
        .where('end_time', '>', dateIST)
        .andWhere('start_time', '<', duration)
        .orderBy('start_time')
        .withGraphFetched({ registrations: true, facilitator: true, parent_class: true })
        // Another way to do this could be only fetch graph by matching user id
        .modifyGraph('registrations', (builder) =>
          builder.select('class_id', 'user_id', 'google_registration_status')
        );
      return [null, classes];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  // get classes for a week
  async getAllPartnerClasses(duration, scope, partner_id) {
    const { Classes, PartnerSpecificBatches } = this.server.models();
    let classes;
    const dateIST = UTCToISTConverter(new Date());
    // const classForWeek = UTCToISTConverter(new Date(new Date().setDate(new Date().getDate() + 7)));
    try {
      const partnerDetails = await PartnerSpecificBatches.query();
      const recurringIds = [];
      const doubtClassIds = [];
      partnerDetails.forEach((c) => {
        if (c.class_id !== null) {
          if (doubtClassIds.indexOf(c.class_id) < 0) {
            doubtClassIds.push(c.class_id);
          }
        }
        if (c.recurring_id !== null) {
          if (recurringIds.indexOf(c.recurring_id) < 0) {
            recurringIds.push(c.recurring_id);
          }
        }
      });

      if (scope.indexOf('admin') > -1) {
        classes = await Classes.query()
          .where('end_time', '>', dateIST)
          .andWhere('end_time', '<', duration)
          .orderBy('start_time')
          .withGraphFetched({
            registrations: true,
            facilitator: true,
            parent_class: true,
            classes_to_courses: true,
          })
          .modifyGraph('registrations', (builder) =>
            builder.select('class_id', 'user_id', 'google_registration_status')
          );
      } else if (partner_id !== null) {
        const classRecurringIds = await PartnerSpecificBatches.query().where(
          'partner_id',
          partner_id
        );
        const recurring_ids = [];
        const doubt_class_ids = [];
        classRecurringIds.forEach((c) => {
          if (c.class_id !== null) {
            if (doubt_class_ids.indexOf(c.class_id) < 0) {
              doubt_class_ids.push(c.class_id);
            }
          }
          if (c.recurring_id !== null) {
            if (recurring_ids.indexOf(c.recurring_id) < 0) {
              recurring_ids.push(c.recurring_id);
            }
          }
        });

        classes = await Classes.query()
          .where('end_time', '>', dateIST)
          .andWhere('end_time', '<', duration)
          .whereIn('recurring_id', recurring_ids)
          .orWhereIn('id', doubt_class_ids)
          .orderBy('start_time')
          .withGraphFetched({
            registrations: true,
            facilitator: true,
            parent_class: true,
            classes_to_courses: true,
          })
          .modifyGraph('registrations', (builder) =>
            builder.select('class_id', 'user_id', 'google_registration_status')
          );

        if (classes.length <= 0) {
          const recurringClasses = await Classes.query()
            .where('end_time', '>', dateIST)
            .andWhere('end_time', '<', duration)
            .whereNotNull('recurring_id')
            .whereNotIn('recurring_id', recurringIds)
            .orderBy('start_time')
            .withGraphFetched({
              registrations: true,
              facilitator: true,
              parent_class: true,
              classes_to_courses: true,
            })
            .modifyGraph('registrations', (builder) =>
              builder.select('class_id', 'user_id', 'google_registration_status')
            );

          const doubtClasses = await Classes.query()
            .where('end_time', '>', dateIST)
            .andWhere('end_time', '<', duration)
            .whereNull('recurring_id')
            .whereNotIn('id', doubtClassIds)
            .orderBy('start_time')
            .withGraphFetched({
              registrations: true,
              facilitator: true,
              parent_class: true,
              classes_to_courses: true,
            })
            .modifyGraph('registrations', (builder) =>
              builder.select('class_id', 'user_id', 'google_registration_status')
            );

          classes = [...recurringClasses, ...doubtClasses];
        }
      } else {
        const recurringClasses = await Classes.query()
          .where('end_time', '>', dateIST)
          .andWhere('end_time', '<', duration)
          .whereNotNull('recurring_id')
          .whereNotIn('recurring_id', recurringIds)
          .orderBy('start_time')
          .withGraphFetched({
            registrations: true,
            facilitator: true,
            parent_class: true,
            classes_to_courses: true,
          })
          .modifyGraph('registrations', (builder) =>
            builder.select('class_id', 'user_id', 'google_registration_status')
          );

        const doubtClasses = await Classes.query()
          .where('end_time', '>', dateIST)
          .andWhere('end_time', '<', duration)
          .whereNull('recurring_id')
          .whereNotIn('id', doubtClassIds)
          .orderBy('start_time')
          .withGraphFetched({
            registrations: true,
            facilitator: true,
            parent_class: true,
            classes_to_courses: true,
          })
          .modifyGraph('registrations', (builder) =>
            builder.select('class_id', 'user_id', 'google_registration_status')
          );

        classes = [...recurringClasses, ...doubtClasses];
      }
      classes.forEach((c) => {
        if (c.classes_to_courses) {
          if (c.course_version === 'v2') {
            c.course_v2 = c.classes_to_courses.course_v2;
            c.pathway_v2 = c.classes_to_courses.pathway_v2;
            c.exercise_v2 = c.classes_to_courses.exercise_v2;
          } else {
            c.course_v1 = c.classes_to_courses.course_v1;
            c.pathway_v1 = c.classes_to_courses.pathway_v1;
            c.exercise_v1 = c.classes_to_courses.exercise_v1;
          }
        }
        delete c.classes_to_courses;
      });
      return [null, classes];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async removeRegistrationById(classIds, userId, txn) {
    const { ClassRegistrations } = this.server.models();
    let google_registration_status;
    try {
      google_registration_status = await ClassRegistrations.query(txn).whereIn(
        'class_id',
        classIds
      );
      /* eslint-disable */
      const filteredClass = google_registration_status.filter((c) => c.user_id == userId);
      const result = filteredClass.some((c) => c.google_registration_status === true);
      await ClassRegistrations.query(txn)
        .delete()
        .whereIn('class_id', classIds)
        .andWhere('user_id', userId);
      /* eslint-disable */
      return [null, { success: true, google_registration_status: result }];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getClasses(scope, partner_id) {
    const { Classes, PartnerSpecificBatches } = this.server.models();
    let classes;
    const dateIST = UTCToISTConverter(new Date());
    try {
      const partnerDetails = await PartnerSpecificBatches.query();
      const recurringIds = [];
      const doubtClassIds = [];
      partnerDetails.forEach((c) => {
        if (c.class_id !== null) {
          if (doubtClassIds.indexOf(c.class_id) < 0) {
            doubtClassIds.push(c.class_id);
          }
        }
        if (c.recurring_id !== null) {
          if (recurringIds.indexOf(c.recurring_id) < 0) {
            recurringIds.push(c.recurring_id);
          }
        }
      });
      if (scope.indexOf('admin') > -1) {
        classes = await Classes.query()
          .where('end_time', '>', dateIST)
          .orderBy('start_time')
          .withGraphFetched({
            registrations: true,
            facilitator: true,
            parent_class: true,
            classes_to_courses: true,
          })
          // Another way to do this could be only fetch graph by matching user id
          .modifyGraph('registrations', (builder) => builder.select('user_id'));
      } else if (partner_id !== null) {
        const classRecurringIds = await PartnerSpecificBatches.query().where(
          'partner_id',
          partner_id
        );
        const recurring_ids = [];
        const doubt_class_ids = [];
        classRecurringIds.forEach((c) => {
          if (c.class_id !== null) {
            if (doubt_class_ids.indexOf(c.class_id) < 0) {
              doubt_class_ids.push(c.class_id);
            }
          }
          if (c.recurring_id !== null) {
            if (recurring_ids.indexOf(c.recurring_id) < 0) {
              recurring_ids.push(c.recurring_id);
            }
          }
        });
        classes = await Classes.query()
          .where('end_time', '>', dateIST)
          .whereIn('recurring_id', recurring_ids)
          .orWhereIn('id', doubt_class_ids)
          .orderBy('start_time')
          .withGraphFetched({
            registrations: true,
            facilitator: true,
            parent_class: true,
            classes_to_courses: true,
          })
          .modifyGraph('registrations', (builder) => builder.select('user_id'));
        if (classes.length <= 0) {
          const recurringClasses = await Classes.query()
            .where('end_time', '>', dateIST)
            .whereNotNull('recurring_id')
            .whereNotIn('recurring_id', recurringIds)
            .orderBy('start_time')
            .withGraphFetched({
              registrations: true,
              facilitator: true,
              parent_class: true,
              classes_to_courses: true,
            })
            .modifyGraph('registrations', (builder) => builder.select('user_id'));
          const doubtClasses = await Classes.query()
            .where('end_time', '>', dateIST)
            .whereNull('recurring_id')
            .whereNotIn('id', doubtClassIds)
            .orderBy('start_time')
            .withGraphFetched({
              registrations: true,
              facilitator: true,
              parent_class: true,
              classes_to_courses: true,
            })
            .modifyGraph('registrations', (builder) => builder.select('user_id'));

          classes = [...recurringClasses, ...doubtClasses];
        }
      } else {
        const recurringClasses = await Classes.query()
          .where('end_time', '>', dateIST)
          .whereNotNull('recurring_id')
          .whereNotIn('recurring_id', recurringIds)
          .orderBy('start_time')
          .withGraphFetched({
            registrations: true,
            facilitator: true,
            parent_class: true,
            classes_to_courses: true,
          })
          .modifyGraph('registrations', (builder) => builder.select('user_id'));

        const doubtClasses = await Classes.query()
          .where('end_time', '>', dateIST)
          .whereNull('recurring_id')
          .whereNotIn('id', doubtClassIds)
          .orderBy('start_time')
          .withGraphFetched({
            registrations: true,
            facilitator: true,
            parent_class: true,
            classes_to_courses: true,
          })
          .modifyGraph('registrations', (builder) => builder.select('user_id'));

        classes = [...recurringClasses, ...doubtClasses];
      }
      // eslint-disable-next-line
      classes.forEach((c) => {
        if (c.classes_to_courses) {
          if (c.course_version === 'v2') {
            c.course_v2 = c.classes_to_courses.course_v2;
            c.pathway_v2 = c.classes_to_courses.pathway_v2;
            c.exercise_v2 = c.classes_to_courses.exercise_v2;
          } else {
            c.course_v1 = c.classes_to_courses.course_v1;
            c.pathway_v1 = c.classes_to_courses.pathway_v1;
            c.exercise_v1 = c.classes_to_courses.exercise_v1;
          }
        }
        delete c.classes_to_courses;
      });
      return [null, classes];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getClassesForWeek() {
    const { Classes } = this.server.models();
    let classes;
    const dateIST = UTCToISTConverter(new Date());
    const classForWeek = UTCToISTConverter(new Date(new Date().setDate(new Date().getDate() + 7)));
    try {
      classes = await Classes.query()
        .where('end_time', '>', dateIST)
        .andWhere('start_time', '<', classForWeek)
        .orderBy('start_time')
        .withGraphFetched({ registrations: true, facilitator: true, parent_class: true })
        // Another way to do this could be only fetch graph by matching user id
        .modifyGraph('registrations', (builder) => builder.select('user_id'));
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

  async getClassByExercise(exercise_id) {
    const { Classes, ClassesToCourses } = this.server.models();
    const dateIST = UTCToISTConverter(new Date());
    try {
      const class_ids = await ClassesToCourses.query()
        .where('exercise_v2', exercise_id)
        .select('class_id');
      const ids = [];
      class_ids.forEach((c) => {
        ids.push(c.class_id);
      });
      const classes = await Classes.query()
        .whereIn('id', ids)
        .andWhere('end_time', '>', dateIST)
        .whereNull('recurring_id');
      return [null, classes];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getcohortClassByExercise(exercise_id, userDetails) {
    const { Classes, ClassesToCourses, PartnerSpecificBatches } = this.server.models();
    const dateIST = UTCToISTConverter(new Date());

    const partnerDetails = await PartnerSpecificBatches.query();
    const allRecurringIdInPartners = [];

    partnerDetails.forEach((c) => {
      if (c.recurring_id !== null) {
        if (allRecurringIdInPartners.indexOf(c.recurring_id) < 0) {
          allRecurringIdInPartners.push(c.recurring_id);
        }
      }
    });

    const classes_id = await ClassesToCourses.query()
      .where('exercise_v2', exercise_id)
      .select('class_id as id');

    const ids = [];
    classes_id.forEach((class_id) => {
      ids.push(class_id.id);
    });
    let classes;
    if (userDetails === undefined || userDetails === null) {
      classes = await Classes.query()
        .select('recurring_id')
        .whereIn('id', ids)
        .where('end_time', '>', dateIST)
        .whereNotNull('recurring_id');
    } else {
      let scope = userDetails.scope;
      let partner_id = userDetails.partner_id;
      if (scope.indexOf('admin') > -1) {
        classes = await Classes.query()
          .select('recurring_id')
          .whereIn('id', ids)
          .where('end_time', '>', dateIST)
          .whereNotNull('recurring_id');
      } else if (partner_id !== null) {
        const classRecurringIds = await PartnerSpecificBatches.query().where(
          'partner_id',
          partner_id
        );
        const recurring_ids = [];
        const doubt_class_ids = [];
        classRecurringIds.forEach((c) => {
          if (c.class_id !== null) {
            if (doubt_class_ids.indexOf(c.class_id) < 0) {
              doubt_class_ids.push(c.class_id);
            }
          }
          if (c.recurring_id !== null) {
            if (recurring_ids.indexOf(c.recurring_id) < 0) {
              recurring_ids.push(c.recurring_id);
            }
          }
        });

        classes = await Classes.query()
          .select('recurring_id')
          .whereIn('id', ids)
          .whereIn('recurring_id', recurring_ids)
          .where('end_time', '>', dateIST)
          .whereNotNull('recurring_id')
          .orderBy('start_time');

        if (classes.length <= 0) {
          classes = await Classes.query()
            .select('recurring_id')
            .whereIn('id', ids)
            .where('end_time', '>', dateIST)
            .whereNotNull('recurring_id')
            .whereNotIn('recurring_id', allRecurringIdInPartners)
            .orderBy('start_time');
        }
      } else {
        classes = await Classes.query()
          .select('recurring_id')
          .whereIn('id', ids)
          .where('end_time', '>', dateIST)
          .whereNotNull('recurring_id')
          .whereNotIn('recurring_id', allRecurringIdInPartners)
          .orderBy('start_time');
      }
    }

    const recurringIds = [];
    classes.forEach((cl) => {
      if (recurringIds.indexOf(cl.recurring_id) < 0) {
        recurringIds.push(cl.recurring_id);
      }
    });
    let classDetails = [];
    for (const key in recurringIds) {
      let recurring_classes = await Classes.query()
        .where('recurring_id', recurringIds[key])
        .orderBy('start_time');

      const currentDate = `${dateIST.toISOString().replace('Z', '')}+05:30`;
      if (recurring_classes[0].start_time > currentDate) {
        classDetails.push(...recurring_classes);
      }
    }
    return classDetails;
  }

  async getIfStudentEnrolled(id, pathwayId) {
    try {
      let FinalResult = 'not_enrolled';
      let classRecurringId = null;
      const [
        errWhileFetchingByUserId,
        classesRegisteredByUser,
      ] = await this.getRegisteredClassesIdByUserId(id);
      if (classesRegisteredByUser != null) {
        let i = 0;
        while (i < classesRegisteredByUser.length) {
          let result = true;
          // eslint-disable-next-line
          const [errWhileFetching, classDetails] = await this.getClassById(
            classesRegisteredByUser[i]
          );
          if (classDetails != null) {
            if (classDetails.recurring_id) {
              // eslint-disable-next-line
              const [errInFetching, allRecurringClasses] = await this.getClassesIdByRecurringId(
                classDetails.recurring_id
              );
              result = allRecurringClasses.every((ClassRegisteredId) => {
                const classIndex = classesRegisteredByUser.indexOf(ClassRegisteredId);
                return classIndex > -1;
              });
              allRecurringClasses.forEach((v) => {
                const classIndex = classesRegisteredByUser.indexOf(v);
                if (classIndex > -1) {
                  classesRegisteredByUser.splice(classIndex, 1);
                }
              });
              if (result) {
                // eslint-disable-next-line
                const [errWhileFetchingClassDetails, singleClassDetails] = await this.getClassById(
                  allRecurringClasses[allRecurringClasses.length - 1]
                );
                if (
                  singleClassDetails.pathway_id != null &&
                  singleClassDetails.pathway_id === pathwayId
                ) {
                  const lastDate = new Date(singleClassDetails.start_time);
                  const currDate = new Date();
                  if (lastDate > currDate) {
                    FinalResult = 'enrolled';
                    classRecurringId = singleClassDetails.recurring_id;
                    return { message: FinalResult, recurring_id: classRecurringId };
                    // eslint-disable-next-line
                  } else {
                    classRecurringId = singleClassDetails.recurring_id;
                    FinalResult = `enrolled_but_finished`;
                  }
                }
              }
            } else {
              i += 1;
            }
          } else {
            i += 1;
          }
        }
      }
      return { message: FinalResult, recurring_id: classRecurringId };
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getClassesByPathwaysId(duration, pathwayId, scope, partner_id) {
    const { Classes, ClassesToCourses, PartnerSpecificBatches } = this.server.models();
    const dateIST = UTCToISTConverter(new Date());
    let classes;
    try {
      const partnerDetails = await PartnerSpecificBatches.query();
      const allRecurringIdInPartners = [];

      partnerDetails.forEach((c) => {
        if (c.recurring_id !== null) {
          if (allRecurringIdInPartners.indexOf(c.recurring_id) < 0) {
            allRecurringIdInPartners.push(c.recurring_id);
          }
        }
      });

      const classes_id = await ClassesToCourses.query().where('pathway_v2', pathwayId);
      const ids = [];
      classes_id.forEach((cl) => {
        ids.push(cl.class_id);
      });
      if (scope.indexOf('admin') > -1) {
        classes = await Classes.query()
          .select('recurring_id')
          .whereIn('id', ids)
          .where('end_time', '>', dateIST)
          .andWhere('end_time', '<', duration)
          .whereNotNull('recurring_id');
      } else if (partner_id !== null) {
        const classRecurringIds = await PartnerSpecificBatches.query().where(
          'partner_id',
          partner_id
        );
        const recurring_ids = [];
        const doubt_class_ids = [];
        classRecurringIds.forEach((c) => {
          if (c.class_id !== null) {
            if (doubt_class_ids.indexOf(c.class_id) < 0) {
              doubt_class_ids.push(c.class_id);
            }
          }
          if (c.recurring_id !== null) {
            if (recurring_ids.indexOf(c.recurring_id) < 0) {
              recurring_ids.push(c.recurring_id);
            }
          }
        });

        classes = await Classes.query()
          .select('recurring_id')
          .whereIn('id', ids)
          .whereIn('recurring_id', recurring_ids)
          .where('end_time', '>', dateIST)
          .andWhere('end_time', '<', duration)
          .whereNotNull('recurring_id')
          .orderBy('start_time');

        if (classes.length <= 0) {
          classes = await Classes.query()
            .select('recurring_id')
            .whereIn('id', ids)
            .where('end_time', '>', dateIST)
            .whereNotNull('recurring_id')
            .andWhere('end_time', '<', duration)
            .whereNotIn('recurring_id', allRecurringIdInPartners)
            .orderBy('start_time');
        }
      } else {
        classes = await Classes.query()
          .select('recurring_id')
          .whereIn('id', ids)
          .where('end_time', '>', dateIST)
          .whereNotNull('recurring_id')
          .andWhere('end_time', '<', duration)
          .whereNotIn('recurring_id', allRecurringIdInPartners)
          .orderBy('start_time');
      }
      const recurringIds = [];
      classes.forEach((cl) => {
        if (recurringIds.indexOf(cl.recurring_id) < 0) {
          recurringIds.push(cl.recurring_id);
        }
      });
      const classDetails = [];
      for (const key in recurringIds) {
        let recurring_classes = await Classes.query()
          .where('recurring_id', recurringIds[key])
          .andWhere('end_time', '<', duration)
          .orderBy('start_time')
          .withGraphFetched({ registrations: true, facilitator: true, parent_class: true })
          .modifyGraph('registrations', (builder) => builder.select('user_id'));

        const currentDate = `${dateIST.toISOString().replace('Z', '')}+05:30`;
        if (recurring_classes[0].end_time > currentDate) {
          classDetails.push(recurring_classes[0]);
        }
      }
      return [null, classDetails];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getClassesIdByRecurringIdAndExerciseId(recurringId, exerciseId, enrolled) {
    const { Classes, ClassesToCourses } = this.server.models();
    try {
      const class_ids = await ClassesToCourses.query()
        .where('exercise_v2', exerciseId)
        .select('class_id as id');
      const ids = [];
      class_ids.forEach((class_) => {
        ids.push(class_.id);
      });
      let is_enrolled = false;
      if (enrolled !== null && enrolled !== undefined) {
        if (enrolled.recurring_id !== null && enrolled.recurring_id !== undefined) {
          is_enrolled = true;
        }
      }
      const classes = await Classes.query()
        .whereIn('id', ids)
        .andWhere('recurring_id', recurringId)
        .withGraphFetched('classes_to_courses');

      // eslint-disable-next-line
      classes.forEach((c) => {
        if (c.classes_to_courses) {
          if (c.course_version === 'v2') {
            c.course_id = c.classes_to_courses.course_v2;
            c.pathway_id = c.classes_to_courses.pathway_v2;
            c.exercise_id = c.classes_to_courses.exercise_v2;
          } else {
            c.course_id = c.classes_to_courses.course_v1;
            c.pathway_id = c.classes_to_courses.pathway_v1;
            c.exercise_id = c.classes_to_courses.exercise_v1;
          }
        }
        delete c.classes_to_courses;
        c.is_enrolled = is_enrolled;
      });
      return [null, classes];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getClassByIdForRevision(classId) {
    const { Classes } = this.server.models();
    const dateIST = UTCToISTConverter(new Date());
    const classes = await Classes.query().findById(classId);
    if (classes !== undefined && classes !== null) {
      let revClasses;
      try {
        revClasses = await Classes.query()
          .throwIfNotFound()
          .findById(classId)
          .where('end_time', '<', dateIST);
        return [null, revClasses];
      } catch (err) {
        return [
          {
            error: true,
            message: 'class has not completed',
            type: 'not completed',
            data: [],
            code: 404,
          },
          null,
        ];
      }
    } else {
      return [
        {
          error: true,
          message: 'ClassId Is Wrong Error',
          type: 'NotFound',
          data: [],
          code: 404,
        },
        null,
      ];
    }
  }

  async getClassBySubtitle(id, sub_title, classRecurringId) {
    const { Classes, PartnerSpecificBatches } = this.server.models();
    const dateIST = UTCToISTConverter(new Date());
    let classes;

    try {
      const partner = await PartnerSpecificBatches.query().where('recurring_id', classRecurringId);
      const partnerIds = [];
      partner.forEach((c) => {
        if (c.partner_id !== null) {
          if (partnerIds.indexOf(c.partner_id) < 0) {
            partnerIds.push(c.partner_id);
          }
        }
      });

      const partnerDetails = await PartnerSpecificBatches.query();
      const allRecurringIdInPartners = [];

      partnerDetails.forEach((c) => {
        if (c.recurring_id !== null) {
          if (allRecurringIdInPartners.indexOf(c.recurring_id) < 0) {
            allRecurringIdInPartners.push(c.recurring_id);
          }
        }
      });
      if (partnerIds.length > 0) {
        const classRecurringIds = await PartnerSpecificBatches.query().whereIn(
          'partner_id',
          partnerIds
        );
        const recurring_ids = [];
        const doubt_class_ids = [];
        classRecurringIds.forEach((c) => {
          if (c.class_id !== null) {
            if (doubt_class_ids.indexOf(c.class_id) < 0) {
              doubt_class_ids.push(c.class_id);
            }
          }
          if (c.recurring_id !== null) {
            if (recurring_ids.indexOf(c.recurring_id) < 0) {
              recurring_ids.push(c.recurring_id);
            }
          }
        });

        classes = await Classes.query()
          // .throwIfNotFound()
          .where('sub_title', sub_title)
          .andWhere('end_time', '>', dateIST)
          .whereIn('recurring_id', recurring_ids)
          .whereNot('id', id)
          .whereNotNull('recurring_id')
          .orderBy('start_time')
          .withGraphFetched({
            registrations: true,
            facilitator: true,
            parent_class: true,
            classes_to_courses: true,
          })
          .modifyGraph('registrations', (builder) => builder.select('user_id'));

        if (classes.length <= 0) {
          classes = await Classes.query()
            .throwIfNotFound()
            .where('sub_title', sub_title)
            .andWhere('end_time', '>', dateIST)
            .whereNot('id', id)
            .whereNotIn('recurring_id', allRecurringIdInPartners)
            .whereNotNull('recurring_id')
            .orderBy('start_time')
            .withGraphFetched({
              registrations: true,
              facilitator: true,
              parent_class: true,
              classes_to_courses: true,
            })
            .modifyGraph('registrations', (builder) => builder.select('user_id'));
        }
      } else {
        classes = await Classes.query()
          // .throwIfNotFound()
          .where('sub_title', sub_title)
          .andWhere('end_time', '>', dateIST)
          .whereNot('id', id)
          .whereNotIn('recurring_id', allRecurringIdInPartners)
          .whereNotNull('recurring_id')
          .orderBy('start_time')
          .withGraphFetched({
            registrations: true,
            facilitator: true,
            parent_class: true,
            classes_to_courses: true,
          })
          .modifyGraph('registrations', (builder) => builder.select('user_id'));
      }
      classes.forEach((c) => {
        if (c.classes_to_courses) {
          if (c.course_version === 'v2') {
            c.course_v2 = c.classes_to_courses.course_v2;
            c.pathway_v2 = c.classes_to_courses.pathway_v2;
            c.exercise_v2 = c.classes_to_courses.exercise_v2;
          } else {
            c.course_v1 = c.classes_to_courses.course_v1;
            c.pathway_v1 = c.classes_to_courses.pathway_v1;
            c.exercise_v1 = c.classes_to_courses.exercise_v1;
          }
        }
        delete c.classes_to_courses;
      });
      return [null, classes];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getFixedClasses(classDetail, credential) {
    const { ClassRegistrations } = this.server.models();
    let class_reg;
    try {
      if (credential !== null) {
        class_reg = await ClassRegistrations.query()
          .where('class_id', classDetail.id)
          .andWhere('user_id', credential.id);
        if (class_reg.length > 0 && class_reg !== null) {
          classDetail.is_enrolled = true;
        } else {
          classDetail.is_enrolled = false;
        }
      } else {
        classDetail.is_enrolled = false;
      }
      return classDetail;
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  // eslint-disable-next-line
  async getBannerClassByclassDetails(classDetail) {
    const classContent = {};
    classContent.component = 'banner';
    classContent.title = 'doubt class';
    classContent.value = 'doubt class';
    classContent.actions = [];
    const actionData = {};
    actionData.url = `https://merakilearn.org/class/${classDetail.id}`;
    actionData.label = 'doubt class';
    actionData.data = JSON.stringify(classDetail);
    actionData.variant = 'secondary';
    classContent.actions.push(actionData);
    return classContent;
  }

  async getEnrolledRevisionClassesByPathwaysId(id, recurring_id, pathwayId) {
    const { Classes } = this.server.models();
    const dateIST = UTCToISTConverter(new Date());
    try {
      const [
        errWhileFetchingByUserId,
        classesRegisteredByUser,
      ] = await this.getRegisteredClassesIdByUserId(id);
      const revision_class = [];
      if (classesRegisteredByUser != null) {
        const classes = await Classes.query()
          .whereIn('id', classesRegisteredByUser)
          .where('end_time', '>', dateIST)
          .whereNot('recurring_id', recurring_id)
          .whereNotNull('recurring_id')
          .orderBy('start_time')
          .withGraphFetched({ registrations: true, facilitator: true, parent_class: true })
          .withGraphFetched('classes_to_courses');
        classes.forEach((c) => {
          c.type = 'revision';
          if (c.classes_to_courses) {
            if (c.course_version === 'v2') {
              c.course_id = c.classes_to_courses.course_v2;
              c.pathway_id = c.classes_to_courses.pathway_v2;
              c.exercise_id = c.classes_to_courses.exercise_v2;
            } else {
              c.course_id = c.classes_to_courses.course_v2;
              c.pathway_id = c.classes_to_courses.pathway_v2;
              c.exercise_id = c.classes_to_courses.exercise_v2;
            }
          }
          delete c.classes_to_courses;
        });
        classes.forEach((c) => {
          if (c.pathway_id === pathwayId) {
            revision_class.push(c);
          }
        });
      }
      return [null, revision_class];
    } catch (err) {
      return [
        {
          error: true,
          message: 'Not enrolled in any revision class',
          type: 'NotFound',
          data: [],
          code: 404,
        },
        null,
      ];
    }
  }

  async getEnrolledClasseByRecurringId(recurringId) {
    const { Classes, Courses, CoursesV2, Exercises, ExercisesV2 } = this.server.models();
    const dateIST = UTCToISTConverter(new Date());

    let classes;
    try {
      classes = await Classes.query()
        .throwIfNotFound()
        .where('recurring_id', recurringId)
        .where('end_time', '>', dateIST)
        .orderBy('start_time')
        .withGraphFetched({ registrations: true, facilitator: true, parent_class: true })
        .withGraphFetched('classes_to_courses');
      classes.forEach((c) => {
        if (c.classes_to_courses) {
          if (c.course_version === 'v2') {
            c.course_id = c.classes_to_courses.course_v2;
            c.pathway_id = c.classes_to_courses.pathway_v2;
            c.exercise_id = c.classes_to_courses.exercise_v2;
          } else {
            c.course_id = c.classes_to_courses.course_v2;
            c.pathway_id = c.classes_to_courses.pathway_v2;
            c.exercise_id = c.classes_to_courses.exercise_v2;
          }
        }
        delete c.classes_to_courses;
      });
      return [null, classes];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getDoubtClassByPathwayId(id, pathway_id) {
    const { Classes, ClassesToCourses } = this.server.models();
    const dateIST = UTCToISTConverter(new Date());
    try {
      const [
        errWhileFetchingByUserId,
        classesRegisteredByUser,
      ] = await this.getRegisteredClassesIdByUserId(id);
      let classes;
      if (classesRegisteredByUser != null) {
        const class_ids = await ClassesToCourses.query()
          .where('pathway_v2', pathway_id)
          .whereIn('class_id', classesRegisteredByUser)
          .select('class_id');
        const ids = [];
        class_ids.forEach((c) => {
          ids.push(c.class_id);
        });
        classes = await Classes.query()
          .whereIn('id', ids)
          .whereNull('recurring_id')
          .where('end_time', '>', dateIST)
          .orderBy('start_time')
          .withGraphFetched({ registrations: true, facilitator: true, parent_class: true })
          .withGraphFetched('classes_to_courses');
        classes.forEach((c) => {
          if (c.classes_to_courses) {
            if (c.course_version === 'v2') {
              c.course_id = c.classes_to_courses.course_v2;
              c.pathway_id = c.classes_to_courses.pathway_v2;
              c.exercise_id = c.classes_to_courses.exercise_v2;
            } else {
              c.course_id = c.classes_to_courses.course_v2;
              c.pathway_id = c.classes_to_courses.pathway_v2;
              c.exercise_id = c.classes_to_courses.exercise_v2;
            }
          }
          delete c.classes_to_courses;
        });
        return [null, classes];
      }
      return [null, classes];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getEnrolledRevisionClassParentId(classDetail, recurring_id) {
    const { Classes } = this.server.models();
    const dateIST = UTCToISTConverter(new Date());
    try {
      const classes = await Classes.query()
        .where('recurring_id', recurring_id)
        .andWhere('sub_title', classDetail.sub_title)
        .andWhere('end_time', '<', dateIST);
      return [null, classes];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  // patch v2 course_id, pathway_id and exercise_id
  async patchV2IdsInClassesToCourses(enrolledClasses) {
    const { ClassesToCourses } = this.server.models();
    let patchExerId;
    try {
      for (var i of enrolledClasses) {
        patchExerId = await ClassesToCourses.query()
          .update({ pathway_v2: i.pathway_id, course_v2: i.course_id, exercise_v2: i.exercise_id })
          .where('class_id', i.id);
      }
      return;
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getOldClassesRecurringId() {
    const { Classes } = this.server.models();
    const { pathwayService } = this.server.services();

    const dateIST = UTCToISTConverter(new Date());
    let classes;
    try {
      classes = await Classes.query()
        .where('end_time', '<', dateIST)
        .orderBy('start_time')
        .whereNotNull('recurring_id')
        .andWhere('course_version', 'v1')
        .withGraphFetched('classes_to_courses');

      classes.forEach((c) => {
        if (c.classes_to_courses) {
          if (c.course_version === 'v2') {
            c.course_id = c.classes_to_courses.course_v2;
            c.pathway_id = c.classes_to_courses.pathway_v2;
            c.exercise_id = c.classes_to_courses.exercise_v2;
          } else {
            c.course_id = c.classes_to_courses.course_v1;
            c.pathway_id = c.classes_to_courses.pathway_v1;
            c.exercise_id = c.classes_to_courses.exercise_v1;
          }
        }
        delete c.classes_to_courses;
      });
      const recurringIds = [];
      for (const i in classes) {
        if (classes[i].pathway_id !== null) {
          const [errInPathwayIdDetails, getPathwayIdDetails] = await pathwayService.findById(
            classes[i].pathway_id
          );
          if (getPathwayIdDetails !== null && getPathwayIdDetails !== undefined) {
            if (getPathwayIdDetails.code === 'PRGPYT') {
              if (recurringIds.indexOf(classes[i].recurring_id) < 0) {
                recurringIds.push(classes[i].recurring_id);
              }
            }
          }
        }
      }
      return [null, recurringIds];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async partnerSpecificClass(class_id, recurringId, partnerId) {
    const { PartnerSpecificBatches } = this.server.models();
    let recurringClassEntry;
    try {
      const details = {};
      if (class_id === null) {
        details.recurring_id = recurringId;
        details.partner_id = partnerId;
      } else {
        details.class_id = class_id;
        details.partner_id = partnerId;
      }
      console.log(details);
      recurringClassEntry = await PartnerSpecificBatches.query().insert(details);
      return [null, recurringClassEntry];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }
};
