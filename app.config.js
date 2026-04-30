// Extends app.json with Universal Links / App Links derived from EXPO_PUBLIC_API_URL at build time.
const appJson = require('./app.json');

function shareLinkHost() {
  const raw = process.env.EXPO_PUBLIC_API_URL || '';
  try {
    const u = new URL(raw);
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return null;
    return u.host;
  } catch {
    return null;
  }
}

const host = shareLinkHost();
const associatedDomains = host ? [`applinks:${host}`] : [];
const androidIntentFilters = host
  ? [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [{ scheme: 'https', host, pathPrefix: '/api/public/activities' }],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ]
  : [];

module.exports = {
  ...appJson.expo,
  ios: {
    ...appJson.expo.ios,
    associatedDomains: [...(appJson.expo.ios?.associatedDomains || []), ...associatedDomains],
  },
  android: {
    ...appJson.expo.android,
    intentFilters: [...(appJson.expo.android?.intentFilters || []), ...androidIntentFilters],
  },
};
