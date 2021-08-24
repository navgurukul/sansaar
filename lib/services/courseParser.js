const Schmervice = require('schmervice');
const fs = require('fs-extra');
const path = require('path');
const CourseSeeder = require('../courseParser');

module.exports = class CourseParserService extends Schmervice.Service {
  async courseParser(courseFolderName, updateDB) {
    const { coursesService } = this.server.services();
    try {
      fs.statSync(path.resolve(`curriculum/${courseFolderName}`));
    } catch (e) {
      return {
        error: true,
        message: `The specified course ${courseFolderName} doesn't exist in curriculum.`,
      };
    }
    const seeder = new CourseSeeder(true, courseFolderName, updateDB);
    let result;
    await seeder.init().then((res) => {
      if (res) {
        result = { success: true, message: `Successfully seeded ${courseFolderName}` };
      } else {
        // console.log(`${res}`);
        result = res;
      }
    });
    coursesService.reloadPropertiesFiles();
    return result;
  }
};
