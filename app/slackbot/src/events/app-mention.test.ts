import * as appMention from './app-mention.js';

test('should return the correct app mention message', () => {
  expect(appMention.getMessage({ user: 'nick', channel: 'MY_CHANNEL' })).toMatchSnapshot();
});
