const AWS = require('aws-sdk');
const axios = require('axios'); // Include axios library
const CONSTANTS = require('../config/index');

const S3Bucket = new AWS.S3({
  accessKeyId: CONSTANTS.auth.merakiScratch.scratchS3SecretKeyId,
  secretAccessKey: CONSTANTS.auth.merakiScratch.scratchS3SecretAccessKey,
  region: CONSTANTS.auth.aws.s3Region,
});

AWS.config.update({
  accessKeyId: CONSTANTS.auth.merakiScratch.scratchS3SecretKeyId,
  secretAccessKey: CONSTANTS.auth.merakiScratch.scratchS3SecretAccessKey,
  region: CONSTANTS.auth.aws.s3Region,
});

exports.seed = async function (knex) {
  try {
    const scratchData = await knex('main.scratch').select('*');
    let project_count = 0;
    for (const projectData of scratchData) {
      const key = `scratch/${projectData.project_id}.sb3`;
      const url = `https://${CONSTANTS.auth.merakiScratch.scratchBucket}.s3.ap-south-1.amazonaws.com/${key}`;

      const { project_id } = projectData;
      let { project_name } = projectData;

      if (!projectData.project_name.includes('.sb3')) {
        project_name = `${projectData.project_name}.sb3`;
      }

      const response = await axios.get(projectData.url, { responseType: 'arraybuffer' });
      const urldata = Buffer.from(response.data, 'binary');
      const uploadParams = {
        Bucket: CONSTANTS.auth.merakiScratch.scratchBucket,
        Key: key,
        Body: urldata,
      };

      // const deleteParams = { Bucket: CONSTANTS.auth.merakiScratch.scratchBucket, Key :key };
      // const result = await S3Bucket.deleteObject(deleteParams).promise();
      const uploader = S3Bucket.upload(uploadParams);
      const uploaded = await uploader.promise();
      console.log(uploaded.Location, 'The file has been successfully uploaded to the S3 bucket.');
      await knex('main.scratch')
        .update({
          url,
          project_name,
        })
        .where('project_id', project_id);
      project_count += 1;
    }
    console.log(`\n${project_count} projects have been successfully updated in the new S3 bucket.`);
  } catch (error) {
    console.error(error);
    return error;
  }
};
