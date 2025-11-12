const PROJECT_NAME = 'Mega Directory';

const DEFAULT_PORTS = Object.freeze({
  api: 3001,
  web: 3000,
  admin: 4000
});

const HEALTH_ENDPOINT = '/health';

module.exports = {
  PROJECT_NAME,
  DEFAULT_PORTS,
  HEALTH_ENDPOINT
};
