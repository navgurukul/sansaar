const Schmervice = require('schmervice');
const { google } = require('googleapis');
const { required } = require('@hapi/joi');
// const CONFIG = require('../config');
// const OAuth2 = google.auth.OAuth2;

// // Create an OAuth2 client with your Google Cloud credentials
// const oauth2Client = new OAuth2(
//   CONFIG.auth.googleClientIDWeb,
//   CONFIG.auth.googleClientSecretWeb,
//   CONFIG.auth.googleConsentRedirectURI
// );
module.exports = class youtubeBroadCastService extends Schmervice.Service {

  async createLiveBroadcast(oauth2Client, schedule_broadcasts) {
    try {
      const {Classes} = this.server.models();
      // Set the access token in the OAuth2 client
      const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
  
      const results = [];
      
      for (const broadcast of schedule_broadcasts) {
        const { title, description, start_time, end_time } = broadcast;
  
        const requestData = {
          snippet: {
            title,
            description,
            scheduledStartTime: start_time,
            scheduledEndTime: end_time,
          },
          status: {
            privacyStatus: 'unlisted',
          },
        };
  
        // Introduce a delay before creating the broadcast
        await new Promise((resolve) => setTimeout(resolve, 1000));
        
        const response = await youtube.liveBroadcasts.insert({
          part: 'snippet,status',
          resource: requestData,
        });
  
        console.log('Live broadcast created:', response.data);
        // Classes.query().where('id',class_id).update('broadcase_id',response.data.id)
        results.push({...broadcast,video_id :response.data.id});
      }
  
      return results;
    } catch (error) {
      console.error('Error creating live broadcasts:', error);
      throw error; // Handle the error appropriately in your application
    }
  }
  
  async updateLiveBroadcast(oAuth2Client, query, updatedData) {
    let {video_id, class_id} = query

    
    try {
      // Set the access token in the OAuth2 client
      const youtube = google.youtube({ version: 'v3', auth: oAuth2Client });
      const response = await youtube.liveBroadcasts.update({
        part: 'snippet',
        resource: updatedData,
        id: video_id,
      });

      return response.data;
    } catch (error) {
      console.error('Error updating live broadcast:', error);
      return error;
    }
  }

}


