const fetch = require('node-fetch');

const { VERIFICATION_TOKEN, BOT_TOKEN } = process.env;

function verify({ token, challenge }) {
  if (token === VERIFICATION_TOKEN) {
    return {
      statusCode: 200,
      body: challenge,
    };
  }

  return {
    statusCode: 400,
  };
}

const handleEvent = async ({ type, user, channel }) => {
  console.log('handling event for type', type);

  switch (type) {
    case 'app_mention': {
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

      const result = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        body: JSON.stringify(message),
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${BOT_TOKEN}`,
        },
      });

      const json = await result.json();

      console.log('[chat.postMessage] Status:', json);

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
    case 'url_verification': {
      return verify(data);
    }
    case 'event_callback': {
      return handleEvent(data.event);
    }
    default: {
      return { statusCode: 400 };
    }
  }
};
