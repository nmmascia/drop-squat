const fetch = require('node-fetch');
const { BOT_TOKEN } = process.env;

module.exports = async function chatUpdate({ responseUrl, body }) {
  const result = await fetch(responseUrl, {
    method: 'POST',
    body: JSON.stringify({
      replace_original: true,
      ...body,
    }),
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${BOT_TOKEN}`,
    },
  });

  await result.json();
};
