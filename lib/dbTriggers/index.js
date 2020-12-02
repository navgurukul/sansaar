const ExerciseCompletion = require('../models/exerciseCompletion');
const Exercises = require('../models/exercise');
const CourseCompletion = require('../models/courseCompletion');
const Courses = require('../models/courses');
const PathwayCompletion = require('../models/pathwayCompletion');
const PathwayCourses = require('../models/pathwayCourses');

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
    // eslint-disable-next-line
    .where('id', courseId[0]['course_id'])
    .withGraphFetched('exercises');
  // eslint-disable-next-line
  const lengthOfExistingEntries = allEntriesForAnId[0]['exercises'].length;
  const allEntries = await ExerciseCompletion.query(transaction)
    .where({ user_id: userId })
    .withGraphFetched('exercises');
  const filteredEntries = allEntries.filter((entry) => {
    // eslint-disable-next-line
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
  const returnStatus = { status: false, pathwayId: [] };
  const pathwayId = await PathwayCourses.query(transaction)
    .select('pathway_id')
    .where('course_id', id);

  const pathwayIdArr = pathwayId.map((pathway) => {
    return pathway.pathway_id;
  });
  for (let i = 0; i < pathwayIdArr.length; i = i + 1) {
    const allCourses = await PathwayCourses.query(transaction)
      .select('course_id')
      .where('pathway_id', pathwayIdArr[i]);
    const completedCourses = await CourseCompletion.query(transaction)
      .where('user_id', userId)
      .withGraphJoined('pathwayCourses')
      .where('pathwayCourses.pathway_id', pathwayIdArr[i]);

    if (completedCourses.length === allCourses.length) {
      returnStatus.status = true;
      returnStatus.pathwayId.push(pathwayIdArr[i]);
    }
  }
  return returnStatus;
}

async function insertIntoPathway(transaction, userId, pathwayId) {
  return PathwayCompletion.query(transaction)
    .context({ user_id: userId, pathway_id: pathwayId })
    .insert({ user_id: userId, pathway_id: pathwayId });
}

module.exports = {
  // checkCompletionEligibility,
  checkCourseCompletionEligibility,
  insertIntoCourse,
  deleteFromCourse,
  checkPathwayCompletionEligibility,
  insertIntoPathway,
};
