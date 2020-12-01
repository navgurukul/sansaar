const ExerciseCompletion = require('../models/exerciseCompletion');
const Exercises = require('../models/exercise');
const CourseCompletion = require('../models/courseCompletion');
const Courses = require('../models/courses');
const PathwayCompletion = require('../models/pathwayCompletion');
const Pathways = require('../models/pathway');
const PathwayCourses = require('../models/pathwayCourses');
const { transaction } = require('objection');

// async function checkCompletionEligibility(transaction, model, userId, id) {
//   let currentModel;
//   let checkModel;
//   let currentId;
//   let upperIdName;
//   let upperModel;
//   switch (model) {
//     case 'exercises':
//       currentModel = ExerciseCompletion;
//       checkModel = Exercises;
//       currentId = 'exercise_id';
//       upperIdName = 'course_id';
//       upperModel = Courses;
//       break;
//     case 'courses':
//       currentModel = CourseCompletion;
//       checkModel = Courses;
//       currentId = 'course_id';
//       upperIdName = 'pathway_id';
//       upperModel = Pathways;
//       break;
//   }
//   const upperLevelId = await checkModel.query(transaction).select(upperIdName).where('id', id);

//   const allEntriesForAnId = await upperModel
//     .query(transaction)
//     .where('id', upperLevelId[0][upperIdName])
//     .withGraphFetched(model);
//   const lengthOfExistingEntries = allEntriesForAnId[0][model].length;

//   const allEntries = await currentModel
//     .query(transaction)
//     .where({ user_id: userId })
//     .withGraphFetched(model);

//   const filteredEntries = allEntries.filter((entry) => {
//     return entry[model][0][upperIdName] === upperLevelId[0][upperIdName];
//   });
//   const lengthOfTotalEntries = filteredEntries.length;
//   console.log(lengthOfExistingEntries, lengthOfTotalEntries);
//   if (lengthOfExistingEntries === lengthOfTotalEntries) {
//     return true;
//   }
//   return false;
// }

async function checkCourseCompletionEligibility(transaction, userId, id) {
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
  if (lengthOfExistingEntries === lengthOfTotalEntries) {
    return { status: true, courseId: courseId[0].course_id };
  }
  return { status: false, courseId: courseId[0].course_id };
}

async function insertIntoCourse(transaction, userId, courseId) {
  return CourseCompletion.query(transaction)
    .context({ user_id: userId, course_id: courseId })
    .insert({ user_id: userId, course_id: courseId });
}

async function deleteFromCourse(transaction, userId, courseId) {
  const course = await CourseCompletion.query(transaction).where({
    user_id: userId,
    course_id: courseId,
  });
  if (course.length > 0) {
    const courseCompletion = CourseCompletion.fromJson({
      id: course[0].id,
      user_id: userId,
      course_id: courseId,
    });
    await courseCompletion
      .$query(transaction)
      .context({ user_id: userId, course_id: courseId })
      .delete();
  }
}

async function checkPathwayCompletionEligibility(transaction, userId, id) {
  const pathwayId = await PathwayCourses.query(transaction)
    .select('pathway_id')
    .where('course_id', id);
  let pathwayIdArr = [];
  let coursesForPathways;
  pathwayId.forEach(async (pathway) => {
    let temp;
    if (pathwayIdArr.indexOf(pathway.pathway_id) < 0) {
      pathwayIdArr.push(pathway.pathway_id);
    }
    const allCoursesInPathway = await PathwayCourses.query(transaction)
      .select('course_id')
      .where('pathway_id', pathway.pathway_id);
    const key = pathway.pathway_id;
    // console.log(allCoursesInPathway);
    temp[key] = [];
    temp[key].push(...allCoursesInPathway);
    coursesForPathways = temp;
  });
  console.log('************************************');
  console.log(coursesForPathways);
  console.log('************************************');

  const allCompletedCourses = await CourseCompletion.query(transaction)
    .where('user_id', userId)
    .withGraphJoined('pathwayCourses');
  const allPathwaysContainingCourse = allCompletedCourses.filter((courses) => {
    // console.log(courses['pathwayCourses']);
    return pathwayIdArr.indexOf(courses['pathwayCourses'].pathway_id) > -1;
  });
  // console.log('************************************');
  // console.log(allPathwaysContainingCourse);
  // console.log('************************************');
}

module.exports = {
  // checkCompletionEligibility,
  checkCourseCompletionEligibility,
  insertIntoCourse,
  deleteFromCourse,
  checkPathwayCompletionEligibility,
};
