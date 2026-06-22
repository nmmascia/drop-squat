import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { startOfISOWeek, format, subWeeks } from 'date-fns';
import * as leaderboard from '../slack/leaderboard.js';
import chatPostAPI from '../slack/chat-post.js';

const { WORKOUTS_DB_TABLE, CHANNEL_ID } = process.env;
const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler = async (): Promise<void> => {
  const date = startOfISOWeek(subWeeks(new Date(), 1));
  const storageKey = format(date, 'MMddyyyy');

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
