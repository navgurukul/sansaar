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
    const { Pathway } = this.server.models();

    const pathways = await Pathway.fetchGraph(pathway, 'milestones');
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

  courseExercises = async (exr) => {
    const { Courses } = this.server.models();
    return Courses.fetchGraph(exr, 'exercises');
  };

  pathwayCourses = async (courses) => {
    const { Pathway } = this.server.models();
    return Pathway.fetchGraph(courses, 'courses');
  };

  getClasses = async (classes) => {
    const { ClassRegistrations } = this.server.models();
    return ClassRegistrations.fetchGraph(classes, 'classes');
  };

  getClassDetails = async (classDetails, userID) => {
    const { ClassRegistrations } = this.server.models();
    const classes = await ClassRegistrations.query().select('class_id').where('user_id', userID);
    const classList = [];
    const extraDetails = {
      rules: [
        'Join the class atleast 10 minutes before schedule.',
        'Watch this video if you are new to Meraki, to follow the instructions. https://www.youtube.com/watch?v=TWf3r9NXz7k',
      ],
    };
    _.map(classes, (val) => classList.push(val.class_id));
    const enrollStatus = { enrolled: false };
    if (classList.indexOf(classDetails.id) > -1) {
      enrollStatus.enrolled = true;
    }
    return { ...classDetails, ...enrollStatus, ...extraDetails };
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
