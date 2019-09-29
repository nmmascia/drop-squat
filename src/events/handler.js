const chatPostAPI = require('../slack/chat-post');
const { APP_MENTION, EVENT_CALLBACK, URL_VERIFICATION } = require('../slack/constants/events');
const completeChallenge = require('../slack/complete-challenge');
const appMention = require('./app-mention');

const handleEvent = async ({ type, user, channel }) => {
  console.log('Executing inner event:', type);

  switch (type) {
    case APP_MENTION: {
      const message = appMention.getMessage({ channel, user });
      const json = await chatPostAPI({ message });
      console.log('Response:', json);
      return { statusCode: 200 };
    }
    default: {
      return { statusCode: 400 };
    }
  }
};

exports.handler = async (event) => {
  const data = JSON.parse(event.body);
  const { type } = data;
  console.log('Executing Slack event:', type);
  console.log('Input data:', data);

  switch (data.type) {
    case URL_VERIFICATION:
      return completeChallenge(data);
    case EVENT_CALLBACK:
      return handleEvent(data.event);
    default:
      return { statusCode: 400 };
  }
};
