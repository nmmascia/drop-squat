import querystring from 'node:querystring';
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand,
  type UpdateCommandInput,
} from '@aws-sdk/lib-dynamodb';
import { startOfISOWeek, format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import chatUpdateAPI from '../slack/chat-update.js';
import * as leaderboard from '../slack/leaderboard.js';

const { WORKOUTS_DB_TABLE } = process.env;

const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  const { payload } = querystring.parse(event.body ?? '');
  const data = JSON.parse(payload as string);
  const [action] = data.actions;
  const responseUrl = data.response_url.replace('\\\\', '');
  const { user } = data;
  const inputDate = toZonedTime(new Date(), 'America/Los_Angeles');
  const date = startOfISOWeek(inputDate);
  const storageKey = format(date, 'MMddyyyy');
  const userCountKey = `count_${user.id}`;
  console.log('EVENT', action.name, storageKey, user.id);

  switch (action.name) {
    case 'TALLY_WORKOUT': {
      const params: UpdateCommandInput = {
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
            text: `Good work <@${user.id}>! You've recorded ${Attributes?.[userCountKey]} workouts this week!`,
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

      const sorted = Object.entries(Item ?? {})
        .reduce((acc: { userId: string; count: number }[], [key, count]) => {
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
