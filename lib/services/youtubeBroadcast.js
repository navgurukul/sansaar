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
      await YoutubeBroadcast.query().insertGraph(results);
      return [null,results];
    } catch (error) {
      console.log(error);
      return [errorHandler(error),null]// Handle the error appropriately in your application
    }
  }
//youtubeBroadCastService.deleteBroadcast(id, email,video_ids)
  async deleteBroadcast(id, email, idsValue){
    const {YoutubeBroadcast, Classes} = this.server.models();
    try {
      let class_ids;
      if (typeof idsValue === 'integer') {
        let classData = await Classes.query().select().where('recurring_id', idsValue)
        class_ids = classData.map((data)=> data.id)
      }else {
        class_ids = idsValue
      }
      // Set the access token in the OAuth2 client
      const [error,youtube] = await this.youtubeAuth(id, email)
        if (error){
          return [errorHandler(error),null]
        }
      let YoutubeBroadcastData = await YoutubeBroadcast.query().select().whereIn('class_id', class_ids);
      let video_ids = YoutubeBroadcastData.map((data)=> data.video_id)
      for(let video_id of video_ids){
        let request = {
          id: video_id
        };
        if (results.length > 1){
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        youtube.liveBroadcasts.delete(request);
      }
  
    } catch (error) {
      console.log(error);
      return [errorHandler(error),null]// Handle the error appropriately in your application
    }
  }
  
  async updateLiveBroadcast(id, email, updated_schedule_broadcasts){
    const { YoutubeBroadcast } = this.server.models();  
    try {
      const [error, youtube] = await this.youtubeAuth(id, email);
  
      if (error) {
        return [errorHandler(error), null];
      }
      let results = [];
      for (const broadcast of updated_schedule_broadcasts) {
        const { title, description, start_time, end_time, class_id } = broadcast;
  
        // Get the existing live broadcast for this class ID
        let getBroadcast = await YoutubeBroadcast.query().select().where('class_id', class_id).first();
        
        if (results.length > 1){
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        const response = await youtube.liveBroadcasts.update({
          part: 'snippet',
          resource: {
            id: getBroadcast.video_id,
            snippet: {
              title,
              description,
              scheduledStartTime: start_time,
              scheduledEndTime: end_time,
            },
          },
        });
        
        results.push({ video_id: response.data.id, class_id: class_id });
      }
  
      return [null, results];
    } catch (error) {
      console.error(error);
      return [errorHandler(error), null];
    }
  };
  
}


