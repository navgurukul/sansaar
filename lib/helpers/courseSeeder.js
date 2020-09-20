const _ = require('lodash');
const fs = require('fs-extra');
const marked = require('marked');

module.exports = class CourseSeeder {
  constructor(courseName, courseId) {
    this.courseId = courseId;
    this.exerciseFiles = [];
    this.courseDir = `curriculum/${courseName}`;
    this.courseName = courseName;
    this.exercises = [];
  }

  async init() {
    await this.getExerciseFiles();

    _.map(this.exerciseFiles, (file) => {
      return this.parseExercise(file);
    });

    return this.exercises;
  }

  async getExerciseFiles() {
    const data = fs.readFileSync(`${this.courseDir}/index.md`);
    const tokens = marked.lexer(data.toString());
    const { items } = tokens[0];
    _.map(items, (item) => {
      const exerciseFiles = item.tokens;
      _.map(exerciseFiles, (file, index) => {
        const allExerciseFile = {};
        if (file.type === 'text') {
          if (file.text.match(/.md/g)) {
            allExerciseFile.fileName = file.text;
            allExerciseFile.childExercise = [];
            this.exerciseFiles.push(allExerciseFile);
          }
        } else if (file.type === 'list') {
          allExerciseFile.fileName = exerciseFiles[index - 1].text;
          allExerciseFile.childExercise = [];
          _.map(file.items, (childExerciseFile) => {
            allExerciseFile.childExercise.push(childExerciseFile.text);
          });
          this.exerciseFiles.push(allExerciseFile);
        }
      });
    });
  }

  async parseExercise(file) {
    const exercise = {};
    let content = '';
    if (file.childExercise.length) {
      _.map(file.childExercise, (childExerciseFile) => {
        return this.parseChildExercise(file.fileName, childExerciseFile);
      });
    } else {
      const data = fs.readFileSync(`${this.courseDir}/${file.fileName}`);
      const tokens = marked.lexer(data.toString());
      _.map(tokens, (exer) => {
        if (!exer.raw.match(/```ngMeta/g)) {
          content += exer.raw;
        }
        if (exer.lang === 'ngMeta') {
          exercise.name = exer.text.replace('name: ', '').replace('\nsubmission_type: url', '');
        }
      });
      exercise.course_id = this.courseId;
      exercise.content = content;
      // exercise['slug'] = `${this.courseName}_${file.fileName.replace('.md', '')}`
      this.exercises.push(exercise);
    }
  }

  async parseChildExercise(file, childExerciseFile) {
    const exercise = {};
    let content = '';
    const data = fs.readFileSync(`${this.courseDir}/${file}/${childExerciseFile}`);
    const tokens = marked.lexer(data.toString());
    _.map(tokens, (exerciseContent) => {
      if (!exerciseContent.raw.match(/```ngMeta/g)) {
        content += exerciseContent.raw;
      }
      if (exerciseContent.lang === 'ngMeta') {
        exercise.name = exerciseContent.text
          .replace('name: ', '')
          .replace('\nsubmission_type: url', '');
      }
    });
    exercise.course_id = this.courseId;
    exercise.content = content;
    // exercise['slug'] = `${this.courseName}_${topic}/${childExerciseFile.replace('.md', '')}`
    this.exercises.push(exercise);
  }
};
