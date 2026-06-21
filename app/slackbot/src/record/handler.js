const AWS = require('aws-sdk');
const { startOfISOWeek, format, subWeeks } = require('date-fns');

const { WORKOUTS_DB_TABLE } = process.env;
const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.handler = async (event) => {
  const { week } = event.queryStringParameters;

  const { Item } = await dynamoDb
    .get({
      TableName: WORKOUTS_DB_TABLE,
      Key: {
        week,
      },
    })
    .promise();

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
