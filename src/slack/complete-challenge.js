const { VERIFICATION_TOKEN } = process.env;

module.exports = function completeChallenge({ token }) {
  if (token === VERIFICATION_TOKEN) {
    return {
      statusCode: 200,
      body: challenge,
    };
  }

  return {
    statusCode: 400,
  };
};
