const { google } = require('googleapis');

const { OAuth2 } = google.auth;

const CONFIG = require('../../config/index');
const { randomGenerator } = require('../index');

const oAuth2Client = new OAuth2(
  CONFIG.auth.meraki.googleClientID,
  CONFIG.auth.meraki.googleClientSecret
);

oAuth2Client.setCredentials({
  refresh_token: CONFIG.auth.meraki.authRefreshToken,
});

const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
let eventStartTime = classDetails.start_time;
let eventEndTime = classDetails.end_time;
if (typeof classDetails.start_time !== 'string') {
  eventStartTime = eventStartTime.toISOString();
}
if (typeof classDetails.end_time !== 'string') {
  eventEndTime = eventEndTime.toISOString();
}
module.exports = {
  createCalendarEvent: async (classDetails, facilitator) => {
    const event = {
      summary: `Class: ${classDetails.title}`,
      location: null,
      description: classDetails.description,
      start: {
        dateTime: eventStartTime.replace('Z', ''),
        timeZone: 'Asia/Kolkata',
      },
      end: {
        dateTime: eventEndTime.replace('Z', ''),
        timeZone: 'Asia/Kolkata',
      },
      // eslint-disable-next-line
      colorId: classDetails.type === 'workshop' ? 2 : classDetails.type === 'doubt_class' ? 4 : 6,
      conferenceData: {
        createRequest: {
          requestId: randomGenerator().secretId,
          conferenceSolutionKey: {
            type: 'hangoutsMeet',
          },
        },
        status: {
          statusCode: 'success',
        },
      },
      organizer: {
        displayName: facilitator.name,
        email: facilitator.email,
      },
      attendees: [
        {
          email: facilitator.email,
        },
      ],
    };
    const createdEvent = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
      conferenceDataVersion: 1,
      sendNotifications: true,
      sendUpdates: 'all',
    });
    return createdEvent;
  },

  patchCalendarEvent: async (eventId, attendees) => {
    const event = {
      attendees,
    };
    return calendar.events.patch({
      calendarId: 'primary',
      eventId,
      resource: event,
    });
  },

  deleteCalendarEvent: async (eventId) => {
    return calendar.events.delete({
      calendarId: 'primary',
      eventId,
      sendUpdates: 'all',
    });
  },
};
