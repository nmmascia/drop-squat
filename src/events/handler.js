const chatPostAPI = require('../slack/chat-post');
const { APP_MENTION, EVENT_CALLBACK, URL_VERIFICATION } = require('../slack/constants/events');

const handleEvent = async ({ type, user, channel }) => {
  switch (type) {
    case APP_MENTION: {
      const text = `Hello, <@${user}>! What would you like to do today?`;
      const message = {
        channel,
        as_user: true,
        attachments: [
          {
            text,
            title: 'Squat Baby Squat',
            callback_id: '???',
            actions: [
              {
                name: 'TALLY_WORKOUT',
                text: 'Tally Workout',
                type: 'button',
                style: 'primary',
              },
            ],
          },
        ],
      };

      const json = await chatPostAPI({ message });
      return {
        statusCode: 200,
      };
    }
    default: {
      return {
        statusCode: 400,
      };
    }
  }
};

exports.handler = async (event) => {
  const data = JSON.parse(event.body);
  switch (data.type) {
    case URL_VERIFICATION:
      return completeChallenge(data);
    case EVENT_CALLBACK:
      return handleEvent(data.event);
    default:
      return { statusCode: 400 };
  }
};
