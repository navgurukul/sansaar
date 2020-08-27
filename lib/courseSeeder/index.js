'use strict';
const { promisify } = require('util');
const marked = require('marked');
const fs = require('fs-extra');
const process = require('process');
const _ = require('lodash');
const axios = require('axios');
const CourseSeeder = require('../helpers/courseSeeder');
const { promises } = require('fs-extra');
const { exec } = require('child_process');
const Schmervice = require('schmervice');


class QuestionSeeder {
  constructor() {
    this.courseDir = '../../curriculum';
    this.allCourseFolder = [];
    this.courseDetails = [];
    this.exercises = [];
  }

  async init() {
    await this.getAllCourseFile();
    const promises = [];
    _.map(this.allCourseFolder, (folder) => {
       promises.push(this.parseCourseDir(folder))
    });
    await Promise.all(promises)
    await this.addCourse();
    await this.addUpdateExercise();
    return true;
  }

  async getAllCourseFile() {
    const dir = await fs.promises.opendir(this.courseDir)
    for await (const dirent of dir) {
      if (!dirent.name.match(/.md/g)) {
        this.allCourseFolder.push(dirent.name)
      }
    }
  }

  async parseCourseDir(folder) {
    const path = `${this.courseDir}/${folder}/index.md`;
    if (fs.existsSync(path)) {
      const course = {};
      const courseDetails = await this.parseCourseDetails(path.replace('index.md', 'info.md'));
      this.courseDetails.push(courseDetails);
      course.courseDetails = courseDetails;
      const data = fs.readFileSync(path);
      const tokens = marked.lexer(data.toString());
      const { items } = tokens[0];
      const exerciseFile = [];
      _.map(items, (item) => {
        const exerciseFiles = item.tokens;
        _.map(exerciseFiles, (file, index) => {
          const allExerciseFile = {};
          if (file.type === 'text') {
            if (file.text.match(/.md/g)) {
              allExerciseFile.fileName = file.text;
              allExerciseFile.childExercise = [];
              exerciseFile.push(allExerciseFile);
            }
          } else if (file.type === 'list') {
            allExerciseFile.fileName = exerciseFiles[index - 1].text;
            allExerciseFile.childExercise = [];
            _.map(file.items, (childExerciseFile) => {
              allExerciseFile.childExercise.push(childExerciseFile.text);
            });
            exerciseFile.push(allExerciseFile);
          }
        });
      });
      const promises = [];
      const courseId = courseDetails ? courseDetails.id : null;
      _.map(exerciseFile, (file) => {
        promises.push(this.parseExerciseDetails(file, folder, courseId))
      });
      const exerciseDetails = await Promise.all(promises)
      course.exerciseDetails = (exerciseDetails);
      this.exercises.push(course)
    } else {
      console.log(`${path} is not exist`)
    }
    return true;
  }

  async parseCourseDetails(path) {
    if (fs.existsSync(path)) {
      const data = fs.readFileSync(path);
      const tokens = marked.lexer(data.toString());
      const courseDetails = {};
      const items = tokens[0].text.split('\n');
      _.map(items, (item) => {
        var split = item.split(': ');
        if (split[1]) {
          courseDetails[split[0]] = split[1]
        } else {
          let logo = split[0].split(':')
          courseDetails[logo[0]] = logo[1] + ":"+ logo[2]
        }
      });
      const courseId = await this.getCourseId(courseDetails.name);
      courseDetails.id = courseId;
      if (!courseDetails.logo) {
        courseDetails.logo = "http://navgurukul.org/img/sqlogo.jpg"
      }
      return courseDetails;
    }
  }

