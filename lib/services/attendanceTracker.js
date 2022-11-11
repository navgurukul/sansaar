const Schmervice = require('schmervice');
const { errorHandler } = require('../errorHandling');

module.exports = class attendanceTrackerService extends Schmervice.Service {
  async recordAttendance(data) {
    const { AttendanceTracker } = this.server.models();
    try {
      const addData = await AttendanceTracker.query().insertAndFetch(data);
      return [null, addData];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }
};
