const Schmervice = require('schmervice');
const { google } = require('googleapis');
const { errorHandler } = require('../errorHandling');
const logger = require('../../server/logger');
const { stringify } = require('hoek');

const waitTimeInSec = 20000
module.exports = class youtubeBroadCastService extends Schmervice.Service {
  // Authenticate with YouTube API and return the YouTube object
  async youtubeAuth(id, email) {
    let { calendarService } = this.server.services();
    try {
      const setClient = await calendarService.setCalendarCredentials(id, email);
      const youtube = google.youtube({ version: 'v3', auth: setClient });
      return [null, youtube];
    } catch (error) {
      logger.error(stringify(errorHandler(error)))
      return [errorHandler(error), null]; // Handle the error appropriately in your application
    }
  }
  
  // Create live broadcasts on YouTube
  async createLiveBroadcast(id, email, schedule_broadcasts) {
    try {
      const { YoutubeBroadcast } = this.server.models();
      let [error, youtube] = await this.youtubeAuth(id, email);

      if (error) {
        return [errorHandler(error), null];
      }

      const results = [];

      for (let ind in schedule_broadcasts) {
        let broadcast = schedule_broadcasts[ind];
        let { title, description, start_time, end_time, recurring_id, id } = broadcast;

        let _start_time = new Date(start_time);
        _start_time.setMinutes(_start_time.getMinutes() - 5 * 60 - 30);

        let _end_time = new Date(end_time);
        _end_time.setMinutes(_end_time.getMinutes() - 5 * 60 - 30);


        let num = parseInt(ind) + 1;

        const requestData = {
          snippet: {
            title: title + ' class-' + num,
            description,
            scheduledStartTime: _start_time,
            scheduledEndTime: _end_time,
          },
          status: {
            privacyStatus: 'unlisted',
          },
        };

        // Introduce a delay before creating the broadcast
        if (results.length >= 1) {
          await new Promise((resolve) => setTimeout(resolve, waitTimeInSec));
        }
        let response = await youtube.liveBroadcasts.insert({
          part: 'snippet,status',
          resource: requestData,
        });
        if (response.data.error){
          logger.error(stringify(errorHandler(response.data.error)));
        } else{
          logger.info('ABC_auto: Successfully create the youTube Broadcast! No-of:'+ num);
          results.push({ video_id: response.data.id, class_id: id, recurring_id: recurring_id });
        }
      }

      await YoutubeBroadcast.query().insertGraph(results);
      logger.info('ABC_auto: Successfully insert the data into youtube_broadcast!!');
      return [null, results];
    } catch (error) {
      logger.error('function name(createLiveBroadcast) '+ stringify(errorHandler(error)))
      return [errorHandler(error), null]; // Handle the error appropriately in your application
    }
  }
  async syncCreateLiveBroadcast(id, email, schedule_broadcasts) {
    const resultPromise = await new Promise((resolve, reject) => {
      // Call the asynchronous deleteBroadcast function
      this.createLiveBroadcast(id, email, schedule_broadcasts)
        .then((result) => {
          // Resolve the promise with the result
          resolve(result);
        })
        .catch((error) => {
          // Reject the promise with the error
          reject(error);
        });
    });
  
    // Wait for the promise to resolve and return the result
    const result = await resultPromise;
  }

  // Delete live broadcasts on YouTube
  async deleteBroadcast(id, email, recurring_id ,class_id) {
    const { YoutubeBroadcast, Classes } = this.server.models();
    try {
      let class_ids;

      // Determine class_ids based on input type
      if (recurring_id !== null && recurring_id !== undefined) {
        let classData = await Classes.query().select().where('recurring_id', recurring_id);
        class_ids = classData.map((data) => data.id);
      } else {
        class_ids = [class_id];
      }

      // Set the access token in the OAuth2 client
      const [error, youtube] = await this.youtubeAuth(id, email);

      if (error) {
        return [errorHandler(error), null];
      }

      let YoutubeBroadcastData = await YoutubeBroadcast.query()
      .skipUndefined()
        .select()
        .whereIn('class_id', class_ids);

      let video_ids = YoutubeBroadcastData.map((data) => data.video_id);

      for (let video_id of video_ids) {
        let request = {
          id: video_id,
        };

        // Introduce a delay before deleting the broadcast
        if (video_ids.length > 1) {
          await new Promise((resolve) => setTimeout(resolve, waitTimeInSec));
        }
        let response = await youtube.liveBroadcasts.delete(request);
        if (response.data.error){
          logger.error(stringify(errorHandler(response.data.error)));
          return [response.data.error, null];

        }
        logger.info('ABC_auto: Successfully deleted the youTube Broadcast!!');
      }

    await YoutubeBroadcast.query()
      .delete()
      .skipUndefined()
      .whereIn('class_id', class_ids);
    return [null, 'Successfully deleted'];
    } catch (error) {
      logger.error('function name(deleteBroadcast) '+ stringify(errorHandler(error)))
      return [errorHandler(error), null]; // Handle the error appropriately in your application
    }
  }

  async syncDeleteBroadcast(id, email, recurring_id, class_id) {
    const resultPromise = await new Promise((resolve, reject) => {
      // Call the asynchronous deleteBroadcast function
      this.deleteBroadcast(id, email, recurring_id, class_id)
        .then((result) => {
          // Resolve the promise with the result
          resolve(result);
        })
        .catch((error) => {
          // Reject the promise with the error
          reject(error);
        });
    });
  
    // Wait for the promise to resolve and return the result
    const result = await resultPromise;
  }

  // Update live broadcasts on YouTube
  async updateLiveBroadcast(id, email, updated_schedule_broadcasts) {
    const { YoutubeBroadcast } = this.server.models();
    try {
      const [error, youtube] = await this.youtubeAuth(id, email);

      if (error) {
        return [errorHandler(error), null];
      }

      let results = [];
      let num = 1
      for (const broadcast of updated_schedule_broadcasts) {
        const {title, description, start_time, end_time, class_id } = broadcast;

        let _start_time = new Date(start_time);
        _start_time.setMinutes(_start_time.getMinutes() - 5 * 60 - 30);

        let _end_time = new Date(end_time);
        _end_time.setMinutes(_end_time.getMinutes() - 5 * 60 - 30);

        let snippet = {
          scheduledStartTime: _start_time,
          scheduledEndTime: _end_time
        }

        if (title != null){
          snippet.title = title + ' class-' + num
          snippet.description= description
          num ++
        } 
        
        // Get the existing live broadcast for this class ID
        let getBroadcast = await YoutubeBroadcast.query()
          .select()
          .where('class_id', class_id)
          .first();
        // Introduce a delay before updating the broadcast
        if (results.length >= 1) {
          await new Promise((resolve) => setTimeout(resolve, waitTimeInSec));
        }
        if ((getBroadcast != undefined && getBroadcast != null && getBroadcast.video_id != null)) {
          const response = await youtube.liveBroadcasts.update({
            part: 'snippet',
            resource: {
              id: getBroadcast.video_id,
              snippet:snippet,
            },
          });
          if (response.data.error){
            logger.error(stringify(errorHandler(response.data.error)));
          }else{
            results.push({ video_id: response.data.id, class_id: class_id });
            logger.info('ABC_auto: Successfully update the youTube Broadcast! No-of'+ num);
          }
        }
      }

      return [null, results];
    } catch (error) {
      logger.error('function name(updateLiveBroadcast) '+ stringify(errorHandler(error)))
      return [errorHandler(error), null];
    }
  }
  
  async syncUpdateLiveBroadcast(id, email, updated_schedule_broadcasts) {
    const resultPromise = await new Promise((resolve, reject) => {
      // Call the asynchronous deleteBroadcast function
      this.updateLiveBroadcast(id, email, updated_schedule_broadcasts)
        .then((result) => {
          // Resolve the promise with the result
          resolve(result);
        })
        .catch((error) => {
          // Reject the promise with the error
          reject(error);
        });
    });
  
    // Wait for the promise to resolve and return the result
    const result = await resultPromise;
  }

  // fatching the live broadcast with recurring id
  async gettingLiveBroadcast(recurring_id){
    const { YoutubeBroadcast } = this.server.models();
    try {
      let res = await YoutubeBroadcast.query().select().where({recurring_id});
      return [null, res];
    } catch (error) {
      return [errorHandler(error), null];
    }
  }

  async updateRecurringAndClassIDsYouTubeBroadcast(id, email, newData, oldrecurring_id){
    try{
      const { YoutubeBroadcast } = this.server.models();
      let oldData = await YoutubeBroadcast.query().where('recurring_id',oldrecurring_id)
      for(let oneClass=0;oneClass < oldData.length; oneClass++){
        let {id} = oldData[oneClass];
        let {class_id, recurring_id} = newData[oneClass];
        await YoutubeBroadcast.query().patchAndFetchById(id,{class_id,recurring_id})
      }
      this.syncUpdateLiveBroadcast(id, email, newData)
    } catch (error) {
      logger.error('function name(updateRecurringAndClassIDsYouTubeBroadcast) '+ stringify(errorHandler(error)))
    }
  }
};
