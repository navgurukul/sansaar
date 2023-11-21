const Schmervice = require('schmervice');
const { google } = require('googleapis');
const { errorHandler } = require('../errorHandling');

// const CONFIG = require('../config');
// const OAuth2 = google.auth.OAuth2;

// // Create an OAuth2 client with your Google Cloud credentials
// const oauth2Client = new OAuth2(
//   CONFIG.auth.googleClientIDWeb,
//   CONFIG.auth.googleClientSecretWeb,
//   CONFIG.auth.googleConsentRedirectURI
// );

module.exports = class youtubeBroadCastService extends Schmervice.Service {
  async youtubeAuth(id, email){
    let {calendarService}  = this.server.services();
    try{
      const setClient = await calendarService.setCalendarCredentials(id, email)
      const youtube = google.youtube({ version: 'v3', auth: setClient });
      return[null, youtube]
    } catch (error) {
      return [errorHandler(error),null]// Handle the error appropriately in your application
    }
  }
  
  async createLiveBroadcast(id, email, schedule_broadcasts) {
    try {
      const {YoutubeBroadcast} = this.server.models();
      // Set the access_token to the client
      // let youtube = google.youtube({ version: 'v3', auth: setClient });
      let [error,youtube] = await this.youtubeAuth(id, email)
      if (error){
        return [errorHandler(error),null]
      }
      const results = [];
      
      for (const broadcast of schedule_broadcasts) {
        const { title, description, start_time, end_time ,id} = broadcast;
      
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
        if (results.length > 1){
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        let response = await youtube.liveBroadcasts.insert({
          part: 'snippet,status',
          resource: requestData
        });
        results.push({video_id :response.data.id, class_id: id});
      }
      let red = await YoutubeBroadcast.query().insertGraph(results);
      return [null,results];
    } catch (error) {
      console.log(error);
      return [errorHandler(error),null]// Handle the error appropriately in your application
    }
  }

  async deleteBroadcast(id, email,video_ids){
    const {YoutubeBroadcast} = this.server.models();
    try {
      // Set the access token in the OAuth2 client
      const [error,youtube] = await this.youtubeAuth(id, email)
        if (error){
          return [errorHandler(error),null]
        }
      video_ids.map((video_id)=> {
        let request = {
          id: video_id
        };
        youtube.liveBroadcasts.delete(request);
      })
    } catch (error) {
      console.log(error);
      return [errorHandler(error),null]// Handle the error appropriately in your application
    }
  }
  
  async updateLiveBroadcast(id, email, query, updatedData) {
    const {YoutubeBroadcast} = this.server.models();
    let {video_id, class_id} = query
    try {
      // Set the access token in the OAuth2 client
      const [error,youtube] = await this.youtubeAuth(id, email)
      if (error){
        return [errorHandler(error),null]
      }    
      const response = await youtube.liveBroadcasts.update({
              part: 'snippet',
              resource: updatedData,
              id: video_id,
            });

      return [null,response.data];
    }  catch (error) {
      return [errorHandler(error),null]// Handle the error appropriately in your application
    }
  }

}


