const { VERIFICATION_TOKEN } = process.env;

export default function completeChallenge({ token, challenge }) {
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
