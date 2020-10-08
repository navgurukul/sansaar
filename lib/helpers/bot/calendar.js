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

module.exports = {
  createCalendarEvent: async (classDetails, facilitator) => {
    const event = {
      summary: `Class: ${classDetails.title}`,
      location: null,
      description: classDetails.description,
      start: {
        dateTime: classDetails.start_time,
        timeZone: 'Asia/Kolkata',
      },
      end: {
        dateTime: classDetails.end_time,
        timeZone: 'Asia/Kolkata',
      },
      // eslint-disable-next-line
      colorId: classDetails.type === 'workshop' ? 1 : classDetails.type === 'doubt_class' ? 11 : 10,
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

    const response = await calendar.freebusy.query({
      resource: {
        timeMin: classDetails.start_time,
        timeMax: classDetails.end_time,
        timeZone: 'Asia/Kolkata',
        items: [{ id: 'primary' }],
      },
    });

    const eventsArr = response.data.calendars.primary.busy;
    if (eventsArr.length === 0) {
      const createdEvent = calendar.events.insert({
        calendarId: 'primary',
        resource: event,
        conferenceDataVersion: 1,
        sendNotifications: true,
        sendUpdates: 'all',
      });
      return createdEvent;
    }
    return 'event_creation_error';
  },
  patchCalendarEvents: async (eventId, attendees) => {
    const event = {
      attendees,
    };
    return calendar.events.patch({
      calendarId: 'primary',
      eventId,
      resource: event,
    });
  },
};
