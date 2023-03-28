const Schmervice = require('schmervice');
const _ = require('lodash');
const dateFormat = require('dateformat');
const { errorHandler } = require('../errorHandling');

const { randomGenerator } = require('../helpers');

const transforms = {};

module.exports = class DisplayService extends Schmervice.Service {
  _replaceV2 = (data, keyNames) => {
    const mapping = {
      pathwaysV2: 'pathways',
      coursesV2: 'courses',
      exercisesV2: 'exercises',
    };

    const transformedData = _.forEach(data, (p) => {
      const newKeyName = {};
      _.forEach(keyNames, (kName) => {
        newKeyName[mapping[kName]] = p[kName];
        if (p[kName]) {
          delete Object.assign(p, newKeyName)[kName];
        }
      });
    });
    return transformedData;
  };

  _applyTransform = (results, func) => (_.isArray(results) ? _.map(results, func) : func(results));

  userProfile = async (user) => {
    const { User } = this.server.models();
    const results = await User.fetchGraph(user, { roles: true, pathways: true });
    return this._applyTransform(results, transforms.userProfile);
  };

  _applyTransformV2 = (results, func) =>
    _.isArray(results) ? _.map(results, func) : func(results);

  userProfile = async (user) => {
    const { User } = this.server.models();
    const results = await User.fetchGraph(user, { roles: true, pathwaysV2: true });
    return this._applyTransform(results, transforms.userProfile);
  };

  createMatrixCredentials = async (userName, userId) => {
    const { chatService } = this.server.services();
    const { User } = this.server.models();
    const chat_id = randomGenerator(userName).id;
    const chat_password = randomGenerator().password;
    const newChatUser = {
      displayName: userName,
      id: chat_id,
      password: chat_password,
      threepids: [],
    };
    await chatService.createChatUser(newChatUser); // Create a matrix id for the user
    // const roomId = await chatService.createChatRoom(newChatUser.id); // Create a room for the user for initial conversation
    await User.query().patch({ chat_id, chat_password }).findById(userId); // Update chat details of the user in the database
    return { chat_id, chat_password };
  };

  updateMatrixProfile = async (user) => {
    const { chatService } = this.server.services();
    const { name, chat_id, profile_picture } = user;
    let avatarIndex;
    if (profile_picture) {
      // eslint-disable-next-line
      avatarIndex = profile_picture.split('/').pop().split('.')[0].split('')[0];
    }
    await chatService.userUpdateProfile(avatarIndex, name, chat_id);
    return 'Success';
  };

  pathway = async (pathway, course_type = undefined) => {
    const { Pathways } = this.server.models();
    pathway.forEach((course) => {
      delete course.courses;
    });
    let pathways = await Pathways.fetchGraph(pathway, {
      milestones: true,
      courses: true,
    });

    pathways = pathways.length ? pathways : [pathways];
    pathways = _.map(pathways, (p) => {
      p.courses = _.filter(p.courses, (c) => {
        if (course_type === 'json') {
          return c.course_type === 'json';
        }
        return c.course_type !== 'json';
      });
      return p;
    });

    return this._applyTransform(pathways, transforms.pathway);
  };

  // Pathways version 2
  pathwayV2 = async (pathway) => {
    const { PathwaysV2 } = this.server.models();
    let pathways = await PathwaysV2.fetchGraph(pathway, {
      coursesV2: true,
    });
    pathways = pathways.length ? pathways : [pathways];
    pathways = this._replaceV2(pathways, ['coursesV2', 'pathwaysV2']);
    return pathways;
  };

  courseV2 = async (course) => {
    const courses = this._replaceV2(course, ['exercisesV2', 'coursesV2']);
    return courses[0];
  };

  pathwayMilestone = async (milestone) => milestone;

  progressParameter = async (parameter) => parameter;

  progressQuestion = async (question) => question;

  pathwayTrackingForm = async (structure) => {
    const { PathwayFormStructure } = this.server.models();

    const results = await PathwayFormStructure.fetchGraph(structure, {
      parameter: true,
      question: true,
    });
    const form = { questions: [], parameters: [] };
    results.forEach((result) => {
      if (result.parameter_id) {
        form.parameters.push(result.parameter);
      }
      if (result.question_id) {
        form.questions.push(result.question);
      }
    });
    return form;
  };

  allCoursesWithEnrolled = async (courses, authUser, txn = null) => {
    const { CourseEnrolments } = this.server.models();
    const allCourses = courses;
    const enrolledCourses = [];

    const enrolled = await CourseEnrolments.query(txn).where('student_id', authUser.id);
    const enrolledCourseList = await CourseEnrolments.fetchGraph(enrolled, 'courses');

    _.each(enrolledCourseList, (enrolledCourse) => {
      enrolledCourses.push(enrolledCourse.courses[0]);
    });

    return {
      enrolledCourses,
      allCourses,
    };
  };

  getCourseExercises = async (courseId) => {
    const { Courses } = this.server.models();
    // const courseExercises = await Courses.fetchGraph(exr, 'exercises');
    let courseExercises;
    try {
      courseExercises = await Courses.query()
        .where('courses.id', courseId)
        .throwIfNotFound()
        .withGraphJoined('exercises')
        .modify((builder) => {
          builder.orderBy('exercises.sequence_num');
        });
      const { exercises, ...parsedData } = courseExercises;
      const newExercises = [];
      courseExercises[0].exercises.forEach((ele) => {
        const { content, ...newEle } = ele;
        try {
          newEle.content = JSON.parse(ele.content);
        } catch {
          newEle.content = ele.content;
        }
        newExercises.push(newEle);
      });
      parsedData.exercises = newExercises;
      return [null, parsedData];
    } catch (err) {
      return [errorHandler(err), null];
    }
  };

  getPathwayCourses = async (pathwayId, course_type = undefined) => {
    const { Pathways } = this.server.models();
    let pathway;
    try {
      pathway = await Pathways.query()
        .where('pathways.id', pathwayId)
        .throwIfNotFound()
        .withGraphJoined('pathwayCourses.courses')
        .orderBy('pathwayCourses.id');
      const { pathwayCourses, ...pathwayCourse } = pathway[0];
      pathwayCourse.courses = [];
      pathway.forEach((ele) => {
        ele.pathwayCourses.forEach((eachCourse) => {
          if (course_type === 'all') {
            pathwayCourse.courses.push(eachCourse.courses[0]);
          } else if (course_type === 'json') {
            // eslint-disable-next-line no-lonely-if
            if (eachCourse.courses[0].course_type === 'json') {
              pathwayCourse.courses.push(eachCourse.courses[0]);
            }
          } else {
            // eslint-disable-next-line no-lonely-if
            if (eachCourse.courses[0].course_type !== 'json') {
              pathwayCourse.courses.push(eachCourse.courses[0]);
            }
          }
        });
      });

      return [null, pathwayCourse];
    } catch (err) {
      return [errorHandler(err), null];
    }
  };

  getPathwayCoursesV2 = async (pathwayId) => {
    const { PathwaysV2 } = this.server.models();
    let pathway;
    try {
      pathway = await PathwaysV2.query()
        .where('pathways_v2.id', pathwayId)
        .throwIfNotFound()
        .withGraphJoined('pathwayCoursesV2.coursesV2')
        .orderBy('pathwayCoursesV2.id');
      const { pathwayCoursesV2, ...pathwayCourse } = pathway[0];
      pathwayCourse.courses = [];
      pathway.forEach((ele) => {
        ele.pathwayCoursesV2.forEach((eachCourse) => {
          pathwayCourse.courses.push(eachCourse.coursesV2[0]);
        });
      });
      return [null, pathwayCourse];
    } catch (err) {
      return [errorHandler(err), null];
    }
  };

  getUpcomingClassFacilitators = async (classes) => {
    const { Classes } = this.server.models();
    const allClasses = await Classes.fetchGraph(classes, 'facilitator');
    const allClassesTransformed = [];
    allClasses.forEach((eachClass) => {
      eachClass.rules = {
        en: `## Rules\n- Join the class atleast\n10 minutes before schedule.\n\n- Watch [this video](https://www.youtube.com/watch?v=QfBnS1Gnw2c) if you are new to\nMeraki, to follow the instructions.`,
      };
      const { facilitator_email, facilitator_name, ...eachClassTransformed } = eachClass;
      if (eachClass.facilitator_id === null) {
        eachClassTransformed.facilitator = { name: facilitator_name, email: facilitator_email };
      }
      allClassesTransformed.push(eachClassTransformed);
    });
    return allClassesTransformed;
  };

  getClasses = async (classes) => {
    const { ClassRegistrations } = this.server.models();
    const transformedClass = [];
    const regClasses = await ClassRegistrations.fetchGraph(classes, {
      classes: true,
      facilitator: true,
    });
    regClasses.forEach((ele) => {
      /* eslint-disable */
      const { id, class_id, user_id, classes, ...regClass } = ele;
      regClass.class = ele.classes[0];
      if (regClass.class.facilitator_id === null) {
        regClass.facilitator = {
          name: regClass.class.facilitator_name,
          email: regClass.class.facilitator_email,
        };
      } else {
        regClass.facilitator = ele.facilitator[0];
      }
      // console.log(regClass);
      transformedClass.push(regClass);
      /* eslint-enable */
    });
    return transformedClass;
  };

  upcomingClassesWithEnrolledKey = async (classes, userId, scope) => {
    const modClass = [];
    userId = parseInt(userId, 10);
    _.map(classes, (eachClass) => {
      const {
        registrations,
        facilitator_id,
        facilitator_name,
        facilitator_email,
        ...reg
      } = eachClass;
      if (!eachClass.facilitator) {
        reg.facilitator = {};
        reg.facilitator.name = facilitator_name;
        reg.facilitator.email = facilitator_email;
      }
      const ifCurrentUserReg = _.find(registrations, { user_id: userId });
      if (
        registrations.length < eachClass.max_enrolment ||
        eachClass.max_enrolment === null ||
        userId === facilitator_id ||
        ifCurrentUserReg ||
        scope.indexOf('admin') > -1 ||
        scope.indexOf('classAdmin') > -1
      ) {
        if (ifCurrentUserReg) reg.enrolled = true;
        modClass.push(reg);
      }
    });
    return modClass;
  };

  getClassDetails = async (classDetails, userId) => {
    const { ClassRegistrations } = this.server.models();
    const classes = await ClassRegistrations.query().select('class_id').where('user_id', userId);
    const classList = [];
    /* eslint-disable */
    const extraDetails = {
      rules: {
        en: `1.Join the class atleast\n10 minutes before schedule.\n\n2. Watch [this video](https://www.youtube.com/watch?v=QfBnS1Gnw2c) if you are new to\nMeraki, to follow the instructions.`,
      },
    };
    /* eslint-enable */

    _.map(classes, (val) => classList.push(val.class_id));
    const enrollStatus = { enrolled: false };
    if (classList.indexOf(classDetails[0].id) > -1) {
      enrollStatus.enrolled = true;
    }
    return { ...classDetails[0], ...enrollStatus, ...extraDetails };
  };

  getNewClassDetails = async (classDetails, userId) => {
    const { ClassRegistrations } = this.server.models();
    const classes = await ClassRegistrations.query().select('class_id').where('user_id', userId);
    const classList = [];
    /* eslint-enable */
    _.map(classes, (val) => classList.push(val.class_id));
    const enrollStatus = { enrolled: false };
    if (classList.indexOf(classDetails[0].id) > -1) {
      enrollStatus.enrolled = true;
    }
    const classData = {
      type: 'Workshop',
      title: 'Upcoming classes',
      content: [
        {
          type: 'heading',
          text: 'About',
        },
        {
          type: 'paragraph',
          text: `${classDetails[0].description}`,
        },
        {
          type: 'heading',
          text: 'Class details',
        },
        {
          type: 'paragraph',
          text: `<b>Teacher</b> - ${
            classDetails[0].facilitator.name
          }\n<b>Date and Time</b> - ${dateFormat(
            classDetails[0].start_time,
            'dS mmmm, h:MMTT '
          )}${dateFormat(classDetails[0].end_time, '- h:MMTT (dddd)')}`,
        },
        {
          type: 'heading',
          text: 'Special Instructions',
        },
        {
          type: 'ordered_list',
          contents: [
            `Join the class atleast 10 minutes before schedule.`,
            `Watch <a href=https://www.youtube.com/watch?v=QfBnS1Gnw2c>this video</a> if you are new to Meraki, follow the instructions.`,
          ],
        },
        {
          type: 'paragraph',
          text: `<a href=${classDetails[0].meet_link}>${classDetails[0].meet_link}`,
        },
      ],
    };
    return classData;
  };

  // Error catching not required since zero numbers of users registered to a class is a practical scenario
  getClassRegisteredUsers = async (classId) => {
    const { Classes } = this.server.models();
    const registeredUsers = await Classes.query()
      .where('classes.id', classId)
      .withGraphJoined('users');
    return registeredUsers[0].users;
  };

  filterClassDetails = async (singleClass, sequence, course_name) => {
    const exerciseDetails = _.pick(singleClass, [
      'id',
      'title',
      'sub_title',
      'description',
      'pathway_id',
      'course_id',
      'exercise_id',
      'start_time',
      'end_time',
      'lang',
      'type',
      'meet_link',
      'facilitator',
      'is_enrolled',
    ]);
    exerciseDetails.course_name = course_name;
    exerciseDetails.sequence_num = sequence;
    exerciseDetails.content_type = 'class_topic';
    return exerciseDetails;
  };

  getRecommendedClasses = async (classes) => {
    const { Classes } = this.server.models();
    return Classes.fetchGraph(classes, 'facilitator');
  };

  filterPartnersUsersData = async (usersData) => {
    const users = [];
    _.map(usersData, (u) => {
      const { chat_id, chat_password, classes, registrations, ...cleanUser } = u;
      const classesMod = [];
      _.map(classes, (c) => {
        const feedback = _.filter(u.registrations, (regs) => {
          return regs.class_id === c.id;
        });
        const { meet_link, calendar_event_id, ...cleanClass } = c;
        // eslint-disable-next-line
        cleanClass.feedback = feedback[0];
        classesMod.push(cleanClass);
      });
      cleanUser.classes_registered = classesMod;
      users.push(cleanUser);
    });
    return users;
  };

  filterUserClassRecords = async (userClasses) => {
    const volunteerRecord = [];
    _.map(userClasses, (u) => {
      const { users, ...cleanClass } = u;
      cleanClass.registrations = users.length;
      volunteerRecord.push(cleanClass);
    });
    return volunteerRecord;
  };

  transformPartnersData = async (partners) => {
    const tData = _.map(partners, (p) => {
      return { ...p, users: p.users.length };
    });
    return tData;
  };
};

transforms.userProfile = ({ roles, ...userInfo }) => ({
  rolesList: _.map(roles, (r) => r.role),
  ...userInfo,
});

transforms.pathway = ({ milestones, ...pathwayInfo }) => ({
  milestones: _.sortBy(milestones, (m) => m.position),
  ...pathwayInfo,
});
