const { BOT_TOKEN } = process.env;

export default async function chatUpdate({ responseUrl, body }) {
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

  const json = await result.json();
  return json;
}
