const marked = require('marked');
const fs = require('fs-extra');
const { statSync, readdirSync } = require('fs');
const axios = require('axios');
const AWS = require('aws-sdk');
const _ = require('lodash');
const path = require('path');
const CONFIG = require('../config/index');

const s3 = new AWS.S3({
  secretAccessKey: CONFIG.auth.aws.s3SecretAccessKey,
  accessKeyId: CONFIG.auth.aws.s3SecretKeyId,
  region: CONFIG.auth.aws.s3Region,
});


class ImageUploaderSeeder {
    constructor(addUpdateSingleCourse, courseName) {

    }
  
    async init() {
        return true
    }

async parseAndUploadImage(imageDir) {
    fs.readdir(imageDir, (err, filenames) => {
        if (!err) {
        _.forEach(filenames, (file) => {
            if (file.match(/\.(png|jpg|jpeg|gif)/)) {
            const fullPath = `${imageDir}/${file}`;
            const imageBuffer = fs.readFileSync(fullPath);
            this.s3Uploader(fullPath, imageBuffer);
            } else {
            const nestedPath = `${imageDir}/${file}`;
            fs.readdir(nestedPath, (error, nestedfilenames) => {
                if (!error) {
                _.forEach(nestedfilenames, (nestedFile) => {
                    const nestedFullPath = `${nestedPath}/${nestedFile}`;
                    const nestedImageBuffer = fs.readFileSync(nestedFullPath);
                    this.s3Uploader(nestedFullPath, nestedImageBuffer);
                });
                }
            });
            }
        });
        }
    });
    }

  async s3Uploader(filePath, imageData) {
    // eslint-disable-next-line
    this.cloudPath = filePath.split('curriculum/')[1];
    this.extn = filePath.split('.').pop();
    this.contentType = `image/${this.extn}`;
    const params = {
      Bucket: CONFIG.auth.aws.s3Bucket,
      Key: `course_images/${this.cloudPath}`,
      Body: imageData,
      ContentType: this.contentType,
      ACL: 'public-read',
    };
    // eslint-disable-next-line
    s3.upload(params, (err, data) => {
      if (err) {
        throw err;
      }
      // eslint-disable-next-line
      return {
        //   relativePath: imagePath,
        awsLink: `https://${CONFIG.auth.aws.s3Bucket}.s3.ap-south-1.amazonaws.com/course_images${this.cloudPath}`,
        //   imageMD: imageText,
      };
    });
  }
    static UpdateImageToAws() {
        if (process.argv.indexOf('--UpdateImageToAws') > -1) {
            return true;
        }
        return false;
    }

    static getCourseName() {
        if (process.argv.indexOf('--UpdateImageToAws') > -1) {
          const courseName = process.argv[process.argv.indexOf('--UpdateImageToAws') + 1];
          console.log(courseName,"cournse name")
          if (!courseName) {
            this.showErrorAndExit('--UpdateImageToAws course name needs to be specified.');
          }
          try {
            var ImageDir = path.resolve(`../../curriculum_new/${courseName}`)
            console.log(fs.statSync(path.resolve(`../../curriculum_new/${courseName}`))); // stat
            return courseName;
          } catch (e) {
            console.log(e,"e")
            // this.showErrorAndExit(
            //   `The specified courseName ${courseName} is doesn't exist in new curriculum.`
            // );
          }
        }
        return false;
    }
}
  
if (!module.parent) {
    const addUpdateSingleCourse = ImageUploaderSeeder.UpdateImageToAws();
    const courseName = ImageUploaderSeeder.getCourseName();
    const seeder = new ImageUploaderSeeder(addUpdateSingleCourse, courseName);
    seeder.init().then((res) => {
      /* eslint-disable */
      if (res) {
        console.log('Successfully uploaded all the images');
      } else {
        console.log(`${res}`,"else");
      }
      /* eslint-enable */
    });
  }
  