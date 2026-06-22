import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand, type UpdateCommandInput } from '@aws-sdk/lib-dynamodb';
import { startOfISOWeek, format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import chatPostAPI from '../slack/chat-post.js';
import { APP_MENTION, EVENT_CALLBACK, URL_VERIFICATION } from '../slack/constants/events.js';
import completeChallenge from '../slack/complete-challenge.js';
import * as appMention from './app-mention.js';

const { WORKOUTS_DB_TABLE } = process.env;

const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

interface InnerEvent {
  type?: string;
  user: string;
  channel: string;
  upload?: boolean;
  files?: unknown[];
}

const handleEvent = async ({
  type,
  user,
  channel,
  upload,
  files,
}: InnerEvent): Promise<APIGatewayProxyResultV2> => {
  console.log('Executing inner event:', type);
  console.log('upload value', upload, files);

  if (upload || Boolean(files && files.length)) {
    const inputDate = toZonedTime(new Date(), 'America/Los_Angeles');
    const date = startOfISOWeek(inputDate);
    const storageKey = format(date, 'MMddyyyy');
    const userCountKey = `count_${user}`;

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
          text: `Good work <@${user}>! You've recorded ${Attributes?.[userCountKey]} workouts this week!`,
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

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  console.log('incoming event', event);
  const data = JSON.parse(event.body ?? '{}');
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
