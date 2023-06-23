const Schmervice = require('schmervice');
// eslint-disable-next-line import/no-extraneous-dependencies
const moment = require('moment');
const AWS = require('aws-sdk');

const { errorHandler } = require('../errorHandling');
const CONSTANTS = require('../config/index');

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

  async getRecordByDate(date) {
    const { MeetAttendance } = this.server.models();
    let record;
    try {
      const startOfDay = moment(date, 'DD-MM-YYYY').startOf('day').toDate();
      const endOfDay = moment(date, 'DD-MM-YYYY').endOf('day').toDate();
      const meetings = await MeetAttendance.query()
        .whereBetween('meeting_date', [startOfDay, endOfDay])
        .orderBy('meeting_date', 'asc');

      record = meetings.map((meeting) => ({
        id: meeting.id,
        attendies_data: meeting.attendies_data,
        meeting_date: this.DDMMYYYY(meeting.meeting_date),
      }));

      return [null, record];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  // eslint-disable-next-line class-methods-use-this
  DDMMYYYY(newDate) {
    const date = new Date(newDate);
    const year = date.getFullYear();
    const month = `0${date.getMonth() + 1}`.slice(-2); // add zero if necessary
    const day = `0${date.getDate()}`.slice(-2); // add zero if necessary
    return `${day}-${month}-${year}`;
  }

  // upload attendance video to s3-bucket
  // eslint-disable-next-line class-methods-use-this
  async createTempCredentialsForUploadVideo() {
    // Generate temporary security credentials using IAM
    try {
      const sts = new AWS.STS({
        accessKeyId: CONSTANTS.auth.attendanceVideo.meetS3SecretKeyId,
        secretAccessKey: CONSTANTS.auth.attendanceVideo.meetS3SecretAccessKey,
        region: CONSTANTS.auth.attendanceVideo.s3Region,
      });

      const params = {
        RoleArn: CONSTANTS.auth.attendanceVideo.meetExtensiontempCretentialCreatorRole,
        RoleSessionName: 'MyAppSession',
        DurationSeconds: 10800, // 3 hours
      };

      const { Credentials } = await sts.assumeRole(params).promise();

      const s3Params = {
        Bucket: 'extension-video',
        Key: `extension-video/fileName.mp4`,
        ContentType: 'video/mp4',
        ACL: 'public-read',
        Body: null,
        Credentials,
      };
      return [null, s3Params];
    } catch (e) {
      return [errorHandler(e), null];
    }
  }
};