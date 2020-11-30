const ExerciseCompletion = require('../models/exerciseCompletion');
const Exercises = require('../models/exercise');
const CourseCompletion = require('../models/courseCompletion');
const Courses = require('../models/courses');
const PathwayCompletion = require('../models/pathwayCompletion');
const Pathways = require('../models/pathway');
const PathwayCourses = require('../models/pathwayCourses');

async function checkCompletionEligibility(transaction, model, userId, id) {
  let currentModel;
  let checkModel;
  let currentId;
  let upperIdName;
  let upperModel;
  switch (model) {
    case 'exercises':
      currentModel = ExerciseCompletion;
      checkModel = Exercises;
      currentId = 'exercise_id';
      upperIdName = 'course_id';
      upperModel = Courses;
      break;
    case 'courses':
      currentModel = CourseCompletion;
      checkModel = Courses;
      currentId = 'course_id';
      upperIdName = 'pathway_id';
      upperModel = Pathways;
      break;
  }
  const upperLevelId = await checkModel.query(transaction).select(upperIdName).where('id', id);

  const allEntriesForAnId = await upperModel
    .query(transaction)
    .where('id', upperLevelId[0][upperIdName])
    .withGraphFetched(model);
  const lengthOfExistingEntries = allEntriesForAnId[0][model].length;

  const allEntries = await currentModel
    .query(transaction)
    .where({ user_id: userId })
    .withGraphFetched(model);

  const filteredEntries = allEntries.filter((entry) => {
    return entry[model][0][upperIdName] === upperLevelId[0][upperIdName];
  });
  const lengthOfTotalEntries = filteredEntries.length;
  console.log(lengthOfExistingEntries, lengthOfTotalEntries);
  if (lengthOfExistingEntries === lengthOfTotalEntries) {
    return true;
  }
  return false;
}

async function checkCourseCompletionEligibility(transaction, model, userId, id) {
  const courseId = await Exercises.query(transaction).select('course_id').where('id', id);
  const allEntriesForAnId = await Courses.query(transaction)
    .where('id', courseId[0]['course_id'])
    .withGraphFetched('exercises');
  const lengthOfExistingEntries = allEntriesForAnId[0]['exercises'].length;
  const allEntries = await ExerciseCompletion.query(transaction)
    .where({ user_id: userId })
    .withGraphFetched('exercises');
  const filteredEntries = allEntries.filter((entry) => {
    return entry['exercises'][0]['course_id'] === courseId[0]['course_id'];
  });
  const lengthOfTotalEntries = filteredEntries.length;
  console.log(lengthOfExistingEntries, lengthOfTotalEntries);
  if (lengthOfExistingEntries === lengthOfTotalEntries) {
    return true;
  }
  return false;
}

async function checkPathwayCompletionEligibility(transaction, model, userId, id) {
  const pathwayId = await PathwayCourses.query(transaction)
    .select('pathway_id')
    .where('course_id', id);
  let pathwayIdArr = [];

  pathwayId.forEach(async (pathway) => {
    if (pathwayIdArr.indexOf(pathway.pathway_id) < 0) {
      pathwayIdArr.push(pathwayId.pathway_id);
    }
    const allCoursesInPathway = await PathwayCourses.query(transaction).where(
      'pathway_id',
      pathway.pathway_id
    );
    console.log(allCoursesInPathway);
  });

  const allCompletedCourses = await CourseCompletion.query(transaction)
    .where('user_id', userId)
    .withGraphJoined('pathwayCourses');
  const allPathwaysContainingCourse = allCompletedCourses.filter((courses) => {
    console.log(courses['pathwayCourses']);
    return pathwayIdArr.indexOf(courses['pathwayCourses'].pathway_id) > -1;
  });
  console.log('************************************');
  console.log(allPathwaysContainingCourse);
  console.log('************************************');
}

module.exports = {
  checkCompletionEligibility,
  checkCourseCompletionEligibility,
  checkPathwayCompletionEligibility,
};
