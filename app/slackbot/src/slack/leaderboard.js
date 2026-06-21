const { format } = require('date-fns');

module.exports.boardHeader = (date) => ({
  type: 'section',
  text: {
    type: 'mrkdwn',
    text: `*Leaderboard for ${format(date, 'MMM do, yyyy')}*`,
  },
});

module.exports.countHeader = () => ({
  type: 'section',
  fields: [
    {
      type: 'mrkdwn',
      text: '*Squatter*',
    },
    {
      type: 'mrkdwn',
      text: '*Workouts*',
    },
  ],
});

module.exports.userCount = ({ userId, baotw, count }) => {
  const slackUserRef = `<@${userId}>`;
  let emojis = '';
  if (count < 3) emojis += ':zombie:';
  if (baotw) emojis += ':trophy: ';
  const userText = `${emojis}${slackUserRef}`;

  return {
    type: 'section',
    fields: [
      {
        type: 'mrkdwn',
        text: userText,
      },
      {
        type: 'plain_text',
        text: `${count}`,
      },
    ],
  };
};

module.exports.topWorkouts = ({ topPeople }) => {
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Top Workouts*`,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `:first_place_medal: <@${topPeople[0].userId}>`,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `:second_place_medal: <@${topPeople[1].userId}>`,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `:third_place_medal: <@${topPeople[2].userId}>`,
      },
    },
  ];
};

module.exports.motivationalQuote = () => ({
  type: 'section',
  text: {
    type: 'mrkdwn',
    text:
      "*“If something stands between you and your success, move it. Never be denied.”*\n\n-Dwayne 'The Rock' Johnson",
  },
});
