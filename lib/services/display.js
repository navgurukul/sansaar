const Schmervice = require('schmervice');
const _ = require('lodash');

const transforms = {};

module.exports = class DisplayService extends Schmervice.Service {
  _applyTransform = (results, func) => (_.isArray(results) ? _.map(results, func) : func(results));

  userProfile = async (user) => {
    const { User } = this.server.models();

    const results = await User.fetchGraph(user, { roles: true, pathways: true });
    return this._applyTransform(results, transforms.userProfile);
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

  // allCoursesWithEnrolled = async (courses) => {
  //   const { CourseEnrolments } = this.server.models();
  //   const allCourse = courses.availableCourses;
  //   const enrolledCourses = [];
  //   const enrolledCourseList = await CourseEnrolments.fetchGraph(courses.enrolCourses, 'courses');
  //   enrolledCourseList.sort((a, b) => a.courses[0].sequence_num - b.courses[0].sequence_num);
  //   _.each(enrolledCourseList, (enrolledCourse) => {
  //     enrolledCourses.push(enrolledCourse.courses[0]);
  //   });
  //   return {
  //     enrolledCourses,
  //     allCourse,
  //   };
  // };

  getCourseExercises = async (exr) => {
    const { Courses } = this.server.models();
    return Courses.fetchGraph(exr, 'exercises');
  };

  getPathwayCourses = async (pathwayId) => {
    const { Pathways } = this.server.models();
    return (
      Pathways.query()
        .where('pathways.id', pathwayId)
        .withGraphJoined('pathwayCourses.courses')
        // .modify((builder) => {
        //   builder.orderBy('pathwayCourses.id');
        // });
        .orderBy('pathwayCourses.id')
    );
  };

  getUpcomingClassFacilitators = async (classes) => {
    const { Classes } = this.server.models();
    const allClasses = await Classes.fetchGraph(classes, 'facilitator');
    allClasses.map(
      (eachClass) =>
        (eachClass.rules = {
          en: `# Rules
      - Join the class atleast 10 minutes before schedule.
      - Watch this video if you are new to Meraki, to follow the instructions. https://www.youtube.com/watch?v=TWf3r9NXz7k`,
        })
    );
    return allClasses;
  };

  getClasses = async (classes) => {
    const { ClassRegistrations } = this.server.models();
    return ClassRegistrations.fetchGraph(classes, { classes: true, facilitator: true });
  };

  getClassDetails = async (classDetails, userId) => {
    const { ClassRegistrations } = this.server.models();
    const classes = await ClassRegistrations.query().select('class_id').where('user_id', userId);
    const classList = [];
    const extraDetails = {
      rules: {
        en: `# Rules
        - Join the class atleast 10 minutes before schedule.
        - Watch this video if you are new to Meraki, to follow the instructions. https://www.youtube.com/watch?v=TWf3r9NXz7k`,
      },
    };
    _.map(classes, (val) => classList.push(val.class_id));
    const enrollStatus = { enrolled: false };
    if (classList.indexOf(classDetails.id) > -1) {
      enrollStatus.enrolled = true;
    }
    return { ...classDetails, ...enrollStatus, ...extraDetails };
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