  async parseExerciseDetails(file, folder, courseId) {
    const basePath = `${this.courseDir}/${folder}/${file.fileName}`
    const exercise = {};
    const promises = [];
    let content = '';
    if (file.childExercise.length) {
      _.map(file.childExercise, (childExerciseFile) => {
        const path = `${basePath}/${childExerciseFile}`
        promises.push(this.parseChildExercise(path ,courseId, childExerciseFile))
      });
    } else {
      const path = basePath.replace(/\s/g, '');
      if (fs.existsSync(path)) {
        const data = fs.readFileSync(path);
        const tokens = marked.lexer(data.toString());
        _.map(tokens, (exer) => {
          if (!exer.raw.match(/```ngMeta/g)) {
            content += exer.raw;
          }
          if (exer.lang === 'ngMeta') {
            exercise.name = exer.text.replace('name: ', '').replace('\nsubmission_type: url', '');
          }
        });
        const name = file.fileName.replace('.md', '').replace('-',' ')
        exercise.name = exercise.name ? exercise.name:  name.charAt(0).toUpperCase() + name.slice(1) 
        exercise.course_id = courseId;
        exercise.content = content;
        exercise.slug = path.replace('../../curriculum/','').replace('/', '__').replace('.md', '');
        return exercise;
      }
    }
    const childExercise = await Promise.all(promises);
    return { childExercise };
  }

  async parseChildExercise(path, courseId, childExerciseFile) {
    const exercise = {};
    let content = '';
    const childExercisePath = path.replace(/\s/g, '')
    if (fs.existsSync(childExercisePath )) {
      const data = fs.readFileSync(childExercisePath);
      const tokens = marked.lexer(data.toString());
      _.map(tokens, (exerciseContent, index) => {
        if (!exerciseContent.raw.match(/```ngMeta/g)) {
          content += exerciseContent.raw;
        }
        if (exerciseContent.lang === 'ngMeta') {
          exercise.name = exerciseContent.text
            .replace('name: ', '')
            .replace('\nsubmission_type: url', '');
        }
      });
      const name = childExerciseFile.replace('.md', '').replace('-', ' ')
      exercise.name = exercise.name ? exercise.name: name.charAt(0).toUpperCase() + name.slice(1)
      exercise.course_id = courseId;
      exercise.content = content;
      exercise.slug = childExercisePath.replace('../../curriculum/','').replace('/', '__').replace('.md', '');
      return exercise;
    }
  }
  
  async addCourse() {
    const promises = [];
    _.map(this.courseDetails, (course) => {
      if (course){
        if (!course.id) {
          delete course.id;
          promises.push(axios.post(`http://localhost:5000/course`, course)) 
        }
      }
    })
    const insertCourses = await Promise.all(promises);
    _.map(insertCourses, (insertedCourse) => {
      const { newCourse } = insertedCourse.data;
      _.map(this.exercises, (course, index) => {
          if (course) { 
            if (course.courseDetails.name === newCourse.name) {
              this.exercises[index].courseDetails.id = newCourse.id;        
              _.map(this.exercises[index].exerciseDetails, (child, i) => {
                if (child.childExercise) {
                const updateChildExCourseId = this.exercises[index].exerciseDetails[i].childExercise.filter(childEx = childEx.course_id = newCourse.id)
                this.exercises[index].exerciseDetails[i].childExercise = updateChildExCourseId;
                }
              })
              const updatedExerciseDetails = this.exercises[index].exerciseDetails.filter(x => x.course_id  ? x.course_id = newCourse.id :x);
              this.exercises[index].exerciseDetails = updatedExerciseDetails;
            }
          }
      });
    })
    return true;
  }
  
  async addUpdateExercise() {
    let promises = [];
    _.map(this.exercises, (exercises) => {
      _.map(exercises.exerciseDetails, (exercise) => {
        if (!exercise.length) {
          promises.push(axios.post('http://localhost:5000/exercise', { exercise }))  
        } else {
          promises.push(axios.post('http://localhost:5000/exercise', { childExercise: exercise.childExercise}))
        }
      })
    });
    await Promise.all(promises)
    return true;
  }
  
  async getCourseId(name) {
    const res = await axios.get(`http://localhost:5000/course/name`, { params: {name: name} })
    const id = res.data.course.length ? res.data.course[0].id : null;
    return id;
  }
}

if (!module.parent) {
  let seeder = new QuestionSeeder()
  seeder.init()
    .then((res) => {
      if (res) {
        console.log("Successfully seeded courses and exercises")
      } else {
        console.log(`${res}`)
      }
    })
}