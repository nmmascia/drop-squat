import type { APIGatewayProxyResultV2 } from 'aws-lambda';

const { VERIFICATION_TOKEN } = process.env;

interface ChallengePayload {
  token?: string;
  challenge?: string;
}

export default function completeChallenge({
  token,
  challenge,
}: ChallengePayload): APIGatewayProxyResultV2 {
  if (token === VERIFICATION_TOKEN) {
    return {
      statusCode: 200,
      body: challenge,
    };
  }

  return {
    statusCode: 400,
  };
}
