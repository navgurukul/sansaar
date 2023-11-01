const AWS = require('aws-sdk');
const axios = require('axios');
const { promisify } = require('util');

const CONSTANTS = require('../config/index');

AWS.config.update({
  accessKeyId: CONSTANTS.auth.merakiScratch.scratchS3SecretKeyId,
  secretAccessKey: CONSTANTS.auth.merakiScratch.scratchS3SecretAccessKey,
  region: CONSTANTS.auth.aws.s3Region,
});

const S3Bucket = new AWS.S3();
const uploadPromise = promisify(S3Bucket.upload.bind(S3Bucket)); // Convert S3 upload to a Promise-based function

exports.seed = async function (knex) {
  try {
    const scratchData = await knex('main.scratch').select('*');
    let project_count = 0;

    for (const projectData of scratchData) {
      if (project_count === 5) break;
      const project_id = projectData.project_id;
      const key = `scratch/${projectData.project_id}.sb3`;
      const sourceURL = projectData.url; // URL from your database
      const destBucket = CONSTANTS.auth.merakiScratch.scratchBucket;

      // Use axios to fetch the object from the source URL
      const response = await axios.get(sourceURL, { responseType: 'arraybuffer' });
      const urldata = Buffer.from(response.data, 'binary');

      // Upload the object to the new S3 bucket
      const uploadParams = {
        Bucket: destBucket,
        Key: key,
        Body: urldata,
      };

      try {
        const uploaded = await uploadPromise(uploadParams);
        console.log(uploaded, 'successfully uploaded url to s3 bucket');
      } catch (err) {
        console.error('Error uploading to S3:', err);
      }
      let newURL = `https://${destBucket}.s3.amazonaws.com/${key}`;
      const update_data = await knex('main.scratch')
        .update({
          url: newURL,
          project_name:'test' ,
        })
        .where('project_id', project_id);
      console.log(update_data);
      project_count += 1;
    }

    console.log(
      `\n${project_count} projects have been successfully uploaded to the new S3 bucket.`
    );
  } catch (error) {
    console.error(error);
    return error;
  }
};
