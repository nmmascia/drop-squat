import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { startOfISOWeek, format, subWeeks } from 'date-fns';

const { WORKOUTS_DB_TABLE } = process.env;
const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler = async (event) => {
  const { week } = event.queryStringParameters;

  const { Item } = await dynamoDb.send(
    new GetCommand({
      TableName: WORKOUTS_DB_TABLE,
      Key: {
        week,
      },
    })
  );

  const headers = ['handle', 'workouts'];

  const rows = Object.entries(Item)
    .reduce((acc, [key, count]) => {
      const [prefix, userId] = key.split('_');
      if (prefix === 'count') {
        acc.push([userId, count]);
      }
      return acc;
    }, [])
    .sort(([, a], [, b]) => b - a);

  const result = [headers, ...rows].join('\n');

  return {
    headers: {
      'Content-Type': 'text/csv',
      'Content-disposition': `attachment; filename=${week}.csv`,
    },
    body: result,
    statusCode: 200,
  };
};
