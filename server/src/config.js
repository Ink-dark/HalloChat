require('dotenv').config();

module.exports = {
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  },
  email: {
    service: 'Outlook',
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
};