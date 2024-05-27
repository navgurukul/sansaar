    const AWS = require('aws-sdk');
    const CONSTANTS = require('../config/index');

    AWS.config.update({
      accessKeyId: CONSTANTS.auth.merakiScratch.scratchS3SecretKeyId,
      secretAccessKey: CONSTANTS.auth.merakiScratch.scratchS3SecretAccessKey,
      region: CONSTANTS.auth.aws.s3Region,
    });

    const s3 = new AWS.S3();

    exports.seed = async function (knex) {
      try {
        const scratchData = await knex('main.scratch').where('userId_scratch',2562).orderBy('id').select('*');      
        let project_count = 0;
        let notFound_and_Delete = 0;
        for (const projectData of scratchData) {
          const key = `scratch/${projectData.project_id}.sb3`;
          const url = `https://${CONSTANTS.auth.merakiScratch.scratchBucket}.s3.ap-south-1.amazonaws.com/${key}`;
          const { project_id } = projectData;
          let { project_name } = projectData;

          if (!projectData.project_name.includes('.sb3')) {
            project_name = `${projectData.project_name}.sb3`;
          }

          const getObjectParams = {
            Bucket: CONSTANTS.auth.merakiCertificate.s3Bucket,
            Key: key,
          };

          try {
            const data = await s3.getObject(getObjectParams).promise();
            // Now, upload the data to the new S3 bucket
            console.log(data);
            const uploadParams = {
              Bucket: CONSTANTS.auth.merakiScratch.scratchBucket,
              Key: key, // You can use the same key
              Body: data.Body,
            };
            const uploaded = await s3.upload(uploadParams).promise();
            console.log(
              uploaded.Location,
              'The file has been successfully uploaded to the new S3 bucket.'
            );

            // Update the database
            await knex('main.scratch')
              .update({
                url: url, // Use the new S3 bucket URL
                project_name,
              })
              .where('project_id', project_id);

            project_count += 1;
          } catch (err) {
            if (err.code === 'NoSuchKey') {
              notFound_and_Delete += 1;
              console.log('not found', notFound_and_Delete);
              const deleteIfNotFound = await knex('main.scratch').where('project_id', project_id).del();
              continue;
            }
            console.error(err, 'There was an error downloading the file');
          }
        }

        console.log(`\n${project_count} projects have been successfully updated in the new S3 bucket.`);
        console.log(`\n${notFound_and_Delete} projects not found in the new S3 bucket.`);
      } catch (error) {
        console.error(error);
        return error;
      }
    };
