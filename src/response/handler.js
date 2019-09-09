const querystring = require('querystring');
const fetch = require('node-fetch');

const { BOT_TOKEN } = process.env;

exports.handler = async (event) => {
  console.log('EVENT:', event);
  const { payload } = querystring.parse(event.body);
  const data = JSON.parse(payload);
  const [action] = data.actions;
  const responseUrl = data.response_url.replace('\\\\', '');

  switch (action.name) {
    case 'TALLY_WORKOUT': {
      const result = await fetch(responseUrl, {
        method: 'POST',
        body: JSON.stringify({
          replace_original: true,
          attachments: [
            {
              text: 'Good work, you worked out one time this week!',
              title: 'Your workout has been tallied!',
            },
          ],
        }),
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${BOT_TOKEN}`,
        },
      });

      const json = await result.json();

      console.log('[response.handle] status code', json.status);
    }
    default: {
      return {
        statusCode: 400,
      };
    }
  }

  return {
    statusCode: 200,
  };
};
