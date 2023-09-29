const Schmervice = require('schmervice');
const { errorHandler } = require('../errorHandling');
const logger = require('../../server/logger');

module.exports = class Analytics extends Schmervice.Service {
    async pushNow(data,user_id){
        const { ViewPage } = this.server.models();
        try {
            const finalData = {
                ...data,"user_id":user_id, "created_at": new Date()
            };
            const viewPage = await ViewPage.query().insert(finalData);
            return [null, viewPage];
        } catch (error) {
            logger.error(JSON.stringify(error));
            return [errorHandler(error), null];
          }
     }

    async getData(){
        const { ViewPage } = this.server.models();
        try {
            const viewPage = await ViewPage.query();
            return [null, viewPage];
        } catch (error) {
            logger.error(JSON.stringify(error));
            return [errorHandler(error), null];
          }
    }

    async getDataByID(user_id){
        const { ViewPage } = this.server.models();
        try {
            const viewPage = await ViewPage.query().where('user_id', user_id);
            return [null, viewPage];
        } catch (error) {
            logger.error(JSON.stringify(error));
            return [errorHandler(error), null];
          }
    }
    async getDataByData(id,data){
        const { ViewPage } = this.server.models();
        try {
            const viewPage = await ViewPage.query().patchAndFetchById(id,data);
            return [null, viewPage];
        } catch (error) {
            logger.error(JSON.stringify(error));
            return [errorHandler(error), null];
          }
    }
}