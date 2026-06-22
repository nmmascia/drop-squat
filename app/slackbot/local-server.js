// Local replacement for API Gateway + Lambda. Runs the existing handlers
// behind a plain Express server — no Serverless Framework involved.
//
//   pnpm run dev
//
// Routes mirror the `functions` block in serverless.yml.
import 'dotenv/config';
import express from 'express';

// Point the AWS SDK at DynamoDB Local BEFORE the handlers are imported. The
// handlers build their (zero-config) DynamoDB client at module load, and AWS
// SDK v3 resolves region, credentials, and endpoint from these standard env
// vars. ESM hoists static imports, so the handlers are pulled in via dynamic
// import() below — after these are set.
process.env.AWS_REGION = process.env.AWS_REGION || 'localhost';
process.env.AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || 'local';
process.env.AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || 'local';
process.env.AWS_ENDPOINT_URL_DYNAMODB =
  process.env.AWS_ENDPOINT_URL_DYNAMODB || process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000';

const { handler: eventHandler } = await import('./src/events/handler.js');
const { handler: responseHandler } = await import('./src/response/handler.js');
const { handler: recordHandler } = await import('./src/record/handler.js');
const { handler: postUpdateHandler } = await import('./src/post-update/handler.js');

const app = express();

// Capture the raw request body as a string — the handlers parse it themselves
// (JSON.parse / querystring.parse), exactly as they receive it from API Gateway.
app.use(express.text({ type: '*/*' }));

// Wraps a Lambda handler as an Express route: builds an API Gateway proxy-style
// event, then applies the handler's { statusCode, headers, body } response.
const lambda = (handler) => async (req, res) => {
  const event = {
    body: typeof req.body === 'string' ? req.body : '',
    headers: req.headers,
    httpMethod: req.method,
    path: req.path,
    queryStringParameters: req.query,
  };

  try {
    const result = (await handler(event)) || {};
    if (result.headers) res.set(result.headers);
    res.status(result.statusCode || 200).send(result.body);
  } catch (err) {
    console.error(`Handler error on ${req.method} ${req.path}:`, err);
    res.status(500).send(err.message);
  }
};

app.post('/event', lambda(eventHandler));
app.post('/response', lambda(responseHandler));
app.get('/record', lambda(recordHandler));

// The scheduled (cron) function has no HTTP trigger in production; expose it as
// a route so it can be invoked on demand locally.
app.post('/post-update', async (req, res) => {
  try {
    await postUpdateHandler();
    res.status(200).send('post-update ran');
  } catch (err) {
    console.error('post-update error:', err);
    res.status(500).send(err.message);
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`drop-squat running locally on http://localhost:${port}`);
  console.log('  POST /event        Slack events');
  console.log('  POST /response     Slack interactive messages');
  console.log('  GET  /record       weekly CSV export (?week=MMDDYYYY)');
  console.log('  POST /post-update  run the weekly leaderboard job');
});
