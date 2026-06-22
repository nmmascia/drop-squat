import querystring from 'node:querystring';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { startOfISOWeek, format } from 'date-fns';
import dateFnsTz from 'date-fns-tz';
import chatUpdateAPI from '../slack/chat-update.js';
import * as leaderboard from '../slack/leaderboard.js';

const { utcToZonedTime } = dateFnsTz;

const { WORKOUTS_DB_TABLE } = process.env;

const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler = async (event) => {
  const { payload } = querystring.parse(event.body);
  const data = JSON.parse(payload);
  const [action] = data.actions;
  const responseUrl = data.response_url.replace('\\\\', '');
  const { user } = data;
  const inputDate = utcToZonedTime(new Date(), 'America/Los_Angeles');
  const date = startOfISOWeek(inputDate);
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
      const { Attributes } = await dynamoDb.send(new UpdateCommand(params));
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
      const { Item } = await dynamoDb.send(
        new GetCommand({
          TableName: WORKOUTS_DB_TABLE,
          Key: {
            week: storageKey,
          },
        })
      );

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
