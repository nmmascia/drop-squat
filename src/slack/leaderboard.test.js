const leaderboard = require('./leaderboard');

test('should return the correct tally sections', () => {
  expect(leaderboard.countHeader()).toMatchSnapshot();
});

test('should return the correct header sections', () => {
  expect(leaderboard.boardHeader(new Date('March 26 1988'))).toMatchSnapshot();
});

test('should return the correct section for count under 3', () => {
  expect(leaderboard.userCount({ userId: 'nick', count: 2 })).toMatchSnapshot();
});

test('should return the correct section for count above 3', () => {
  expect(leaderboard.userCount({ userId: 'nick', count: 4 })).toMatchSnapshot();
});

test('should return the correct section for baotw', () => {
  expect(leaderboard.userCount({ userId: 'nick', count: 2, baotw: true })).toMatchSnapshot();
  expect(leaderboard.userCount({ userId: 'nick', count: 4, baotw: true })).toMatchSnapshot();
});
