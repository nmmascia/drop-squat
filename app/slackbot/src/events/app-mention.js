module.exports.getMessage = ({ user, channel }) => {
  const text = `Hello, <@${user}>! What would you like to do today?`;
  return {
    channel,
    as_user: true,
    attachments: [
      {
        text,
        title: 'Squat Baby Squat',
        callback_id: '???',
        actions: [
          {
            name: 'TALLY_WORKOUT',
            text: 'Tally Workout',
            type: 'button',
            style: 'primary',
          },
          {
            name: 'GET_WEEKLY_LEADERBOARD',
            text: 'Get Weekly Leaderboard',
            type: 'button',
            style: 'primary',
          },
        ],
      },
    ],
  };
};
