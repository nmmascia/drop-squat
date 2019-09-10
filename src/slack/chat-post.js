const fetch = require('node-fetch');
const { BOT_TOKEN } = process.env;

module.exports = async function chatPost({ message }) {
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
};
