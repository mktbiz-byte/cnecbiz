exports.handler = async (event) => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      GMAIL_EMAIL: process.env.GMAIL_EMAIL || 'NOT SET',
      GMAIL_APP_PASSWORD_LENGTH: process.env.GMAIL_APP_PASSWORD ? process.env.GMAIL_APP_PASSWORD.length : 0,
      GMAIL_APP_PASSWORD_FIRST_4: process.env.GMAIL_APP_PASSWORD ? process.env.GMAIL_APP_PASSWORD.substring(0, 4) : 'NOT SET',
      GMAIL_SENDER_NAME: process.env.GMAIL_SENDER_NAME || 'NOT SET'
    })
  };
};
