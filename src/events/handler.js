const chatPostAPI = require('../slack/chat-post');
const { APP_MENTION, EVENT_CALLBACK, URL_VERIFICATION } = require('../slack/constants/events');
const completeChallenge = require('../slack/complete-challenge');
const appMention = require('./app-mention');
const AWS = require('aws-sdk');
const { startOfISOWeek, format } = require('date-fns');

const { BOT_TOKEN, WORKOUTS_DB_TABLE } = process.env;

const dynamoDb = new AWS.DynamoDB.DocumentClient();

const handleEvent = async ({ type, user, channel, upload }) => {
  console.log('Executing inner event:', type);
  console.log('upload value', upload);

  if (upload) {
    const date = startOfISOWeek(new Date());
    const storageKey = format(date, 'MMddyyyy');
    const userCountKey = `count_${user}`;

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
          text: `Good work <@${user}>! You've recorded ${Attributes[userCountKey]} workouts this week!`,
        },
      },
    ];
    const message = {
      channel,
      blocks,
    };
    const json = await chatPostAPI({ message });
    return { statusCode: 200 };
  }

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
  console.log('incoming event', event);
  const data = JSON.parse(event.body);
  const { type } = data;
  console.log('Executing Slack event:', type);
  console.log('Input data:', data);
  console.log('Inner event:', data.event);

  switch (data.type) {
    case URL_VERIFICATION:
      return completeChallenge(data);
    case EVENT_CALLBACK:
      return handleEvent(data.event);
    default:
      return { statusCode: 400 };
  }
};
