const Schmervice = require('schmervice');

const { errorHandler } = require('../errorHandling');

module.exports = class MeetAttendanceService extends Schmervice.Service {
  async addRecord(attendance) {
    const { MeetAttendance } = this.server.models();
    let newRecord;
    try {
      newRecord = await MeetAttendance.query().insert(attendance);
      return [null, newRecord];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getRecord() {
    const { MeetAttendance } = this.server.models();
    let allRecord;
    try {
      const record = await MeetAttendance.query();
      allRecord = record.map((ele) => {
        return {
          id: ele.id,
          attendies_data: ele.attendies_data,
          meeting_date: this.DDMMYYYY(ele.meeting_date),
        };
      });
      return [null, allRecord];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getRecordById(id) {
    const { MeetAttendance } = this.server.models();
    let record;
    try {
      const d = await MeetAttendance.query().where('id', id);
      record = [
        {
          id: d[0].id,
          attendies_data: d[0].attendies_data,
          meeting_date: this.DDMMYYYY(d[0].meeting_date),
        },
      ];
      return [null, record];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  // eslint-disable-next-line class-methods-use-this
  DDMMYYYY(newDate) {
    const date = new Date(newDate);
    const day = date.getDate();
    const month = date.getMonth();
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }
};
