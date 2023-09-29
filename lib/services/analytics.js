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

    async createUser(data){
        const { UserHack } = this.server.models();
        try {
            const u = await UserHack.query().insert(data);
            return [null, u];
        } catch (error) {
            logger.error(JSON.stringify(error));
            return [errorHandler(error), null];
          }
    }

    async getDataUser(id){
        const { UserHack } = this.server.models();
        try {
            const u = await UserHack.query().where(id,id);
            return [null, u[0]];
        } catch (error) {
            logger.error(JSON.stringify(error));
            return [errorHandler(error), null];
          }
    }

    async creteSession(data){
        const { Session } = this.server.models();
        try {
            const u = await Session.query().insert(data);
            return [null, u];
        } catch (error) {
            logger.error(JSON.stringify(error));
            return [errorHandler(error), null];
          }
    }

    async getSessionDataByID(id ){
        const { Session } = this.server.models();
        try {
            const u = await Session.query().where(id,id);
            return [null, u[0]];
        } catch (error) {
            logger.error(JSON.stringify(error));
            return [errorHandler(error), null];
          }
    }

    async createEvent(data){
        const { Events } = this.server.models();
        try {
            const u = await Events.query().insert(data);
            return [null, u];
        } catch (error) {
            logger.error(JSON.stringify(error));
            return [errorHandler(error), null];
          }
    }

    async getEvent(id){
        const { Events } = this.server.models();
        try {
            const u = await Events.query().where(id,id);
            return [null, u[0]];
        } catch (error) {
            logger.error(JSON.stringify(error));
            return [errorHandler(error), null];
          }
    }
}