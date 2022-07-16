const Schmervice = require('schmervice');
const fs = require('fs-extra');
const path = require('path');
const _ = require('lodash');
const { val } = require('objection');
const { Translate } = require('@google-cloud/translate').v2;
const globals = require('node-global-storage');
const CONFIG = require('../config/index');

const CREDENTIALS = JSON.parse(CONFIG.auth.translation.googleTranslation);

const { errorHandler } = require('../errorHandling');

const translate = new Translate({
  credentials: CREDENTIALS,
  projectId: CREDENTIALS.project_id,
});
module.exports = class CourseEditorService extends Schmervice.Service {
  // googleTranslation v2
  // eslint-disable-next-line
  async quickstart(text, target) {
    try {
      const [translation] = await translate.translate(text, target);
      return translation;
    } catch (error) {
      return error;
    }
  }

  async createCourses(v1Courses) {
    const { Exercises, ProductionVersions } = this.server.models();
    try {
      // eslint-disable-next-line
      for (const course of v1Courses) {
        const courseSingle = _.pick(course, ['name', 'logo', 'short_description']);
        courseSingle.lang_available = val('en').asArray().castTo('text[]');
        if (!fs.existsSync(`curriculum_new/${courseSingle.name}`)) {
          fs.mkdirSync(`curriculum_new/${courseSingle.name}`);
        }
        if (!fs.existsSync(`curriculum_new/${courseSingle.name}/v1`)) {
          fs.mkdirSync(`curriculum_new/${courseSingle.name}/v1`);
        }
        // eslint-disable-next-line
        const courseExercises = await Exercises.query()
          .where('course_id', course.id)
          .orderBy('sequence_num');
        if (courseExercises.length > 0) {
          // eslint-disable-next-line
          for (const singleExercise of courseExercises) {
            const exerciseData = {};
            exerciseData.name =
              singleExercise.parent_exercise_id == null
                ? singleExercise.name
                : singleExercise.slug
                    .substring(
                      singleExercise.slug.lastIndexOf('__') + 2,
                      singleExercise.slug.lastIndexOf('_')
                    )
                    .replace(/\//g, '_');
            const filePath = singleExercise.slug.replace(/__/g, '/').replace(/_([^_]*)$/, '.$1');
            if (fs.existsSync(`curriculum/${filePath}`)) {
              const dataInString = fs.readFileSync(`curriculum/${filePath}`);
              exerciseData.description = `information about ${exerciseData.name}`;
              exerciseData.course_name = courseSingle.name;
              exerciseData.content = JSON.stringify(JSON.parse(dataInString.toString().trim()));
              exerciseData.sequence_num = singleExercise.sequence_num;
              exerciseData.type = 'exercise';
              // eslint-disable-next-line
              await this.addExercises(exerciseData);
              // eslint-disable-next-line
              await this.parseTranslatedData(course.name, filePath);
            }
          }
        }
        // eslint-disable-next-line
        const alreadyInsertedData = await ProductionVersions.query()
          .where('course_name', courseSingle.name)
          .andWhere('lang', 'en')
          .andWhere('version', 'v1');
        if (alreadyInsertedData.length <= 0) {
          const data = {};
          data.course_name = courseSingle.name;
          data.version = 'v1';
          // eslint-disable-next-line
          await ProductionVersions.query().insert(data);
        }
      }
      return [null, v1Courses];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async addExercises(data) {
    try {
      const courseFolderName = `curriculum_new/${data.course_name}/v1`;
      if (fs.existsSync(`${courseFolderName}`)) {
        fs.writeFileSync(
          path.resolve(`${courseFolderName}/${data.name}.json`),
          JSON.stringify(JSON.parse(data.content), null, '\t')
        );
      }
      // eslint-disable-next-line
      const [err, exerciseContant] = await this.parsedModifiedContent(
        courseFolderName,
        data.name,
        data.content,
        'curriculum_new'
      );
      data.content = exerciseContant;
      return [null, courseFolderName];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async parsedModifiedContent(
    courseFolderName,
    exerciseName,
    exerciseContent,
    basePath = 'curriculum_new'
  ) {
    try {
      const contentByParts = [];
      let contentKeys = '';
      let allJSONKeys;
      let beginKeyOn = 0;
      const parsedDataInString = JSON.parse(exerciseContent);
      // basePath=basePath.split("")
      _.map(parsedDataInString, (img) => {
        if (img.component === 'image') {
          if (!img.value.startsWith('http')) {
            const imagePath = `${courseFolderName}/${img.value}`;
            const awsS3Path = `https://${
              CONFIG.auth.aws.s3Bucket
            }.s3.ap-south-1.amazonaws.com/course_images/${imagePath.split(`curriculum_new/`)[1]}`;
            img.value = awsS3Path;
          }
        }
      });

      const parsedContent = JSON.parse(
        await this.parseIntoModifiedContent(
          `${courseFolderName}/${exerciseName}`,
          parsedDataInString,
          beginKeyOn
        )
      );
      if (parsedContent.length > 0) {
        const { beginKeyFrom, jsonKeys, ...contents } = parsedContent[0];
        beginKeyOn = beginKeyFrom;
        contentKeys += JSON.stringify(contents.value, null, 2);
        allJSONKeys = { ...allJSONKeys, ...jsonKeys };
        contentByParts.push(JSON.stringify(contents));
      }
      await this.createParsedContent(
        courseFolderName,
        exerciseName,
        contentKeys,
        allJSONKeys,
        basePath
      );
      const allContentByParts = JSON.stringify(contentByParts);
      return [null, allContentByParts];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  // eslint-disable-next-line
  async parseIntoModifiedContent(filePath, jsonContent, beginKeyOn) {
    const exerciseName = filePath.split('/').pop().split('.')[0];
    let keyNumber = beginKeyOn;
    let keyProp;
    const keyPropMapping = {};
    const exercise = [];
    _.map(jsonContent, (jsonData) => {
      if (
        jsonData.component !== 'code' &&
        jsonData.component !== 'table' &&
        jsonData.component !== 'youtube' &&
        jsonData.component !== 'image' &&
        jsonData.component !== 'banner' &&
        jsonData.component !== 'options' &&
        jsonData.component !== 'output'
      ) {
        let modifiedContent = '';
        keyNumber += 1;
        keyProp = `${exerciseName}_key${keyNumber}`;
        modifiedContent += `${keyProp}`;
        keyPropMapping[keyProp] = `${jsonData.value}`;
        jsonData.value = modifiedContent;
      } else if (jsonData.component === 'table') {
        _.map(jsonData.value, (table) => {
          let modifiedContent = '';
          keyNumber += 1;
          keyProp = `${exerciseName}_key${keyNumber}`;
          modifiedContent += `${keyProp}`;
          keyPropMapping[keyProp] = `${table.header}`;
          const itemsTable = [];
          _.map(table.items, (tokenText) => {
            let modifiedContentItems = '';
            keyNumber += 1;
            keyProp = `${exerciseName}_key${keyNumber}`;
            modifiedContentItems += `${keyProp}`;
            keyPropMapping[keyProp] = `${tokenText}`;
            itemsTable.push(modifiedContentItems);
          });
          table.header = modifiedContent;
          table.items = itemsTable;
        });
      } else if (jsonData.component === 'image') {
        let modifiedContent = '';
        keyNumber += 1;
        keyProp = `${exerciseName}_key${keyNumber}`;
        modifiedContent += `${keyProp}`;
        keyPropMapping[keyProp] = `${jsonData.alt}`;
        jsonData.alt = modifiedContent;
      } else if (jsonData.component === 'options') {
        // eslint-disable-next-line
        for (const i in jsonData.value) {
          let modifiedContent = '';
          keyNumber += 1;
          keyProp = `${exerciseName}_key${keyNumber}`;
          modifiedContent += `${keyProp}`;
          keyPropMapping[keyProp] = `${jsonData.value[i]}`;
          jsonData.value[i] = modifiedContent;
        }
      } else if (jsonData.component === 'output') {
        _.forEach(jsonData.value, (innerList) => {
          _.forEach(innerList, (innerToken) => {
            let modifiedContent = '';
            keyNumber += 1;
            keyProp = `${exerciseName}_key${keyNumber}`;
            modifiedContent += `${keyProp}`;
            keyPropMapping[keyProp] = `${innerToken.value}`;
            innerToken.value = modifiedContent;
          });
        });
      }
    });
    exercise.push({
      value: jsonContent,
      jsonKeys: keyPropMapping,
      beginKeyFrom: keyNumber,
    });

    /* eslint-enable */
    const formattedExercise = _.filter(exercise, (x) => x.value);
    return JSON.stringify(formattedExercise);
  }

  // eslint-disable-next-line
  async createParsedContent(
    courseFolderName,
    exerciseFileName,
    contentKeys,
    allJSONKeys,
    basePath = 'curriculum_new'
  ) {
    if (!fs.existsSync(`${courseFolderName}/PARSED_CONTENT`)) {
      fs.mkdirSync(`${courseFolderName}/PARSED_CONTENT`);
      fs.mkdirSync(`${courseFolderName}/PARSED_CONTENT/MODIFIED_FILES`);
      fs.mkdirSync(`${courseFolderName}/PARSED_CONTENT/PROPERTIES_FILES`);
    }
    let partPath = courseFolderName.split(`${basePath}/`)[1];
    partPath = partPath.split('/');
    fs.writeFileSync(
      path.resolve(
        `${courseFolderName}/PARSED_CONTENT/MODIFIED_FILES/${partPath[0]}_${partPath[1]}_${exerciseFileName}.json`
      ),
      contentKeys
    );
    fs.writeFileSync(
      path.resolve(
        `${courseFolderName}/PARSED_CONTENT/PROPERTIES_FILES/${partPath[0]}_${partPath[1]}_${exerciseFileName}_en.json`
      ),
      JSON.stringify(allJSONKeys, null, '\t')
    );
  }

  async findDetailInCourseVersionsById(course_name, lang = 'en') {
    const { ProductionVersions } = this.server.models();
    let course_version;
    try {
      course_version = await ProductionVersions.query()
        .where('course_name', course_name)
        .andWhere('lang', lang);
      return [null, course_version];
    } catch (err) {
      const error = errorHandler(err);
      return [error, null];
    }
  }

  // eslint-disable-next-line
  async getCourseExerciseForCourseEditor(
    modifiedFiledir,
    propertiesFiledir,
    course_name,
    lang = 'en'
  ) {
    try {
      const exercise = [];
      const filenames = fs.readdirSync(modifiedFiledir);
      let sequence = Math.floor(Math.random() * 1000 + 1);
      filenames.forEach((file) => {
        const exerciseData = {};
        const file_name = file.split('.');
        const exercise_name = file_name.slice(0, file_name.length - 1).join('.');
        const name = exercise_name.split('_');
        exerciseData.name = name.slice(2).join('_');
        exerciseData.course_name = course_name;
        const modifiedFile = `${modifiedFiledir}/${file}`;
        const propertiesFile = `${propertiesFiledir}/${exercise_name}_${lang}.json`;
        if (fs.existsSync(modifiedFile)) {
          const modifiedDataInString = JSON.parse(fs.readFileSync(modifiedFile));
          const propertiesDataInString = JSON.parse(fs.readFileSync(propertiesFile));
          _.map(modifiedDataInString, (modifiedCont) => {
            if (modifiedCont.component === 'image') {
              // eslint-disable-next-line
              if (propertiesDataInString.hasOwnProperty(modifiedCont.alt)) {
                modifiedCont.alt = propertiesDataInString[modifiedCont.alt];
              }
            } else if (modifiedCont.component === 'table') {
              _.map(modifiedCont.value, (tableDetails) => {
                // eslint-disable-next-line
                if (propertiesDataInString.hasOwnProperty(tableDetails.header)) {
                  tableDetails.header = propertiesDataInString[tableDetails.header];
                }
                // eslint-disable-next-line
                for (const item in tableDetails.items) {
                  // eslint-disable-next-line
                  if (propertiesDataInString.hasOwnProperty(tableDetails.items[item])) {
                    tableDetails.items[item] = propertiesDataInString[tableDetails.items[item]];
                  }
                }
              });
            } else if (modifiedCont.component === 'options') {
              // eslint-disable-next-line
              for (const element in modifiedCont.value) {
                // eslint-disable-next-line
                if (propertiesDataInString.hasOwnProperty(modifiedCont.value[element])) {
                  modifiedCont.value[element] = propertiesDataInString[modifiedCont.value[element]];
                }
              }
            } else if (modifiedCont.component === 'output') {
              _.forEach(modifiedCont.value, (innerList) => {
                _.forEach(innerList, (innerToken) => {
                  // eslint-disable-next-line
                  if (propertiesDataInString.hasOwnProperty(innerToken.value)) {
                    innerToken.value = propertiesDataInString[innerToken.value];
                  }
                });
              });
            } else {
              // eslint-disable-next-line
              if (propertiesDataInString.hasOwnProperty(modifiedCont.value)) {
                modifiedCont.value = propertiesDataInString[modifiedCont.value];
              }
            }
          });
          exerciseData.content = modifiedDataInString;
        }
        exerciseData.content_type = 'exercise';
        exerciseData.sequence_num = sequence;
        sequence += 1;
        exercise.push(exerciseData);
      });
      return [null, exercise];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async updateSingleExercises(courseFolderName, exerciseName, data, oldPath) {
    if (!fs.existsSync(`${courseFolderName}/${exerciseName}.json`)) {
      return [null, 'notUpdated'];
    }
    try {
      if (data.name !== undefined && data.content === undefined) {
        let partPath = courseFolderName.split('curriculum_new/')[1];
        partPath = partPath.split('/');
        if (fs.existsSync(`${courseFolderName}`)) {
          const courseData = fs.readFileSync(`${courseFolderName}/${exerciseName}.json`);
          const allJsonData = courseData.toString().trim();
          fs.renameSync(
            `${courseFolderName}/${exerciseName}.json`,
            `${courseFolderName}/${data.name}.json`
          );
          fs.renameSync(
            `${courseFolderName}/PARSED_CONTENT/MODIFIED_FILES/${partPath[0]}_${partPath[1]}_${exerciseName}.json`,
            `${courseFolderName}/PARSED_CONTENT/MODIFIED_FILES/${partPath[0]}_${partPath[1]}_${data.name}.json`
          );
          fs.renameSync(
            `${courseFolderName}/PARSED_CONTENT/PROPERTIES_FILES/${partPath[0]}_${partPath[1]}_${exerciseName}_en.json`,
            `${courseFolderName}/PARSED_CONTENT/PROPERTIES_FILES/${partPath[0]}_${partPath[1]}_${data.name}_en.json`
          );
          await this.parsedModifiedContent(courseFolderName, data.name, allJsonData);
        }
      } else if (data.content !== undefined && data.name === undefined) {
        if (fs.existsSync(`${courseFolderName}`)) {
          fs.writeFileSync(
            path.resolve(`${courseFolderName}/${exerciseName}.json`),
            JSON.stringify(JSON.parse(data.content), null, '\t')
          );
        }
        await this.parsedModifiedContent(courseFolderName, exerciseName, data.content);

        let partPath = courseFolderName.split('curriculum_new/')[1];
        partPath = partPath.split('/');

        let oldPartPath = oldPath.split('curriculum_new/')[1];
        oldPartPath = oldPartPath.split('/');

        const propertiesFilePath = `${courseFolderName}/PARSED_CONTENT/PROPERTIES_FILES/${partPath[0]}_${partPath[1]}_${exerciseName}`;
        const oldPropertiesFilePath = `${oldPath}/PARSED_CONTENT/PROPERTIES_FILES/${oldPartPath[0]}_${oldPartPath[1]}_${exerciseName}`;

        await this.fixedTranslation(propertiesFilePath, oldPropertiesFilePath, exerciseName);
      } else if (data.content !== undefined && data.name !== undefined) {
        let partPath = courseFolderName.split('curriculum_new/')[1];
        partPath = partPath.split('/');
        if (fs.existsSync(`${courseFolderName}`)) {
          fs.renameSync(
            `${courseFolderName}/${exerciseName}.json`,
            `${courseFolderName}/${data.name}.json`
          );
          fs.renameSync(
            `${courseFolderName}/PARSED_CONTENT/MODIFIED_FILES/${partPath[0]}_${partPath[1]}_${exerciseName}.json`,
            `${courseFolderName}/PARSED_CONTENT/MODIFIED_FILES/${partPath[0]}_${partPath[1]}_${data.name}.json`
          );
          fs.renameSync(
            `${courseFolderName}/PARSED_CONTENT/PROPERTIES_FILES/${partPath[0]}_${partPath[1]}_${exerciseName}_en.json`,
            `${courseFolderName}/PARSED_CONTENT/PROPERTIES_FILES/${partPath[0]}_${partPath[1]}_${data.name}_en.json`
          );
          if (fs.existsSync(`${courseFolderName}`)) {
            fs.writeFileSync(
              path.resolve(`${courseFolderName}/${data.name}.json`),
              JSON.stringify(JSON.parse(data.content), null, '\t')
            );
          }

          await this.parsedModifiedContent(courseFolderName, data.name, data.content);
        }
      }
      return [null, 'updated'];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  // eslint-disable-next-line
  async copyFolder(folderName, courseName, version, newVersion) {
    try {
      let result = false;
      if (!fs.existsSync(folderName)) {
        fs.mkdirSync(folderName);
        result = true;
      }
      if (result) {
        fs.copySync(`curriculum_new/${courseName}/${version}`, folderName);
      }
      fs.readdirSync(`${folderName}/PARSED_CONTENT/PROPERTIES_FILES`).forEach((file) => {
        fs.renameSync(
          `${folderName}/PARSED_CONTENT/PROPERTIES_FILES/${file}`,
          `${folderName}/PARSED_CONTENT/PROPERTIES_FILES/${file.replace(version, newVersion)}`
        );
      });
      return [null, result];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async addSingleExercise(courseFolderName, data) {
    try {
      if (fs.existsSync(`${courseFolderName}`)) {
        fs.writeFileSync(
          path.resolve(`${courseFolderName}/${data.name}.json`),
          JSON.stringify(JSON.parse(data.content), null, '\t')
        );
      }
      await this.parsedModifiedContent(courseFolderName, data.name, data.content);
      return [null, JSON.stringify(JSON.parse(data.content), null, '\t')];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async updateCourseVersion(course_name, version) {
    const { ProductionVersions } = this.server.models();
    try {
      const updated = await ProductionVersions.query()
        .patch({ version })
        .where('course_name', course_name);
      return [null, updated];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async parseTranslatedData(courseName, curriculumFilePath) {
    const { ProductionVersions } = this.server.models();
    try {
      const data = curriculumFilePath.split('/');
      const folderName = data.slice(0, 1).join('/');
      const contentPath = curriculumFilePath
        .split('/')
        .slice(1, data.length - 1)
        .join('/');
      const fileName = data.pop().split('.')[0];
      const language = ['hi', 'en', 'te', 'mr', 'ta'];
      // eslint-disable-next-line
      for (const lang in language) {
        let keyNumber = 0;
        const keyPropMapping = {};
        let keyProp;
        if (contentPath !== undefined && contentPath !== '' && contentPath !== null) {
          if (
            fs.existsSync(
              `curriculum/${folderName}/PARSED_CONTENT/PROPERTIES_FILES/${contentPath}/${courseName}_json_${fileName}_${language[lang]}.json`
            )
          ) {
            const content = fs.readFileSync(
              `curriculum/${folderName}/PARSED_CONTENT/PROPERTIES_FILES/${contentPath}/${courseName}_json_${fileName}_${language[lang]}.json`
            );
            const parsedContent = JSON.parse(content.toString().trim());
            _.forEach(parsedContent, (jsonContent) => {
              keyNumber += 1;
              keyProp = `${contentPath}_${fileName}_key${keyNumber}`;
              keyPropMapping[keyProp] = `${jsonContent}`;
            });
            fs.writeFileSync(
              path.resolve(
                `curriculum_new/${courseName}/v1/PARSED_CONTENT/PROPERTIES_FILES/${courseName}_v1_${contentPath}_${fileName}_${language[lang]}.json`
              ),
              JSON.stringify(keyPropMapping, null, '\t')
            );
            // eslint-disable-next-line
            const alreadyInsertedData = await ProductionVersions.query()
              .where('course_name', courseName)
              .andWhere('lang', language[lang])
              .andWhere('version', 'v1');
            if (alreadyInsertedData.length <= 0) {
              const details = {};
              details.course_name = courseName;
              details.lang = language[lang];
              details.version = 'v1';
              // eslint-disable-next-line
              await ProductionVersions.query().insert(details);
            }
          }
        } else {
          // eslint-disable-next-line
          if (
            fs.existsSync(
              `curriculum/${folderName}/PARSED_CONTENT/PROPERTIES_FILES/${courseName}_json_${fileName}_${language[lang]}.json`
            )
          ) {
            const content = fs.readFileSync(
              `curriculum/${folderName}/PARSED_CONTENT/PROPERTIES_FILES/${courseName}_json_${fileName}_${language[lang]}.json`
            );
            const parsedContent = JSON.parse(content.toString().trim());
            _.forEach(parsedContent, (jsonContent) => {
              keyNumber += 1;
              keyProp = `${fileName}_key${keyNumber}`;
              keyPropMapping[keyProp] = `${jsonContent}`;
            });

            fs.writeFileSync(
              path.resolve(
                `curriculum_new/${courseName}/v1/PARSED_CONTENT/PROPERTIES_FILES/${courseName}_v1_${fileName}_${language[lang]}.json`
              ),
              JSON.stringify(keyPropMapping, null, '\t')
            );
            // eslint-disable-next-line
            const alreadyInsertedData = await ProductionVersions.query()
              .where('course_name', courseName)
              .andWhere('lang', language[lang])
              .andWhere('version', 'v1');
            if (alreadyInsertedData.length <= 0) {
              const details = {};
              details.course_name = courseName;
              details.lang = language[lang];
              details.version = 'v1';
              // eslint-disable-next-line
              await ProductionVersions.query().insert(details);
            }
          }
        }
      }
      return [null, courseName];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async fixedTranslation(folderPath, oldFolderPath, fileName) {
    try {
      if (fs.existsSync(`${folderPath}_en.json`)) {
        const content = fs.readFileSync(`${folderPath}_en.json`);
        const parsedContent = JSON.parse(content.toString().trim());
        const oldContent = fs.readFileSync(`${oldFolderPath}_en.json`);
        const oldParsedContent = JSON.parse(oldContent.toString().trim());
        let keyProp;
        let keyNumber = 0;
        const keyPropMappingHi = {};
        const keyPropMappingTe = {};
        const keyPropMappingMr = {};
        const keyPropMappingTa = {};
        let key = '';
        // eslint-disable-next-line
        for (const NC in parsedContent) {
          let res = false;
          // eslint-disable-next-line
          for (const OC in oldParsedContent) {
            if (parsedContent[NC] === oldParsedContent[OC]) {
              key = OC;
              res = true;
              break;
            }
          }
          if (res) {
            keyNumber += 1;
            keyProp = `${fileName}_key${keyNumber}`;
            if (fs.existsSync(`${oldFolderPath}_hi.json`)) {
              const hindiContent = fs.readFileSync(`${oldFolderPath}_hi.json`);
              const hindiParsedContent = JSON.parse(hindiContent.toString().trim());
              keyPropMappingHi[keyProp] = `${hindiParsedContent[key]}`;
            }
            if (fs.existsSync(`${oldFolderPath}_te.json`)) {
              const teContent = fs.readFileSync(`${oldFolderPath}_te.json`);
              const teParsedContent = JSON.parse(teContent.toString().trim());
              keyPropMappingTe[keyProp] = `${teParsedContent[key]}`;
            }
            if (fs.existsSync(`${oldFolderPath}_mr.json`)) {
              const mrContent = fs.readFileSync(`${oldFolderPath}_mr.json`);
              const mrParsedContent = JSON.parse(mrContent.toString().trim());
              keyPropMappingMr[keyProp] = `${mrParsedContent[key]}`;
            }
            if (fs.existsSync(`${oldFolderPath}_ta.json`)) {
              const taContent = fs.readFileSync(`${oldFolderPath}_ta.json`);
              const taParsedContent = JSON.parse(taContent.toString().trim());
              keyPropMappingTa[keyProp] = `${taParsedContent[key]}`;
            }
          } else {
            keyNumber += 1;
            keyProp = `${fileName}_key${keyNumber}`;
            if (fs.existsSync(`${oldFolderPath}_hi.json`)) {
              // eslint-disable-next-line
              const translatedData = await this.quickstart(parsedContent[NC], 'hi');
              keyPropMappingHi[keyProp] = translatedData;
            }
            if (fs.existsSync(`${oldFolderPath}_te.json`)) {
              // eslint-disable-next-line
              const translatedData = await this.quickstart(parsedContent[NC], 'te');
              keyPropMappingTe[keyProp] = translatedData;
            }
            if (fs.existsSync(`${oldFolderPath}_mr.json`)) {
              // eslint-disable-next-line
              const translatedData = await this.quickstart(parsedContent[NC], 'mr');
              keyPropMappingMr[keyProp] = translatedData;
            }
            if (fs.existsSync(`${oldFolderPath}_ta.json`)) {
              // eslint-disable-next-line
              const translatedData = await this.quickstart(parsedContent[NC], 'ta');
              keyPropMappingTa[keyProp] = translatedData;
            }
          }
        }
        if (!_.isEmpty(keyPropMappingHi)) {
          fs.writeFileSync(
            path.resolve(`${folderPath}_hi.json`),
            JSON.stringify(keyPropMappingHi, null, '\t')
          );
        }
        if (!_.isEmpty(keyPropMappingTe)) {
          fs.writeFileSync(
            path.resolve(`${folderPath}_te.json`),
            JSON.stringify(keyPropMappingTe, null, '\t')
          );
        }
        if (!_.isEmpty(keyPropMappingMr)) {
          fs.writeFileSync(
            path.resolve(`${folderPath}_mr.json`),
            JSON.stringify(keyPropMappingMr, null, '\t')
          );
        }
        if (!_.isEmpty(keyPropMappingTa)) {
          fs.writeFileSync(
            path.resolve(`${folderPath}_ta.json`),
            JSON.stringify(keyPropMappingTa, null, '\t')
          );
        }
      }
      return [null, 'courseName'];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async StoreTranslatedContent() {
    const { Courses, Exercises } = this.server.models();
    let courses;
    try {
      courses = await Courses.query().where('course_type', 'json');
      const keyPropMappingHi = {};
      const keyPropMappingTe = {};
      const keyPropMappingMr = {};
      const keyPropMappingTa = {};
      // eslint-disable-next-line
      for (const course of courses) {
        const courseSingle = _.pick(course, ['name', 'logo', 'short_description']);
        courseSingle.lang_available = val('en').asArray().castTo('text[]');
        // eslint-disable-next-line
        const courseExercises = await Exercises.query()
          .where('course_id', course.id)
          .orderBy('sequence_num');
        if (courseExercises.length > 0) {
          // eslint-disable-next-line
          for (const singleExercise of courseExercises) {
            const filePath = singleExercise.slug.replace(/__/g, '/').replace(/_([^_]*)$/, '.$1');
            if (fs.existsSync(`curriculum/${filePath}`)) {
              const exerciseName = filePath.split('/').pop().split('.')[0];
              const fileRelPath = filePath.split('/').slice(1).join('/');
              const courseName = filePath.split('/')[0];
              let propertiesFilePath;
              if (fileRelPath.indexOf('/') > -1) {
                const subDir = fileRelPath.split('/')[0];
                propertiesFilePath = `curriculum/${courseName}/PARSED_CONTENT/PROPERTIES_FILES/${subDir}/${courseSingle.name}_json_${exerciseName}`;
              } else {
                propertiesFilePath = `curriculum/${courseName}/PARSED_CONTENT/PROPERTIES_FILES/${courseSingle.name}_json_${exerciseName}`;
              }
              if (fs.existsSync(`${propertiesFilePath}_en.json`)) {
                const Content = fs.readFileSync(`${propertiesFilePath}_en.json`);
                const parsedContent = JSON.parse(Content.toString().trim());
                // eslint-disable-next-line
                for (const NC in parsedContent) {
                  if (fs.existsSync(`${propertiesFilePath}_hi.json`)) {
                    const hindiContent = fs.readFileSync(`${propertiesFilePath}_hi.json`);
                    const hindiParsedContent = JSON.parse(hindiContent.toString().trim());
                    keyPropMappingHi[parsedContent[NC]] = `${hindiParsedContent[NC]}`;
                  }
                  if (fs.existsSync(`${propertiesFilePath}_te.json`)) {
                    const teContent = fs.readFileSync(`${propertiesFilePath}_te.json`);
                    const teParsedContent = JSON.parse(teContent.toString().trim());
                    keyPropMappingTe[parsedContent[NC]] = `${teParsedContent[NC]}`;
                  }
                  if (fs.existsSync(`${propertiesFilePath}_mr.json`)) {
                    const mrContent = fs.readFileSync(`${propertiesFilePath}_mr.json`);
                    const mrParsedContent = JSON.parse(mrContent.toString().trim());
                    keyPropMappingMr[parsedContent[NC]] = `${mrParsedContent[NC]}`;
                  }
                  if (fs.existsSync(`${propertiesFilePath}_ta.json`)) {
                    const taContent = fs.readFileSync(`${propertiesFilePath}_ta.json`);
                    const taParsedContent = JSON.parse(taContent.toString().trim());
                    keyPropMappingTa[parsedContent[NC]] = `${taParsedContent[NC]}`;
                  }
                }
              }
            }
          }
        }
        const listHi = [keyPropMappingHi];
        const listTe = [keyPropMappingTe];
        const listMr = [keyPropMappingMr];
        const listTa = [keyPropMappingTa];
        globals.set('HiContent', listHi);
        globals.set('MrContent', listMr);
        globals.set('TeContent', listTe);
        globals.set('TaContent', listTa);
      }
      return [null, courses];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }
};
