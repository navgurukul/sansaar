const fs = require('fs-extra');
const _ = require('lodash');
const path = require('path');
const glob = require('glob');
const { Translate } = require('@google-cloud/translate').v2;
const { base64encode, base64decode } = require('nodejs-base64');
const CONFIG = require('../config/index');

const CREDENTIALS = JSON.parse(CONFIG.auth.translation.googleTranslation);

class CoursesSeeder {
  constructor(googleTranslate, courseName, targetLang) {
    this.courseFiles = glob.sync(`**/curriculum/${courseName}/**/*en.json`);
    this.googleTranslate = googleTranslate;
    this.translate = new Translate({
      credentials: CREDENTIALS,
      projectId: CREDENTIALS.project_id,
    });
    this.targetLang = targetLang;
  }

  async init() {
    this.main();
    return true;
  }

  async main() {
    const target = this.targetLang;
    _.map(this.courseFiles, async (property) => {
      const fileData = JSON.parse(fs.readFileSync(`${property}`));
      /* eslint-disable */
      for (const index of _.keys(fileData)) {
        let backtickStr;
        let splitedData = fileData[index];
        if (splitedData.includes('`')) {
          backtickStr = splitedData.split('`');
          _.map(backtickStr, (str, index) => {
            if (index % 2 === 1) {
              let encoded = base64encode(str);
              backtickStr[index] = encoded;
            }
          });
          splitedData = backtickStr.join('`');
        }
        //encode span tag value;
        let spanStr;
        if (splitedData.includes('<span') && splitedData.includes('</span>')) {
          spanStr = splitedData.split('span');
          _.map(spanStr, (str, index) => {
            if (index % 2 === 1) {
              if (str.slice(-2) === '</' && str.length > 3) {
                let encoded = base64encode(
                  str.slice(/(">)/.exec(str).index + 2, /(<\/)/.exec(str).index)
                );
                spanStr[index] =
                  str.slice(0, /(">)/.exec(str).index + 2) +
                  encoded +
                  str.slice(/(<\/)/.exec(str).index);
              }
            }
          });
          splitedData = spanStr.join('span');
        }
        splitedData = await this.quickstart(splitedData, target);
        if (splitedData.includes('<span') && splitedData.includes('</span>')) {
          spanStr = splitedData.split('span');
          _.map(spanStr, (str, index) => {
            if (index % 2 === 1) {
              if (str.slice(-2) === '</') {
                let decoded = base64decode(
                  str.slice(/(">)/.exec(str).index + 2, /(<\/)/.exec(str).index)
                );
                spanStr[index] =
                  str.slice(0, /(">)/.exec(str).index + 2) +
                  decoded +
                  str.slice(/(<\/)/.exec(str).index);
              }
            }
          });
          splitedData = spanStr.join('span');
        }

        if (splitedData.includes('`')) {
          backtickStr = splitedData.split('`');
          _.map(backtickStr, (str, index) => {
            if (index % 2 === 1) {
              let decoded = base64decode(str);
              // console.log(decoded, 'decoded\n');
              backtickStr[index] = decoded;
            }
          });
          splitedData = backtickStr.join('`');
        }
        fileData[index] = splitedData;
      }
      /* eslint-disable */

      fs.writeFileSync(
        path.resolve(`${property.slice(0, -7)}${target}.json`),
        JSON.stringify(fileData, null, 4)
      );
    });
  }

  async quickstart(text, target) {
    try {
      // The text to translate
      const [translation] = await this.translate.translate(text, target);
      return translation;
    } catch (error) {
      console.error(error);
    }
  }

  static showErrorAndExit(message) {
    console.log(message);
    console.log('Fix the above error and re-run this script.');
    process.exit();
  }
  /* eslint-enable */

  static googleTranslate() {
    if (process.argv.indexOf('--googleTranslate') > -1) {
      return true;
    }
    return false;
  }

  /* eslint-disable */
  static targetLang() {
    const targetLang = process.argv[process.argv.indexOf('--googleTranslate') + 2].slice(2);
    const langCode = ['hi', 'en', 'te', 'mr', 'ta'];
    if (!targetLang) {
      this.showErrorAndExit('--googleTranslate lang needs to be specified.');
    }
    if (!langCode.includes(targetLang)) {
      this.showErrorAndExit(
        `Sorry, target lang code ${targetLang} is not available in our bucket! \nOur bucket:- ${langCode}\n`
      );
    }
    try {
      return targetLang;
    } catch (e) {
      this.showErrorAndExit(`The specified targetLang ${targetLang} needs to be specified.`);
    }
  }

  static getCourseName() {
    if (process.argv.indexOf('--googleTranslate') > -1) {
      const courseName = process.argv[process.argv.indexOf('--googleTranslate') + 1];
      if (!courseName) {
        this.showErrorAndExit('--googleTranslate course name needs to be specified.');
      }
      try {
        fs.statSync(path.resolve(`curriculum/${courseName}`)); // stat
        return courseName;
      } catch (e) {
        this.showErrorAndExit(
          `The specified courseName ${courseName} is doesn't exist in curriculum.`
        );
      }
    }
    return false;
  }
}

if (!module.parent) {
  const googleTranslate = CoursesSeeder.googleTranslate();
  const courseName = CoursesSeeder.getCourseName();
  const targetLang = CoursesSeeder.targetLang();
  const seeder = new CoursesSeeder(googleTranslate, courseName, targetLang);
  seeder.init().then((res) => {
    /* eslint-disable */
    if (res) {
      console.log('Successfully translated courses and exercises');
    } else {
      console.log(`${res}`);
    }
    /* eslint-enable */
  });
}
