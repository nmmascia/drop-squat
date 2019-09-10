const querystring = require('querystring');
const fetch = require('node-fetch');
const AWS = require('aws-sdk');
const { startOfISOWeek, format } = require('date-fns');

const { BOT_TOKEN, WORKOUTS_DB_TABLE } = process.env;

const dynamoDb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  const { payload } = querystring.parse(event.body);
  const data = JSON.parse(payload);
  console.log('input data:', data);

  const [action] = data.actions;
  const responseUrl = data.response_url.replace('\\\\', '');

  const storageKey = format(startOfISOWeek(new Date()), 'MMddyyyy');
  const { user } = data;
  console.log('storage key', storageKey);

  switch (action.name) {
    case 'TALLY_WORKOUT': {
      const params = {
        TableName: WORKOUTS_DB_TABLE,
        Key: {
          week: storageKey,
        },
        UpdateExpression: 'add #user :val',
        ExpressionAttributeNames: {
          '#user': user.id,
        },
        ExpressionAttributeValues: {
          ':val': 1,
        },
        ReturnValues: 'UPDATED_NEW',
      };

      const { Attributes } = await dynamoDb.update(params).promise();
      console.log('[dynamodb.update]', Attributes);

      const result = await fetch(responseUrl, {
        method: 'POST',
        body: JSON.stringify({
          replace_original: true,
          attachments: [
            {
              text: `Good work <@${user.id}>! Here's your total workout count this week: ${Attributes[user.id]}`,
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
