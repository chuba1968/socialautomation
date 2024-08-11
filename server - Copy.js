const express = require('express');
const path = require('path');
const cors = require('cors');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const axios = require('axios');
const schedule = require('node-schedule');
const moment = require('moment-timezone');

require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

const MODEL_NAME = 'gemini-1.5-flash';
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const FACEBOOK_PAGE_ID = process.env.FB_PAGE_ID;
const FACEBOOK_PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;

async function generatePost() {
  // ... (keep the existing generatePost function)
}

async function postToFacebook(message) {
  // ... (keep the existing postToFacebook function)
}

app.post('/api/schedule-post', async (req, res) => {
  try {
    const { scheduledTime } = req.body;
    const postContent = await generatePost();
    
    const scheduledDate = moment.tz(scheduledTime, 'Africa/Lagos');
    const currentTime = moment().tz('Africa/Lagos');

    if (currentTime.isAfter(scheduledDate)) {
      await postToFacebook(postContent);
      res.json({ message: 'Post published immediately', content: postContent });
    } else {
      const job = schedule.scheduleJob(scheduledDate.toDate(), async () => {
        await postToFacebook(postContent);
      });
      
      res.json({ 
        message: 'Post scheduled successfully', 
        scheduledTime: scheduledDate.format(),
        content: postContent
      });
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    res.status(500).json({ error: 'Failed to schedule post' });
  }
});

app.get('/api/scheduled-posts', (req, res) => {
  const scheduledJobs = schedule.scheduledJobs;
  const posts = Object.keys(scheduledJobs).map(jobName => ({
    id: jobName,
    scheduledTime: scheduledJobs[jobName].nextInvocation()
  }));
  res.json(posts);
});

app.delete('/api/scheduled-post/:id', (req, res) => {
  const { id } = req.params;
  const job = schedule.scheduledJobs[id];
  if (job) {
    job.cancel();
    res.json({ message: 'Scheduled post cancelled successfully' });
  } else {
    res.status(404).json({ error: 'Scheduled post not found' });
  }
});

// Catch-all route to serve the index.html for any unmatched routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});