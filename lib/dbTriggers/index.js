const ExerciseCompletion = require('../models/exerciseCompletion');
const ExerciseCompletionV2 = require('../models/exerciseCompletionV2');
const Exercises = require('../models/exercise');
const ExercisesV2 = require('../models/exercisesV2');
const CourseCompletion = require('../models/courseCompletion');
const CourseCompletionV2 = require('../models/courseCompletionV2');
const Courses = require('../models/courses');
const CoursesV2 = require('../models/coursesV2');
const PathwayCompletion = require('../models/pathwayCompletion');
const PathwayCompletionV2 = require('../models/pathwayCompletionV2');
const PathwayCourses = require('../models/pathwayCourses');
const PathwayCoursesV2 = require('../models/pathwayCoursesV2');
const { UTCToISTConverter } = require('../helpers/index');

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

async function checkCourseCompletionEligibility(transaction, userId, id, version = null) {
  if (version === 'V2') {
    const courseId = await ExercisesV2.query(transaction).select('course_id').where('id', id);
    const allEntriesForAnId = await CoursesV2.query(transaction)
      // eslint-disable-next-line
      .where('id', courseId[0]['course_id'])
      .withGraphFetched('exercisesV2');
    // eslint-disable-next-line
    const lengthOfExistingEntries = allEntriesForAnId[0]['exercisesV2'].length;
    const allEntries = await ExerciseCompletionV2.query(transaction)
      .where({ user_id: userId })
      .withGraphFetched('exercisesV2');
    const filteredEntries = allEntries.filter((entry) => {
      // eslint-disable-next-line
      return entry['exercisesV2'][0]['course_id'] === courseId[0]['course_id'];
    });
    const lengthOfTotalEntries = filteredEntries.length;
    if (lengthOfExistingEntries === lengthOfTotalEntries) {
      return { status: true, courseId: courseId[0].course_id };
    }
    return { status: false, courseId: courseId[0].course_id };
  }
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

async function insertIntoCourse(transaction, userId, courseId,version = null) {


  const dateIST = UTCToISTConverter(new Date());
  if (version === 'V2') {
    return CourseCompletionV2.query(transaction)
      .context({ user_id: userId, course_id: courseId ,complete_at : dateIST})
      .insert({ user_id: userId, course_id: courseId ,complete_at : dateIST});
  }
  return CourseCompletion.query(transaction)
    .context({ user_id: userId, course_id: courseId })
    .insert({ user_id: userId, course_id: courseId });
}

async function deleteFromCourse(transaction, userId, courseId, version = null) {
  if (version === 'V2') {
    const course = await CourseCompletionV2.query(transaction).where({
      user_id: userId,
      course_id: courseId,
    });
    if (course.length > 0) {
      const courseCompletion = CourseCompletionV2.fromJson({
        id: course[0].id,
        user_id: userId,
        course_id: courseId,
      });
      await courseCompletion
        .$query(transaction)
        .context({ user_id: userId, course_id: courseId })
        .delete();
    }
  } else {
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
}

async function checkPathwayCompletionEligibility(transaction, userId, id, version = null) {
  const returnStatus = { status: false, pathwayId: [] };

  if (version === 'V2') {
    const pathwayId = await PathwayCoursesV2.query(transaction)
      .select('pathway_id')
      .where('course_id', id);

    const pathwayIdArr = pathwayId.map((pathway) => {
      return pathway.pathway_id;
    });
    const promisesAllCourses = [];
    const promisesCompletedCourses = [];

    for (let i = 0; i < pathwayIdArr.length; i += 1) {
      const allCourses = PathwayCoursesV2.query(transaction)
        .select('course_id')
        .where('pathway_id', pathwayIdArr[i]);
      promisesAllCourses.push(allCourses);
      const completedCourses = CourseCompletionV2.query(transaction)
        .where('user_id', userId)
        .withGraphJoined('pathwayCoursesV2')
        .where('pathwayCoursesV2.pathway_id', pathwayIdArr[i]);
      promisesCompletedCourses.push(completedCourses);

      // if (completedCourses.length === allCourses.length) {
      // returnStatus.status = true;
      // returnStatus.pathwayId.push(pathwayIdArr[i]);
      // }
    }

    // #REVIEW
    const resolvedAllCourses = await Promise.all(promisesAllCourses);
    const resolvedCompletedCourses = await Promise.all(promisesCompletedCourses);
    for (let i = 0; i < resolvedAllCourses.length; i += 1) {
      if (resolvedAllCourses[i].length === resolvedCompletedCourses[i].length) {
        returnStatus.status = true;
        returnStatus.pathwayId.push(pathwayIdArr[i]);
      } else {
        returnStatus.status = false;
        returnStatus.pathwayId.push(pathwayIdArr[i]);
      }
    }

    return returnStatus;
  }
  const pathwayId = await PathwayCourses.query(transaction)
    .select('pathway_id')
    .where('course_id', id);

  const pathwayIdArr = pathwayId.map((pathway) => {
    return pathway.pathway_id;
  });
  const promisesAllCourses = [];
  const promisesCompletedCourses = [];

  for (let i = 0; i < pathwayIdArr.length; i += 1) {
    const allCourses = PathwayCourses.query(transaction)
      .select('course_id')
      .where('pathway_id', pathwayIdArr[i]);
    promisesAllCourses.push(allCourses);
    const completedCourses = CourseCompletion.query(transaction)
      .where('user_id', userId)
      .withGraphJoined('pathwayCourses')
      .where('pathwayCourses.pathway_id', pathwayIdArr[i]);
    promisesCompletedCourses.push(completedCourses);

    // if (completedCourses.length === allCourses.length) {
    // returnStatus.status = true;
    // returnStatus.pathwayId.push(pathwayIdArr[i]);
    // }
  }

  // #REVIEW
  const resolvedAllCourses = await Promise.all(promisesAllCourses);
  const resolvedCompletedCourses = await Promise.all(promisesCompletedCourses);
  for (let i = 0; i < resolvedAllCourses.length; i += 1) {
    if (resolvedAllCourses[i].length === resolvedCompletedCourses[i].length) {
      returnStatus.status = true;
      returnStatus.pathwayId.push(pathwayIdArr[i]);
    } else {
      returnStatus.status = false;
      returnStatus.pathwayId.push(pathwayIdArr[i]);
    }
  }

  return returnStatus;
}

async function insertIntoPathway(transaction, userId, pathwayId, version = null) {
  const dateIST = UTCToISTConverter(new Date());
  if (version === 'V2') {
    return PathwayCompletionV2.query(transaction)
      .context({ user_id: userId, pathway_id: pathwayId ,complete_at:dateIST})
      .insert({ user_id: userId, pathway_id: pathwayId ,complete_at:dateIST});
  }
  return PathwayCompletion.query(transaction)
    .context({ user_id: userId, pathway_id: pathwayId })
    .insert({ user_id: userId, pathway_id: pathwayId });
}

async function deleteFromPathway(transaction, userId, pathwayId, version = null) {
  // const pathway = await PathwayCompletion.query(transaction).where({
  //   user_id: userId,
  //   pathway_id: pathwayId,
  // });
  // if (pathway.length > 0) {
  //   const pathwayCompletion = PathwayCompletion.fromJson({
  //     id: pathway[0].id,
  //     user_id: userId,
  //     pathway_id: pathwayId,
  //   });
  //   await pathwayCompletion
  //     .$query(transaction)
  //     .context({ user_id: userId, pathway_id: pathwayId })
  //     .delete();
  // }
  if (version === 'V2') {
    await PathwayCompletionV2.query(transaction)
      .del()
      .where('user_id', userId)
      .andWhere('pathway_id', pathwayId);
  }
  await PathwayCompletion.query(transaction)
    .del()
    .where('user_id', userId)
    .andWhere('pathway_id', pathwayId);
}

module.exports = {
  // checkCompletionEligibility,
  checkCourseCompletionEligibility,
  insertIntoCourse,
  deleteFromCourse,
  checkPathwayCompletionEligibility,
  insertIntoPathway,
  deleteFromPathway,
};
