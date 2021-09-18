const { google } = require('googleapis');

const { OAuth2 } = google.auth;
const Schmervice = require('schmervice');
const CONFIG = require('../config');
const { randomGenerator } = require('../helpers/index');

const oAuth2Client = new OAuth2(
  CONFIG.auth.googleClientIDWeb,
  CONFIG.auth.googleClientSecretWeb,
  CONFIG.auth.googleConsentRedirectURI
);

const scopes = ['https://www.googleapis.com/auth/calendar.events'];

module.exports = class CalendarService extends Schmervice.Service {
  /* eslint-disable */
  async generateAuthUrl(userId, userEmail) {
    const url = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      //   approval_prompt: 'force',
      prompt: 'consent',
      state: `user_id=${userId}+user_email=${userEmail}`,
    });
    return url;
  }
  /* eslint-enable */

  async setCalendarCredentials(userId, userEmail) {
    const { UserTokens } = this.server.models();
    const tokens = await UserTokens.query()
      .skipUndefined()
      .where('user_id', userId)
      .orWhere('user_email', userEmail);
    if (tokens.length > 0) {
      oAuth2Client.setCredentials({
        access_token: tokens[0].access_token,
        refresh_token: tokens[0].refresh_token,
      });
    }
    // This is required to ensure that this function always resets oAuth credentials and never reuse last used token if no token is found
    else {
      oAuth2Client.setCredentials({
        access_token: null,
        refresh_token: null,
      });
    }
    return oAuth2Client;
  }

  async createCalendarEvent(classDetails, facilitator) {
    const setClient = await this.setCalendarCredentials(undefined, facilitator.email);
    const calendar = google.calendar({ version: 'v3', auth: setClient });
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
    // eslint-disable-next-line
    console.log(createdEvent);
    return createdEvent;
  }

  async patchCalendarEvent(classDetails, attendees = null) {
    const f_email = classDetails.facilitator.email
      ? classDetails.facilitator.email
      : classDetails.facilitator_email;
    const setClient = await this.setCalendarCredentials(classDetails.facilitator_id, f_email);
    const calendar = google.calendar({ version: 'v3', auth: setClient });

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
    const updatedEvent = await calendar.events.patch({
      calendarId: 'primary',
      eventId: calendar_event_id,
      resource: event,
      sendUpdates: 'all',
    });

    // eslint-disable-next-line
    console.log(updatedEvent);
    return updatedEvent;
  }

  async deleteCalendarEvent(eventId, userId, userEmail) {
    const setClient = await this.setCalendarCredentials(userId, userEmail);
    const calendar = google.calendar({ version: 'v3', auth: setClient });
    const deletedEvent = await calendar.events.delete({
      calendarId: 'primary',
      eventId,
      sendUpdates: 'all',
    });

    // eslint-disable-next-line
    console.log(deletedEvent);
    return deletedEvent;
  }

  async getRecurringInstances(eventId, userId, userEmail) {
    const setClient = await this.setCalendarCredentials(userId, userEmail);
    const calendar = google.calendar({ version: 'v3', auth: setClient });
    const cohortInstances = calendar.events.instances({
      calendarId: 'primary',
      eventId,
    });

    // eslint-disable-next-line
    console.log(cohortInstances);
    return cohortInstances;
  }

  async getCalendarEvent(eventId, userId, userEmail) {
    const setClient = await this.setCalendarCredentials(userId, userEmail);
    const calendar = google.calendar({ version: 'v3', auth: setClient });
    const getCalendar = await calendar.events.get({
      calendarId: 'primary',
      eventId,
    });

    // eslint-disable-next-line
    console.log(getCalendar);
    return getCalendar;
  }
};
