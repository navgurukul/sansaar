/**
 * This entire file can be deleted. Not doing it now. Will do later
 */
const { google } = require('googleapis');

const CONFIG = require('../config/index');
const { randomGenerator } = require('../helpers/index');

const { OAuth2 } = google.auth;

const oAuth2Client = new OAuth2(
  CONFIG.auth.googleClientIDWeb,
  CONFIG.auth.googleClientSecretWeb,
  'http://localhost:3000'
);

const scopes = ['https://www.googleapis.com/auth/calendar.events'];

const url = oAuth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes,
  // approval_prompt: 'force',
  prompt: 'consent',
});

// eslint-disable-next-line
console.log(url);

const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

module.exports = {
  viewCalendarEvent: async () => {
    return calendar.events.list({
      calendarId: 'primary',
    });
  },
  createCalendarEvent: async (classDetails, facilitator) => {
    let eventStartTime = classDetails.start_time;
    let eventEndTime = classDetails.end_time;
    if (typeof classDetails.start_time !== 'string') {
      eventStartTime = eventStartTime.toISOString();
    }
    if (typeof classDetails.end_time !== 'string') {
      eventEndTime = eventEndTime.toISOString();
    }

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
      creator: {
        email: facilitator.email,
      },
      attendees: [
        {
          email: facilitator.email,
        },
      ],
    };
    if (classDetails.attendees) {
      event.attendees.push(...classDetails.attendees);
    }
    // Recurring Event
    if (classDetails.frequency) {
      let recurrenceRule = `RRULE:FREQ=${classDetails.frequency};`;
      if (classDetails.occurrence) {
        recurrenceRule += `COUNT=${classDetails.occurrence}`;
      } else if (classDetails.until) {
        const untilDate = classDetails.until.toISOString().split('T')[0].replace(/-/g, '');
        recurrenceRule += `UNTIL=${untilDate}`;
      }
      if (classDetails.on_days) {
        recurrenceRule += `;BYDAY=${classDetails.on_days}`;
      }
      event.recurrence = [recurrenceRule];
    }

    const createdEvent = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
      conferenceDataVersion: 1,
      sendUpdates: 'all',
    });
    return createdEvent;
  },

  patchCalendarEvent: async (classDetails, attendees = null) => {
    const { calendar_event_id, title, description, start_time, end_time } = classDetails;

    let event = {};

    if (attendees) {
      event = { ...event, attendees };
    }

    event = {
      ...event,
      summary: `Class: ${title}`,
      description,
    };

    let eventStartTime = start_time;
    let eventEndTime = end_time;
    let start;
    let end;

    if (start_time) {
      if (typeof start_time !== 'string') eventStartTime = eventStartTime.toISOString();
      start = {
        dateTime: eventStartTime.replace('Z', ''),
        timeZone: 'Asia/Kolkata',
      };

      event = {
        ...event,
        summary: `Class: ${title}`,
        description,
        start,
      };
    }
    if (end_time) {
      if (typeof end_time !== 'string') eventEndTime = eventEndTime.toISOString();
      end = {
        dateTime: eventEndTime.replace('Z', ''),
        timeZone: 'Asia/Kolkata',
      };
      event = {
        ...event,
        summary: `Class: ${title}`,
        description,
        end,
      };
    }

    return calendar.events.patch({
      calendarId: 'primary',
      eventId: calendar_event_id,
      resource: event,
      sendUpdates: 'all',
    });
  },

  deleteCalendarEvent: async (eventId) => {
    return calendar.events.delete({
      calendarId: 'primary',
      eventId,
      sendUpdates: 'all',
    });
  },

  getRecurringInstances: async (eventId) => {
    return calendar.events.instances({
      calendarId: 'primary',
      eventId,
    });
  },

  getCalendarEvent: async (eventId) => {
    return calendar.events.get({
      calendarId: 'primary',
      eventId,
    });
  },
};
