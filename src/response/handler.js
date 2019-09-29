const querystring = require('querystring');
const AWS = require('aws-sdk');
const { startOfISOWeek, format } = require('date-fns');
const chatUpdateAPI = require('../slack/chat-update');
const leaderboard = require('../slack/leaderboard');

const { BOT_TOKEN, WORKOUTS_DB_TABLE } = process.env;

const dynamoDb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  const { payload } = querystring.parse(event.body);
  const data = JSON.parse(payload);
  const [action] = data.actions;
  const responseUrl = data.response_url.replace('\\\\', '');
  const { user } = data;
  const date = startOfISOWeek(new Date());
  const storageKey = format(date, 'MMddyyyy');
  const userCountKey = `count_${user.id}`;
  console.log('EVENT', action.name, storageKey, user.id);

  switch (action.name) {
    case 'TALLY_WORKOUT': {
      const params = {
        TableName: WORKOUTS_DB_TABLE,
        Key: {
          week: storageKey,
        },
        UpdateExpression: 'add #user_count :val',
        ExpressionAttributeNames: {
          '#user_count': userCountKey,
        },
        ExpressionAttributeValues: {
          ':val': 1,
        },
        ReturnValues: 'UPDATED_NEW',
      };
      const { Attributes } = await dynamoDb.update(params).promise();
      const blocks = [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Your workout has been tallied!*`,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Good work <@${user.id}>! You've recorded ${Attributes[userCountKey]} workouts this week!`,
          },
        },
      ];
      await chatUpdateAPI({ responseUrl, body: { blocks } });
      break;
    }
    case 'GET_WEEKLY_LEADERBOARD': {
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
        leaderboard.motivationalQuote(),
        leaderboard.countHeader(),
        ...sections,
      ];
      const json = await chatUpdateAPI({ responseUrl, body: { blocks } });
      break;
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
