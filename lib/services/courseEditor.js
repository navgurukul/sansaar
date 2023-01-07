async updateCourseEditor(courseId, courseDetails) {
    const { CoursesV2, CourseProductionVersions } = this.server.models();
    if (courseDetails.lang_available) {
      courseDetails.lang_available = val(courseDetails.lang_available).asArray().castTo('text[]');
    }
    try {
      if (courseDetails.name !== undefined) {
        const availableCourses = await CoursesV2.query().findById(courseId);
        const availableVersion = await CourseProductionVersions.query().select('version').where({ 'course_id': courseId })

        const version = parseInt(availableVersion[0].version.split('')[1])+1 
        if (availableCourses !== undefined) {
          const currentFolderName = `${availableCourses.name}_${courseId}`;
          const newFolderName = `${courseDetails.name}_${courseId}`;
          for(let verseionCount=1; verseionCount<=version; verseionCount+=1){
            if (fs.existsSync(`curriculum_v2/${currentFolderName}/v${verseionCount}/PARSED_CONTENT/MODIFIED_FILES`)) {
              const files = fs.readdirSync(
                `curriculum_v2/${currentFolderName}/v${verseionCount}/PARSED_CONTENT/MODIFIED_FILES`
              );
              _.map(files, (file) => {
                const newFileName = file.replace(currentFolderName, newFolderName)
                console.log("new file", newFileName)
                console.log("hel", currentFolderName, newFolderName)
                fs.renameSync(
                  `curriculum_v2/${currentFolderName}/v${verseionCount}/PARSED_CONTENT/MODIFIED_FILES/${file}`,
                  `curriculum_v2/${currentFolderName}/v${verseionCount}/PARSED_CONTENT/MODIFIED_FILES/${newFileName}`
                );
              });
            }
            if (
              fs.existsSync(`curriculum_v2/${currentFolderName}/v${verseionCount}/PARSED_CONTENT/PROPERTIES_FILES`)
            ) {
              const files = fs.readdirSync(
                `curriculum_v2/${currentFolderName}/v${verseionCount}/PARSED_CONTENT/PROPERTIES_FILES`
              );
              _.map(files, (file) => {
                const newFileName = file.replace(currentFolderName, newFolderName);
                fs.renameSync(
                  `curriculum_v2/${currentFolderName}/v${verseionCount}/PARSED_CONTENT/PROPERTIES_FILES/${file}`,
                  `curriculum_v2/${currentFolderName}/v${verseionCount}/PARSED_CONTENT/PROPERTIES_FILES/${newFileName}`
                );
              });
            }
          }
          if (fs.existsSync(`curriculum_v2/${currentFolderName}`)) {
            fs.renameSync(`curriculum_v2/${currentFolderName}`, `curriculum_v2/${newFolderName}`);
          }

        }
      }
      const course = await CoursesV2.query().patch(courseDetails).where('id', courseId);
      return [null, course];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }
};