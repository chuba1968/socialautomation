const axios = require('axios');
require('dotenv').config();

const APP_ID = process.env.FACEBOOK_APP_ID;
const APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const SHORT_LIVED_TOKEN = 'EAAb0LbRt5OEBO6EeHsjwZBInMCZBZCcjQHYAEcyZBhgvNNKXSrp3Freo8XxZAON326Br6CU4vO8LVhCdsl97AZCdQfgoyma7Iko6NhZC7fjiZCIO7eSbJCWXBwdLoMQMbDmoJJg8qvr134U8bUvQeOs9MRTP4xHSjoKsQH8GLBfPI2HZBw9QwGD8nhGZCZCZARgqWJYZD';

console.log('APP_ID:', APP_ID);
console.log('APP_SECRET:', APP_SECRET ? APP_SECRET.substring(0, 4) + '...' : 'undefined');

if (!APP_ID || !APP_SECRET) {
    console.error('Error: APP_ID or APP_SECRET is missing. Please check your .env file.');
    process.exit(1);
}

async function getLongLivedToken() {
    try {
        console.log('Requesting long-lived token...');
        const response = await axios.get('https://graph.facebook.com/v17.0/oauth/access_token', {
            params: {
                grant_type: 'fb_exchange_token',
                client_id: APP_ID,
                client_secret: APP_SECRET,
                fb_exchange_token: SHORT_LIVED_TOKEN
            }
        });

        console.log('Long-lived token:', response.data.access_token);
        console.log('Token expires in:', response.data.expires_in, 'seconds');

        return response.data.access_token;
    } catch (error) {
        console.error('Error getting long-lived token:', error.response ? error.response.data : error.message);
        if (error.response && error.response.data) {
            console.error('Error details:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

getLongLivedToken();
