const Schmervice = require('schmervice');
const Boom = require('@hapi/boom');
const _ = require('lodash');
const { transaction } = require('objection');
const moment = require('moment');
const logger = require('../../server/logger');
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
        .where('course_v3', course_id)
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
          if (c.course_version === 'v3') {
            c.course_v3 = c.classes_to_courses.course_v3;
            c.pathway_v3 = c.classes_to_courses.pathway_v3;
            c.exercise_v3 = c.classes_to_courses.exercise_v3;
          } else if (c.course_version === 'v2') {
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
      data.push({
        class_id: class_.id,
        course_v3: class_.course_id,
        exercise_v3: class_.exercise_id,
        pathway_v3: class_.pathway_id,
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
      class_.course_version = 'v3';
      classes_to_courses_data.push({
        course_v3: class_.course_id,
        slug_id: class_.slug_id,
        pathway_v3: class_.pathway_id,
      });
      delete class_.course_id;
      delete class_.slug_id;
      delete class_.pathway_id;
      delete class_.partner_id;
      delete class_.space_id;
      delete class_.group_id;
    });

    try {
      newClass = await Classes.query().insertGraph(newClassData);
      newClass.forEach((class_, i) => {
        classes_to_courses_data[i].class_id = class_.id;
      });
      // only if the class has a course_id insert in the ClassesToCourses table
      if (classes_to_courses_data[0].pathway_v3 !== undefined) {
        await ClassesToCourses.query().insertGraph(classes_to_courses_data);
      }
      return [null, newClass];
    } catch (err) {
      // eslint-disable-next-line
      return [errorHandler(err), null];
    }
  }

  async deleteClass(classId, txn) {
    const { Classes, ClassRegistrations, ClassesToCourses, PartnerSpecificBatches } =
      this.server.models();
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
    const { Classes, PartnerSpecificBatches } = this.server.models();
    let classes;
    try {
      classes = await Classes.query()
        .throwIfNotFound()
        .findById(classId)
        .withGraphFetched({ registrations: true, facilitator: true, parent_class: true })
        .withGraphFetched('classes_to_courses');

      if (classes.classes_to_courses !== null) {
        if (classes.course_version === 'v3') {
          classes.course_id = classes.classes_to_courses.course_v3;
          classes.pathway_id = classes.classes_to_courses.pathway_v3;
          // classes.slug_id = classes.classes_to_courses.slug_id;
          if (classes.classes_to_courses.exercise_v3) {
            classes.exercise_id = classes.classes_to_courses.exercise_v3;
          } else {
            classes.slug_id = classes.classes_to_courses.slug_id;
          }
        } else if (classes.course_version === 'v2') {
          classes.course_id = classes.classes_to_courses.course_v2;
          classes.pathway_id = classes.classes_to_courses.pathway_v2;
          classes.exercise_id = classes.classes_to_courses.exercise_v2;
        } else {
          // eslint-disable-next-line
          classes.course_id = classes.classes_to_courses.course_v1;
          classes.pathway_id = classes.classes_to_courses.pathway_v1;
          classes.exercise_id = classes.classes_to_courses.exercise_v1;
        }
      }
      delete classes.classes_to_courses;

      if (classes.recurring_id === null) {
        const partnerSpecificTableData = await PartnerSpecificBatches.query().where(
          'class_id',
          classes.id
        );
        if (
          partnerSpecificTableData !== null &&
          partnerSpecificTableData !== undefined &&
          partnerSpecificTableData.length > 0
        ) {
          classes.partner_id = partnerSpecificTableData[0].partner_id;
          classes.group_id = partnerSpecificTableData[0].group_id;
          classes.space_id = partnerSpecificTableData[0].space_id;
        }
        return [null, classes];
      }

      if (classes.recurring_id !== null && classes.recurring_id !== undefined) {
        const partnerSpecificBatchesData = await PartnerSpecificBatches.query().where(
          'recurring_id',
          classes.recurring_id
        );
        if (
          partnerSpecificBatchesData !== null &&
          partnerSpecificBatchesData !== undefined &&
          partnerSpecificBatchesData.length > 0
        ) {
          classes.partner_id = partnerSpecificBatchesData[0].partner_id;
          classes.group_id = partnerSpecificBatchesData[0].group_id;
          classes.space_id = partnerSpecificBatchesData[0].space_id;
        }
      }
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
          if (c.course_version === 'v3') {
            c.course_id = c.classes_to_courses.course_v3;
            c.pathway_id = c.classes_to_courses.pathway_v3;
            if (c.classes_to_courses.exercise_v3) {
              c.exercise_id = c.classes_to_courses.exercise_v3;
            } else {
              c.slug_id = c.classes_to_courses.slug_id;
            }
          } else if (c.course_version === 'v2') {
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
            : course_version === 'v2'
            ? {
                course_v2: classUpdates.course_id,
                pathway_v2: classUpdates.pathway_id,
                exercise_v2: classUpdates.exercise_id,
              }
            : {
                course_v3: classUpdates.course_id,
                pathway_v3: classUpdates.pathway_id,
                [!classUpdates.exercise_id ? 'slug_id' : 'exercise_v3']:
                  classUpdates.exercise_id || classUpdates.slug_id,
              };

        delete classUpdates.pathway_id;
        delete classUpdates.course_id;
        if (!classUpdates.slug_id) {
          delete classUpdates.slug_id;
        } else {
          delete classUpdates.exercise_id;
        }
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
      MergedClasses,
    } = this.server.models();

    try {
      const deleteClassesAndClearReg = await transaction(
        Classes,
        ClassRegistrations,
        RecurringClasses,
        ClassesToCourses,
        PartnerSpecificBatches,
        MergedClasses,
        async (
          ClassesModel,
          ClassRegistrationsModel,
          RecurringClassesModel,
          ClassesToCoursesModel,
          PartnerSpecificBatchesModel,
          MergedClassesModel
        ) => {
          try {
            // First, delete records in the partner_specific_batches table
            await PartnerSpecificBatchesModel.query(txn)
              .delete()
              .where('recurring_id', recurringId);

            // Then, proceed with the deletion of related records in other tables
            const getClassesId = await ClassesModel.query(txn)
              .select('id')
              .throwIfNotFound()
              .where('recurring_id', recurringId);
            const filterIds = _.map(getClassesId, (c) => {
              return c.id;
            });
            await ClassRegistrationsModel.query(txn).delete().whereIn('class_id', filterIds);
            await ClassesToCoursesModel.query(txn).delete().whereIn('class_id', filterIds);
            await MergedClassesModel.query(txn)
              .delete()
              .whereIn('class_id', filterIds)
              .orWhereIn('merged_class_id', filterIds);
          } catch (err) {
            return errorHandler(err);
          }

          // Finally, delete the main class and recurring class records
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
  async getAllPartnerClasses(duration, scope, partner_id, space_id, group_id) {
    const { Classes, PartnerSpecificBatches, MergedClasses } = this.server.models();
    const { userService, userRoleService } = this.server.services();
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

      const mergedClasses = await MergedClasses.query().select('merged_class_id');
      const mergeClassIds = [];
      if (mergedClasses !== null && mergedClasses !== undefined && mergedClasses.length > 0) {
        for (const c of mergedClasses) {
          mergeClassIds.push(c.merged_class_id);
        }
      }

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
            PartnerSpecificBatches: true,
          })
          .modifyGraph('registrations', (builder) =>
            builder.select('class_id', 'user_id', 'google_registration_status')
          );
      } else if (partner_id !== null) {
        let classRecurringIds;
        if (group_id !== null && group_id !== undefined) {
          classRecurringIds = await PartnerSpecificBatches.query()
            .where('partner_id', partner_id)
            .andWhere('group_id', group_id);
        } else if (space_id !== null && space_id !== undefined) {
          classRecurringIds = await PartnerSpecificBatches.query()
            .where('partner_id', partner_id)
            .andWhere('space_id', space_id);
        } else {
          classRecurringIds = await PartnerSpecificBatches.query().where('partner_id', partner_id);
        }
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
            PartnerSpecificBatches: true,
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
              PartnerSpecificBatches: true,
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
              PartnerSpecificBatches: true,
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
            PartnerSpecificBatches: true,
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
            PartnerSpecificBatches: true,
          })
          .modifyGraph('registrations', (builder) =>
            builder.select('class_id', 'user_id', 'google_registration_status')
          );

        classes = [...recurringClasses, ...doubtClasses];
      }
      for (const c of classes) {
        if (c.recurring_id !== null) {
          const [errInPartnerId, getPartnerSpecificClassId] = await this.getPartnerSpecificClass(
            null,
            c.recurring_id
          );
          c.partner_id = getPartnerSpecificClassId;
        } else {
          const [errInPartnerId, getPartnerSpecificClassId] = await this.getPartnerSpecificClass(
            c.id,
            null
          );
          c.partner_id = getPartnerSpecificClassId;
        }

        if (c.volunteer_id !== null && c.volunteer_id !== undefined) {
          const volunteers = {};
          const [errVolunteerDetails, volunteerDetails] = await userRoleService.volunteerUserById(
            c.volunteer_id
          );
          if (
            volunteerDetails !== null &&
            volunteerDetails !== undefined &&
            volunteerDetails.length > 0
          ) {
            const [errVolunteerUserDetail, volunteerUserDetail] = await userService.findById(
              volunteerDetails[0].user_id
            );
            volunteers.name = volunteerUserDetail.name;
            volunteers.email = volunteerUserDetail.email;
            c.volunteer = volunteers;
          }
        }
        if (c.classes_to_courses) {
          if (c.course_version === 'v3') {
            c.course_id = c.classes_to_courses.course_v3;

            if (c.classes_to_courses && c.classes_to_courses.pathway_v3) {
              c.pathway_id = c.classes_to_courses.pathway_v3;
            } else if (c.PartnerSpecificBatches && c.PartnerSpecificBatches.pathway_id) {
              c.pathway_id = c.PartnerSpecificBatches.pathway_id;
            } else {
              c.pathway_id = null;
            }
            // c.exercise_id = c.classes_to_courses.exercise_v3;
            if (c.classes_to_courses.exercise_v3) {
              c.exercise_id = c.classes_to_courses.exercise_v3;
              // delete c.classess_to_courses.exercise_v3;
            }else {
              c.slug_id = c.classes_to_courses.slug_id;
            }

          } else if (c.course_version === 'v2') {
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
        delete c.PartnerSpecificBatches;
      }
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
          if (c.course_version === 'v3') {
            c.course_v3 = c.classes_to_courses.course_v3;
            c.pathway_v3 = c.classes_to_courses.pathway_v3;
            c.exercise_v3 = c.classes_to_courses.exercise_v3;
          } else if (c.course_version === 'v2') {
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
        .where('exercise_v3', exercise_id)
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
      .where('exercise_v3', exercise_id)
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
    const { MergedClasses } = this.server.models();

    try {
      let FinalResult = 'not_enrolled';
      let classRecurringId = null;
      const [
        errWhileFetchingByUserId,
        classesRegisteredByUser,
      ] = await this.getRegisteredClassesIdByUserId(id);

      if (classesRegisteredByUser != null) {
        const mergedClassId = await MergedClasses.query().whereIn(
          'class_id',
          classesRegisteredByUser
        );
        if (mergedClassId !== null && mergedClassId !== undefined && mergedClassId.length > 0) {
          for (const classMergedId of mergedClassId) {
            classesRegisteredByUser.push(classMergedId.merged_class_id);
          }
        }

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

  async enrollStudentBySpaceId(classId, h) {
    const { ClassRegistrations, Classes, PartnerSpecificBatches, User } = this.server.models();
    const { displayService, userService } = this.server.services();
    try {
      const classesDetails = await Classes.query().findById(classId);
      if (
        classesDetails == null ||
        classesDetails == undefined ||
        Object.keys(classesDetails).length <= 0
      ) {
        return [null, 'classId is wrong'];
      }
      const registerStudentsData = await ClassRegistrations.query().where('class_id', classId);
      if (
        registerStudentsData !== null &&
        registerStudentsData !== undefined &&
        registerStudentsData.length > 0
      ) {
        for (const registerStudent of registerStudentsData) {
          const [errUserDetail, userDetail] = await userService.findById(registerStudent.user_id);
          if (errUserDetail) {
            logger.error(
              // eslint-disable-next-line
              `id- ${errUserDetail}: ` + JSON.stringify(errUserDetail)
            );
            return h.response(errUserDetail).code(errUserDetail.code);
          }
          const userProfileDetails = await displayService.userProfile(userDetail);
          // await this.registerClasses(classId, false, userProfileDetails, h);
          await this.unregisterClasses(classId, true, userProfileDetails, h);
        }
      }
      const recurringClassEntry = await PartnerSpecificBatches.query().where(
        'recurring_id',
        classesDetails.recurring_id
      );
      if (
        recurringClassEntry !== null &&
        recurringClassEntry !== undefined &&
        recurringClassEntry.length > 0
      ) {
        let usersDataForEnrollment;
        if (recurringClassEntry[0].space_id) {
          usersDataForEnrollment = await User.query().where(
            'space_id',
            recurringClassEntry[0].space_id
          );
        } else {
          usersDataForEnrollment = await User.query().where(
            'group_id',
            recurringClassEntry[0].group_id
          );
        }
        if (
          usersDataForEnrollment !== null &&
          usersDataForEnrollment !== undefined &&
          usersDataForEnrollment.length > 0
        ) {
          for (const studentDetails of usersDataForEnrollment) {
            const userProfileDetails = await displayService.userProfile(studentDetails);
            await this.registerClasses(classId, true, userProfileDetails, h);
          }
        }
      }
      return [null, 'success'];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getClassesByPathwaysId(pathwayId, scope, partner_id, space_id, group_id) {
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

      const classes_id = await ClassesToCourses.query().where('pathway_v3', pathwayId);
      const ids = [];
      classes_id.forEach((cl) => {
        ids.push(cl.class_id);
      });
      if (scope.indexOf('admin') > -1) {
        classes = await Classes.query()
          .select('recurring_id')
          .whereIn('id', ids)
          .where('end_time', '>', dateIST)
          .whereNotNull('recurring_id');
      } else if (partner_id !== null) {
        let classRecurringIds;
        if (group_id !== null && group_id !== undefined) {
          classRecurringIds = await PartnerSpecificBatches.query()
            .where('partner_id', partner_id)
            .andWhere('group_id', group_id);
        } else if (space_id !== null && space_id !== undefined) {
          classRecurringIds = await PartnerSpecificBatches.query()
            .where('partner_id', partner_id)
            .andWhere('space_id', space_id);
        } else {
          classRecurringIds = await PartnerSpecificBatches.query().where('partner_id', partner_id);
        }
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
          .orderBy('start_time')
          .withGraphFetched({ registrations: true, facilitator: true, parent_class: true })
          .modifyGraph('registrations', (builder) => builder.select('user_id'));
        const last_class = await Classes.query()
          .select()
          .where('recurring_id', recurringIds[key])
          .orderBy('start_time', 'desc')
          .first();

        recurring_classes[0].last_class_date = last_class.start_time;
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
        .where('exercise_v3', exerciseId)
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
          if (c.course_version === 'v3') {
            c.course_id = c.classes_to_courses.course_v3;
            c.pathway_id = c.classes_to_courses.pathway_v3;
            c.exercise_id = c.classes_to_courses.exercise_v3;
          } else if (c.course_version === 'v2') {
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
          if (c.course_version === 'v3') {
            c.course_v3 = c.classes_to_courses.course_v3;
            c.pathway_v3 = c.classes_to_courses.pathway_v3;
            c.slug_id = c.classes_to_courses.slug_id;
          } else if (c.course_version === 'v2') {
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
            if (c.course_version === 'v3') {
              c.course_id = c.classes_to_courses.course_v3;
              c.pathway_id = c.classes_to_courses.pathway_v3;
              c.exercise_id = c.classes_to_courses.exercise_v3;
            } else if (c.course_version === 'v2') {
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
    const { Classes, MergedClasses } = this.server.models();
    const dateIST = UTCToISTConverter(new Date());
    let mergeClasses = {};
    let classes;
    try {
      classes = await Classes.query()
        .throwIfNotFound()
        .where('recurring_id', recurringId)
        .where('end_time', '>', dateIST)
        .orderBy('start_time')
        .withGraphFetched({ registrations: true, facilitator: true, parent_class: true })
        .withGraphFetched('classes_to_courses')
        .withGraphFetched('merged_classes');

      for (const c in classes) {
        if (classes[c].classes_to_courses) {
          if (classes[c].course_version === 'v3') {
            classes[c].course_id = classes[c].classes_to_courses.course_v3;
            classes[c].pathway_id = classes[c].classes_to_courses.pathway_v3;
            classes[c].exercise_id = classes[c].classes_to_courses.exercise_v3;
          } else if (classes[c].course_version === 'v2') {
            classes[c].course_id = classes[c].classes_to_courses.course_v2;
            classes[c].pathway_id = classes[c].classes_to_courses.pathway_v2;
            classes[c].exercise_id = classes[c].classes_to_courses.exercise_v2;
          } else {
            classes[c].course_id = classes[c].classes_to_courses.course_v2;
            classes[c].pathway_id = classes[c].classes_to_courses.pathway_v2;
            classes[c].exercise_id = classes[c].classes_to_courses.exercise_v2;
          }
        }
        if (classes[c].merged_classes) {
          const mergedClassId = await MergedClasses.query().where('merged_class_id', classes[c].id);
          if (mergedClassId !== null && mergedClassId !== undefined && mergedClassId.length > 0) {
            for (const singleClassMerged of mergedClassId) {
              const MergedClass = await Classes.query()
                .throwIfNotFound()
                .where('id', singleClassMerged.class_id)
                .where('end_time', '>', dateIST)
                .orderBy('start_time')
                .withGraphFetched({ registrations: true, facilitator: true, parent_class: true })
                .withGraphFetched('classes_to_courses');

              if (MergedClass[0].classes_to_courses) {
                if (MergedClass[0].course_version === 'v3') {
                  MergedClass[0].course_id = MergedClass[0].classes_to_courses.course_v3;
                  MergedClass[0].pathway_id = MergedClass[0].classes_to_courses.pathway_v3;
                  MergedClass[0].exercise_id = MergedClass[0].classes_to_courses.exercise_v3;
                } else if (MergedClass[0].course_version === 'v2') {
                  MergedClass[0].course_id = MergedClass[0].classes_to_courses.course_v2;
                  MergedClass[0].pathway_id = MergedClass[0].classes_to_courses.pathway_v2;
                  MergedClass[0].exercise_id = MergedClass[0].classes_to_courses.exercise_v2;
                } else {
                  MergedClass[0].course_id = MergedClass[0].classes_to_courses.course_v2;
                  MergedClass[0].pathway_id = MergedClass[0].classes_to_courses.pathway_v2;
                  MergedClass[0].exercise_id = MergedClass[0].classes_to_courses.exercise_v2;
                }
              }
              delete MergedClass[0].classes_to_courses;
              mergeClasses = MergedClass[0];
            }
          }
        }
        delete classes[c].classes_to_courses;
        if (
          mergeClasses !== null &&
          mergeClasses !== undefined &&
          Object.keys(mergeClasses).length > 0
        ) {
          classes[c] = mergeClasses;
          mergeClasses = {};
        }
      }
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
          .where('pathway_v3', pathway_id)
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
            if (c.course_version === 'v3') {
              c.course_id = c.classes_to_courses.course_v3;
              c.pathway_id = c.classes_to_courses.pathway_v3;
              c.exercise_id = c.classes_to_courses.exercise_v3;
            } else if (c.course_version === 'v2') {
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
          .update({ pathway_v3: i.pathway_id, course_v3: i.course_id, slug_id: i.slug_id })
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
          if (c.course_version === 'v3') {
            c.course_id = c.classes_to_courses.course_v3;
            c.pathway_id = c.classes_to_courses.pathway_v3;
            c.slug_id = c.classes_to_courses.slug_id;
          } else if (c.course_version === 'v2') {
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

  async partnerSpecificClass(class_id, recurringId, partnerId, space_id, groupID, pathway_id) {
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
      details.space_id = space_id;
      details.group_id = groupID;
      details.pathway_id = pathway_id;

      recurringClassEntry = await PartnerSpecificBatches.query().insert(details);
      return [null, recurringClassEntry];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getPartnerSpecificClass(classId, recurringId) {
    const { PartnerSpecificBatches } = this.server.models();
    let recurringClassEntry;
    try {
      if (recurringId === null) {
        recurringClassEntry = await PartnerSpecificBatches.query()
          .select('partner_id')
          .where('class_id', classId);
      } else {
        recurringClassEntry = await PartnerSpecificBatches.query()
          .select('partner_id')
          .where('recurring_id', recurringId);
      }
      const ids = [];
      if (
        recurringClassEntry !== null &&
        recurringClassEntry !== undefined &&
        recurringClassEntry.length > 0
      ) {
        recurringClassEntry.forEach((c) => {
          ids.push(c.partner_id);
        });
      }
      return [null, ids];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getSpaceSpecificClass(classId, recurringId) {
    const { PartnerSpecificBatches } = this.server.models();
    let recurringClassEntry;
    try {
      if (recurringId === null) {
        recurringClassEntry = await PartnerSpecificBatches.query()
          .select('space_id')
          .where('class_id', classId);
      } else {
        recurringClassEntry = await PartnerSpecificBatches.query()
          .select('space_id')
          .where('recurring_id', recurringId);
      }
      const ids = [];
      if (
        recurringClassEntry !== null &&
        recurringClassEntry !== undefined &&
        recurringClassEntry.length > 0
      ) {
        recurringClassEntry.forEach((c) => {
          ids.push(c.space_id);
        });
      }
      return [null, ids];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async deletePartnerSpecificClass(classId) {
    const { PartnerSpecificBatches } = this.server.models();
    try {
      const recurringClassEntry = await PartnerSpecificBatches.query()
        .select('partner_id')
        .where('class_id', classId);
      if (
        recurringClassEntry !== undefined &&
        recurringClassEntry !== null &&
        recurringClassEntry.length > 0
      ) {
        await PartnerSpecificBatches.query().delete().where('class_id', classId);
      }
      return [null, 'successfull'];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async registerClasses(classId, headers, userDetails, h) {
    const { displayService, userService, calendarService } = this.server.services();
    const payload = [];
    try {
      const userId = parseInt(userDetails.id, 10);
      const [errWhileFetching, classDetails] = await this.getClassById(classId);
      if (errWhileFetching) {
        logger.error(JSON.stringify(errWhileFetching));
        return h.response(errWhileFetching).code(errWhileFetching.code);
      }
      const classesRegisteredByUser = await this.getIfStudentEnrolled(
        userId,
        classDetails.pathway_id
      );
      const userEnrolled = classesRegisteredByUser.message !== 'enrolled';
      let calendarDetails;
      if (headers && !userEnrolled && classDetails.recurring_id) {
        /* eslint-enable */
        return h
          .response({
            error: 'true',
            message: 'Already enrolled in another batch',
          })
          .code(400);
      }
      // If users want to register to all instance
      if (headers && userEnrolled && classDetails.recurring_id) {
        const [errInFetchingRecurringClasses, allRecurringClasses] =
          await this.getClassesByRecurringId(classDetails.recurring_id);
        if (errInFetchingRecurringClasses) {
          logger.error(JSON.stringify(errInFetchingRecurringClasses));
          return h.response(errInFetchingRecurringClasses).code(errInFetchingRecurringClasses.code);
        }
        const { scope } = userDetails;
        const data = await displayService.upcomingClassesWithEnrolledKey(
          allRecurringClasses,
          userId,
          scope
        );
        const [errUser, user] = await userService.getUserByEmail(userDetails.email);
        if (errUser) {
          // eslint-disable-next-line
          logger.error(
            // eslint-disable-next-line
            `line no- 253, Calendar event error, id- ${userDetails.id}: ` + JSON.stringify(errUser)
          );
        }
        // if (user[0].email !== data[0].facilitator.email && user[0].chat_id) {
        // await chatService.addUsersToMerakiClass(
        //   data[0].parent_class.cohort_room_id,
        //   `@${user[0].chat_id}:navgurukul.org`
        // );
        // await chatService.sendInitialMessageToStudent(data[0].title, user[0].id);
        // }
        calendarDetails = data;
      } else {
        // check if max-enrollment limit is being exceeded
        const [errRegistrations, registrations] = await this.getRegistrationsByClassId(
          classDetails.id
        );
        if (errRegistrations) {
          logger.error('error fetching class registrations and checking max-enrollment limit');
        } else if (
          classDetails.max_enrolment &&
          registrations[0].count >= classDetails.max_enrolment
        ) {
          throw Boom.badRequest('max-enrollment limit exceeded!!');
        }
        calendarDetails = [classDetails];
      }
      // eslint-disable-next-line
      var { start_time, end_time, ..._c } = calendarDetails[0];
      // eslint-disable-next-line
      var c = calendarDetails[0];
      // patch attendees in the calendar event
      /* eslint-disable */
      for (const c of calendarDetails) {
        // removing start_time & end_time because it is stored in UTC in DB and will update the calendar event time
        const { start_time, end_time, ..._c } = c;
        if (!c.enrolled) {
          payload.push({ user_id: userId, class_id: c.id, registered_at: new Date() });
        }
      }
      // outside of the loop
      const emailList = [];
      // letting google calendar deciding the previous attendees
      let regUsers;
      try {
        if (c.recurring_id !== null) {
          regUsers = await calendarService.getCalendarEvent(
            c.parent_class.calendar_event_id,
            classDetails.facilitator_id,
            classDetails.facilitator_email
          );
        } else {
          regUsers = await calendarService.getCalendarEvent(
            c.calendar_event_id,
            classDetails.facilitator_id,
            classDetails.facilitator_email
          );
        }
        if (regUsers.data.attendees) emailList.push(...regUsers.data.attendees);
        if (!userDetails.email.includes('@fake.com')) {
          emailList.push({ email: userDetails.email });
        }
        // await calendarService.patchCalendarEvent(_c, emailList);
      } catch (err) {
        logger.error(`id- ${userDetails.id}: Calendar event error- ` + JSON.stringify(err));
      }

      const [errWhileRegistering, registered] = await this.registerToClassById(payload);
      if (errWhileRegistering) {
        logger.error(`id- ${userDetails.id}: ` + JSON.stringify(errWhileRegistering));
        /* eslint-enable */
        return h.response(errWhileRegistering).code(errWhileRegistering.code);
      }
      // try {
      // chatService.sendClassJoinConfirmation(classDetails, userId);
      // } catch {
      // eslint-disable-next-line
      // }
      logger.info(`id- ${userDetails.id}: Registers to a specific class`);
      return [null, registered];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getStudentsEnrolledByGoogleMeet(meetLink) {
    const { Classes, ClassRegistrations } = this.server.models();
    try {
      let registerStudentsData;
      let classData;
      const date = new Date();
      const startOfDay = moment(date, 'YYYY-MM-DD').startOf('day').toDate();
      const endOfDay = moment(date, 'YYYY-MM-DD').endOf('day').toDate();
      classData = await Classes.query()
        .where('meet_link', meetLink)
        .whereBetween('start_time', [startOfDay, endOfDay]);
      if (classData.length > 0 && classData !== undefined && classData !== null) {
        registerStudentsData = await ClassRegistrations.query()
          .where('class_id', classData[0].id)
          .withGraphFetched('enrolledUsersInParticularClass');
        classData[0].classEnolledAndUsersData = registerStudentsData;
        return [null, classData];
      }
      return [null, 'No class found'];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async unregisterClasses(classId, headers, userDetails, h) {
    const { displayService, calendarService } = this.server.services();

    try {
      const userId = userDetails.id;
      const userEmail = userDetails.email;
      const classIds = [];
      const [errWhileFetching, classDetails] = await this.getClassById(classId);
      if (errWhileFetching) {
        // eslint-disable-next-line
        logger.error(`id- ${userId}: ` + JSON.stringify(errWhileFetching));
        return h.response(errWhileFetching).code(errWhileFetching.code);
      }
      let calendarDetails;
      if (headers && classDetails.recurring_id) {
        const [errInFetchingRecurringClasses, allRecurringClasses] =
          await this.getClassesByRecurringId(classDetails.recurring_id);
        if (errInFetchingRecurringClasses) {
          /* eslint-disable */
          logger.error(`id- ${userId}: ` + JSON.stringify(errInFetchingRecurringClasses));
          return h.response(errInFetchingRecurringClasses).code(errInFetchingRecurringClasses.code);
        }
        const [
          errInFetchingOldRecurringclasses,
          OldRecurringclasses,
        ] = await this.getOldClassesByRecurringId(classDetails.recurring_id);
        if (errInFetchingOldRecurringclasses) {
          logger.error(`classId- ${classId} ` + JSON.stringify(errInFetchingOldRecurringclasses));
          return h
            .response(errInFetchingOldRecurringclasses)
            .code(errInFetchingOldRecurringclasses.code);
        }
        for (const i in OldRecurringclasses) {
          if (OldRecurringclasses[i].sub_title !== null) {
            let [err, revisionClasses] = await this.getClassBySubtitle(
              classId,
              OldRecurringclasses[i].sub_title,
              OldRecurringclasses[i].partner_id
            );
            if (err) {
              // eslint-disable-next-line
              logger.error(`classId- ${classId} ` + JSON.stringify(err));
              return h.response(err).code(err.code);
            }
            for (let i in revisionClasses) {
              const revision = await this.getFixedClasses(revisionClasses[i], userId);
              if (revisionClasses[i].is_enrolled) {
                const [
                  errWhileFetchingRevisionClass,
                  FetchingRevisionClass,
                ] = await this.getClassById(revision.id);
                if (errWhileFetchingRevisionClass) {
                  logger.error(
                    `classId- ${classId} ` + JSON.stringify(errWhileFetchingRevisionClass)
                  );
                  return h
                    .response(errWhileFetchingRevisionClass)
                    .code(errWhileFetchingRevisionClass.code);
                }
                allRecurringClasses.push(FetchingRevisionClass);
              }
            }
          }
        }
        const data = await displayService.upcomingClassesWithEnrolledKey(
          allRecurringClasses,
          userId
        );
        calendarDetails = data;
      } else {
        calendarDetails = [classDetails];
      }

      var { start_time, end_time, ..._c } = calendarDetails[0];
      var c = calendarDetails[0];

      /* eslint-disable */
      for (const c of calendarDetails) {
        classIds.push(c.id);
      }
      /* eslint-enable */
      const [errWhileUnregistering, removedRegistration] = await this.removeRegistrationById(
        classIds,
        userId
      );

      // call calendar patch API when google_registration_status will be true.
      if (removedRegistration.google_registration_status === true) {
        let emailList = [];
        let regUsers;
        try {
          regUsers = await calendarService.getCalendarEvent(
            c.recurring_id !== null ? c.parent_class.calendar_event_id : c.calendar_event_id,
            classDetails.facilitator_id,
            classDetails.facilitator_email
          );
          if (regUsers.data.attendees)
            emailList = regUsers.data.attendees.filter((e) => {
              return e.email !== userEmail;
            });
          await calendarService.patchCalendarEvent(c, emailList);
        } catch (err) {
          /* eslint-disable */
          logger.error(`id- ${userId}: Calendar event error- ` + JSON.stringify(err));
        }
      }

      if (errWhileUnregistering) {
        logger.error(
          /* eslint-disable */
          `id- ${userId}: ` + JSON.stringify(errWhileUnregistering)
        );
        return h.response(errWhileUnregistering).code(errWhileUnregistering.code);
      }
      // try {
      // chatService.classDropoutMessage(userId);
      // } catch {
      // eslint-disable-next-line
      // }
      logger.info('Cancel registration to a specific class');
      return [null, removedRegistration];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async mergedClasses(classId, mergeClassId, h) {
    const { ClassRegistrations, MergedClasses } = this.server.models();
    const { displayService, userService } = this.server.services();

    try {
      if (classId == mergeClassId) {
        return [{message:'classId and mergeClassId should not be same',Error:true,code:400}, null];
      } else{

        let mergedClass =  await MergedClasses.query().where('merged_class_id', mergeClassId)
        let Class__ =  await MergedClasses.query().where('class_id', classId)
        if (mergedClass.length > 0 || Class__.length > 0) {
          return [{message:'Class is already merged with another class.', Error:true, code:400}, null];
        }
        const registerStudentsData = await ClassRegistrations.query().where('class_id', mergeClassId);
        if (
          registerStudentsData !== null &&
          registerStudentsData !== undefined &&
          registerStudentsData.length > 0
        ) {
          for (let registerStudent of registerStudentsData) {
            const [errUserDetail, userDetail] = await userService.findById(registerStudent.user_id);
            if (errUserDetail) {
              logger.error(
                // eslint-disable-next-line
                `id- ${errUserDetail}: ` + JSON.stringify(errUserDetail)
              );
              return h.response(errUserDetail).code(errUserDetail.code);
            }
            const userProfileDetails = await displayService.userProfile(userDetail);
            await this.registerClasses(classId, false, userProfileDetails, h);
            await this.unregisterClasses(mergeClassId, false, userProfileDetails, h);
          }
        }
        const docs = {};
        docs.class_id = classId;
        docs.merged_class_id = mergeClassId;
        const mergedData = await MergedClasses.query().insert(docs);
        return [null, mergedData];
      }
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getStudentsDataByRecurringId(reccuringId) {
    const { Classes, ClassRegistrations, User } = this.server.models();
    try {
      let classData = await Classes.query().select('id').where('recurring_id', reccuringId);
      if (classData.length > 0 && classData !== null) {
        let classIds = classData.map((ids) => ids.id);
        let registerStudentsData = await ClassRegistrations.query()
          .select('user_id')
          .whereIn('class_id', classIds);
        if (registerStudentsData.length > 0 && registerStudentsData !== null) {
          let userIds = Array.from(new Set(registerStudentsData.map((reg) => reg.user_id)));
          let usersData = await User.query().select('name', 'email').whereIn('id', userIds);
          return [null, usersData];
        } else {
          let notExitsData = {
            status: true,
            message: `there is no students enrolled in classes with reccuringId ${reccuringId}`,
          };
          return [null, notExitsData];
        }
      } else {
        let notExitsRecurringId = {
          status: true,
          message: `there is no classes exits with reccuringId ${reccuringId}`,
        };
        return [null, notExitsRecurringId];
      }
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async checkBatchTitle(group_id, title) {
    const { Classes, PartnerSpecificBatches } = this.server.models();
    try {
      const batchData = await PartnerSpecificBatches.query()
        .throwIfNotFound()
        .where('group_id', group_id);
      const recurringIds = batchData.map((item) => item.recurring_id);
      const allBatchTitle = [];
      for (const recurring_id of recurringIds) {
        const classDetails = await Classes.query()
          .where('recurring_id', recurring_id)
          .orderBy('recurring_id')
          .limit(1)
          .select('title');
        if (classDetails.length > 0) {
          allBatchTitle.push(classDetails[0].title);
        }
      }
      if (allBatchTitle.includes(title)) {
        return [
          {
            error: true,
            code: 403,
            message: 'title allready exists',
          },
          null,
        ];
      } else {
        return [null, 'title not exists'];
      }
    } catch (error) {
      return [errorHandler(error), null];
    }
  }

  async mergeWarToday(query) {
    const { Classes, MergedClasses } = this.server.models();
    const { date, pathway_id } = query;

    try {
      let currentDate = new Date(date);
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const day = now.getDate();

      const formattedMonth = month < 10 ? '0' + month : month;
      const formattedDay = day < 10 ? '0' + day : day;

      const todayDate = `${year}-${formattedMonth}-${formattedDay}`;

      if (todayDate == date){
        currentDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
      } else {
        currentDate = new Date(`${date}T00:00:00.000+05:30`);
      }
      
      const endOfDay = new Date(`${date}T23:59:59.999+05:30`);
      
      const classes = await Classes.query()
        .select('id', 'title', 'start_time', 'recurring_id', 'type')
        .where('start_time', '>=', currentDate)
        .andWhere('start_time', '<=', endOfDay)
        .andWhere('type', 'batch')
        .withGraphFetched('PartnerSpecificBatches');

      let reccuringIds = [];
      let ClassIds = [];
      let filteredClasses = classes.filter((item) => {
        if (item.PartnerSpecificBatches && item.PartnerSpecificBatches.pathway_id == pathway_id && !reccuringIds.includes(item.recurring_id)) {
          ClassIds.push(item.id);
          reccuringIds.push(item.recurring_id);
          item.pathway_id = item.PartnerSpecificBatches.pathway_id;
          delete item.PartnerSpecificBatches;
          return item;
        }
      });

      const MergedClassesData = await MergedClasses.query().whereIn('merged_class_id', ClassIds);
      const mergedClassIds = MergedClassesData.map((item) => item.merged_class_id);

      filteredClasses = filteredClasses.filter(item => !mergedClassIds.includes(item.id));

      return [null, filteredClasses];
    } catch (error) {
      return [errorHandler(error), null];
    }
  }

  async getClassByClassId(classId, course_name, pathway_id, course_id) {
    const { Classes, ClassesToCourses } = this.server.models();
    const { displayService } = this.server.services();

    const dateIST = UTCToISTConverter(new Date());
    try {
      const classesTOCourses = await ClassesToCourses.query()
        .where('class_id', classId)
        .select('slug_id');
      let slug_id = classesTOCourses[0].slug_id;
      
      const classes = await Classes.query()
        .where('id', classId)
        .andWhere('end_time', '>', dateIST)
      
      let data = await Classes.fetchGraph(classes, 'facilitator');
      let finalClassData = await displayService.filterClassDetailsForSlug(data[0], course_name, pathway_id, course_id, slug_id)
      if (finalClassData[0].id !== null && finalClassData[0].id !== undefined) {
        return [null, slug_id, finalClassData];
      }
      return [null, slug_id, null];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }
};
