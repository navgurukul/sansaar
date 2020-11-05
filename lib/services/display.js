const Schmervice = require('schmervice');
const _ = require('lodash');
const { randomGenerator } = require('../helpers');

const transforms = {};

module.exports = class DisplayService extends Schmervice.Service {
  _applyTransform = (results, func) => (_.isArray(results) ? _.map(results, func) : func(results));

  userProfile = async (user) => {
    const { User } = this.server.models();

    const results = await User.fetchGraph(user, { roles: true, pathways: true });

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
    const roomId = await chatService.createChatRoom(newChatUser.id); // Create a room for the user for initial conversation
    await User.query().patch({ chat_id, chat_password }).findById(userId); // Update chat details of the user in the database
    return { ...roomId, chat_id, chat_password };
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

  pathway = async (pathway) => {
    const { Pathways } = this.server.models();

    const pathways = await Pathways.fetchGraph(pathway, { milestones: true, courses: true });
    return this._applyTransform(pathways, transforms.pathway);
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

  getCourseExercises = async (exr) => {
    const { Courses } = this.server.models();
    const courseExercises = await Courses.fetchGraph(exr, 'exercises');
    const { exercises, ...parsedData } = courseExercises;
    const newExercises = [];
    courseExercises.exercises.forEach((ele) => {
      const { content, ...newEle } = ele;
      try {
        newEle.content = JSON.parse(ele.content);
      } catch {
        newEle.content = ele.content;
      }
      newExercises.push(newEle);
    });
    parsedData.exercises = newExercises;
    return parsedData;
  };

  getPathwayCourses = async (pathwayId) => {
    const { Pathways } = this.server.models();
    const pathway = await Pathways.query()
      .where('pathways.id', pathwayId)
      .withGraphJoined('pathwayCourses.courses')
      // .modify((builder) => {
      //   builder.orderBy('pathwayCourses.id');
      // });
      .orderBy('pathwayCourses.id');
    const { pathwayCourses, ...pathwayCourse } = pathway[0];
    pathwayCourse.courses = [];
    pathway.forEach((ele) => {
      ele.pathwayCourses.forEach((eachCourse) => {
        pathwayCourse.courses.push(eachCourse.courses[0]);
      });
    });
    return pathwayCourse;
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
        eachClassTransformed.facilitator = { name: facilitator_name };
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
        regClass.facilitator = { name: regClass.class.facilitator_name };
      } else {
        regClass.facilitator = ele.facilitator[0];
      }
      // console.log(regClass);
      transformedClass.push(regClass);
      /* eslint-enable */
    });
    return transformedClass;
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

  getClassRegisteredUsers = async (classId) => {
    const { Classes } = this.server.models();
    const registeredUsers = await Classes.query()
      .where('classes.id', classId)
      .withGraphJoined('users');
    return registeredUsers[0].users;
  };

  getRecommendedClasses = async (classes) => {
    const { Classes } = this.server.models();
    return Classes.fetchGraph(classes, 'facilitator');
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
