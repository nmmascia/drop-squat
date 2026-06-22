// Creates the DynamoDB tables locally — the equivalent of the
// `resources.Resources` section in serverless.yml. Safe to run repeatedly;
// tables that already exist are skipped.
import 'dotenv/config';
import { DynamoDBClient, ListTablesCommand, CreateTableCommand } from '@aws-sdk/client-dynamodb';

const endpoint = process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000';
const region = process.env.AWS_REGION || 'localhost';

const dynamodb = new DynamoDBClient({
  endpoint,
  region,
  credentials: {
    accessKeyId: 'local',
    secretAccessKey: 'local',
  },
});

const stage = process.env.STAGE || 'dev';

const tables = [
  {
    TableName: process.env.WORKOUTS_DB_TABLE || `${stage}-workouts-table`,
    AttributeDefinitions: [{ AttributeName: 'week', AttributeType: 'S' }],
    KeySchema: [{ AttributeName: 'week', KeyType: 'HASH' }],
    BillingMode: 'PAY_PER_REQUEST',
  },
  {
    TableName: `${stage}-users-table`,
    AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
    KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
    BillingMode: 'PAY_PER_REQUEST',
  },
];

try {
  const { TableNames } = await dynamodb.send(new ListTablesCommand({}));

  for (const table of tables) {
    if (TableNames.includes(table.TableName)) {
      console.log(`✓ ${table.TableName} already exists`);
      continue;
    }
    await dynamodb.send(new CreateTableCommand(table));
    console.log(`✓ created ${table.TableName}`);
  }

  console.log(`\nDynamoDB Local ready at ${endpoint}`);
} catch (err) {
  console.error('Failed to create tables:', err.message);
  console.error('Is DynamoDB Local running? Try: pnpm run db:start');
  process.exit(1);
}
