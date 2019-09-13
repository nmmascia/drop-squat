const querystring = require('querystring');
const AWS = require('aws-sdk');
const { startOfISOWeek, format } = require('date-fns');
const chatUpdateAPI = require('../slack/chat-update');

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
      const attachments = [
        {
          text: `Good work <@${user.id}>! Here's your total workout count this week: ${Attributes[userCountKey]}`,
          title: 'Your workout has been tallied!',
        },
      ];
      await chatUpdateAPI({ responseUrl, body: { attachments } });
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

      const counts = Object.entries(Item)
        .reduce((acc, [key, count]) => {
          const [prefix, userId] = key.split('_');
          if (prefix === 'count') {
            acc.push({ userId, count });
          }
          return acc;
        }, [])
        .sort(({ count: a }, { count: b }) => b - a)
        .map(({ userId, count }, index) => {
          return {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `:first_place_medal: <@${userId}>`,
              },
              {
                type: 'plain_text',
                text: `${count}`,
              },
            ],
          };
        });

      const blocks = [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Leaderboard for ${format(date, 'MMM do, yyyy')}*`,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: '*Squatter*',
            },
            {
              type: 'mrkdwn',
              text: '*Workouts*',
            },
          ],
        },
        ...counts,
      ];

      console.log('Created blocks', blocks);
      try {
        const json = await chatUpdateAPI({ responseUrl, body: { blocks } });
        console.log('result', json);
      } catch (err) {
        console.log('error', err);
      }
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
