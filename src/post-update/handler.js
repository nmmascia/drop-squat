const leaderboard = require('../slack/leaderboard');
const chatPostAPI = require('../slack/chat-post');
const AWS = require('aws-sdk');
const { startOfISOWeek, format, subWeeks } = require('date-fns');

const { WORKOUTS_DB_TABLE, CHANNEL_ID } = process.env;
const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.handler = async () => {
  const date = startOfISOWeek(subWeeks(new Date(), 1));
  const storageKey = format(date, 'MMddyyyy');

  const { Item } = await dynamoDb
    .get({
      TableName: WORKOUTS_DB_TABLE,
      Key: {
        week: storageKey,
      },
    })
    .promise();

  const sorted = Object.entries(Item)
    .reduce((acc, [key, count]) => {
      const [prefix, userId] = key.split('_');
      if (prefix === 'count') {
        acc.push({ userId, count });
      }
      return acc;
    }, [])
    .sort(({ count: a }, { count: b }) => b - a);

  const sections = sorted.map(({ userId, count }, index, array) => {
    return leaderboard.userCount({ userId, baotw: false, count });
  });

  const blocks = [
    leaderboard.boardHeader(date),
    ...leaderboard.topWorkouts({
      topPeople: [sorted[0], sorted[1], sorted[2]],
    }),
    leaderboard.countHeader(),
    ...sections,
  ];

  const message = {
    channel: CHANNEL_ID,
    blocks,
  };

  await chatPostAPI({ message });
};
