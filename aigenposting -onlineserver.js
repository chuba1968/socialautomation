require('dotenv').config();
const express = require('express');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql');
const FormData = require('form-data');
const schedule = require('node-schedule');

const app = express();
const port = process.env.PORT || 3000;

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const FACEBOOK_PAGE_ID = process.env.FB_PAGE_ID;
const FACEBOOK_PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;

// MySQL connection
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

connection.connect(err => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL');
});

// Set up multer for file storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage: storage });

// Serve static files from the 'public' directory
app.use('/Autoai', express.static(path.join(__dirname, 'public')));

// Serve uploaded files
app.use('/Autoai/uploads', express.static(path.join(__dirname, 'uploads')));

app.post('/Autoai/api/generatePost', upload.single('media'), async (req, res) => {
  try {
    const instruction = req.body.instruction || '';
    const mediaFile = req.file;
    const isScheduled = req.body.schedule === 'true';

    const postContent = await generatePost(instruction);

    if (mediaFile) {
      const mediaPath = mediaFile.path;
      const mediaType = mediaFile.mimetype;

      const imagePath = `/Autoai/uploads/${mediaFile.filename}`;
      const query = 'INSERT INTO images (filename, image_path) VALUES (?, ?)';
      connection.query(query, [mediaFile.filename, imagePath], (err, result) => {
        if (err) {
          console.error('Error inserting into database:', err);
        }
      });

      await postToFacebook(postContent, mediaPath, mediaType);
    } else {
      await postToFacebook(postContent);
    }

    if (isScheduled) {
      schedulePost();
    }

    res.json({ success: true, generatedPost: postContent });
  } catch (error) {
    console.error(`Error: ${error.message}`);
    res.json({ success: false, error: error.message });
  }
});

app.post('/Autoai/api/upload', upload.single('image'), (req, res) => {
  const mediaFile = req.file;
  if (!mediaFile) {
    return res.status(400).json({ error: 'No image file provided' });
  }

  const imagePath = `/Autoai/uploads/${mediaFile.filename}`;
  const query = 'INSERT INTO images (filename, image_path) VALUES (?, ?)';

  connection.query(query, [mediaFile.filename, imagePath], (err, result) => {
    if (err) {
      console.error('Error inserting into database:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ success: true, imagePath: imagePath });
  });
});

app.get('/Autoai/Autoai/api/latestImages', (req, res) => {
  const query = 'SELECT filename, image_path FROM images ORDER BY upload_time DESC LIMIT 5';
  connection.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching images:', err);
      return res.status(500).send({ error: 'Failed to retrieve images' });
    }
    res.send(results);
  });
});

async function generatePost(instruction) {
  try {
    const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const generationConfig = {
      temperature: 1,
      topK: 64,
      topP: 0.95,
      maxOutputTokens: 8192,
    };

    const safetySettings = [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
    ];

    const parts = [{ text: instruction }];
    const result = await model.generateContent({
      contents: [{ role: 'user', parts }],
      generationConfig,
      safetySettings,
    });

    const response = result.response;
    return response.text().replace(/\*/g, '');
  } catch (error) {
    console.error(`Error generating post: ${error.message}`);
    throw error;
  }
}

async function postToFacebook(message, mediaPath = null, mediaType = null) {
  try {
    let postId;
    if (mediaPath && mediaType) {
      if (mediaType.startsWith('video/')) {
        postId = await uploadVideoToFacebook(mediaPath, message);
      } else if (mediaType.startsWith('image/')) {
        postId = await uploadImageToFacebook(mediaPath, message);
      }
    } else {
      const params = {
        message: message,
        access_token: FACEBOOK_PAGE_ACCESS_TOKEN,
      };
      const response = await axios.post(`https://graph.facebook.com/v17.0/${FACEBOOK_PAGE_ID}/feed`, null, { params });
      postId = response.data.id;
    }
    console.log('Post successful, ID:', postId);
  } catch (error) {
    if (error.response) {
      console.error(`Error posting to Facebook: ${error.response.status} - ${error.response.data.error.message}`);
    } else {
      console.error(`Error posting to Facebook: ${error.message}`);
    }
    throw error;
  }
}

async function uploadImageToFacebook(imagePath, message) {
  const formData = new FormData();
  formData.append('access_token', FACEBOOK_PAGE_ACCESS_TOKEN);
  formData.append('source', fs.createReadStream(imagePath));
  formData.append('caption', message);

  const response = await axios.post(`https://graph.facebook.com/v17.0/${FACEBOOK_PAGE_ID}/photos`, formData, {
    headers: formData.getHeaders(),
  });

  if (!response.data.id) {
    throw new Error('Failed to upload image to Facebook');
  }

  return response.data.id;
}

async function uploadVideoToFacebook(videoPath, message) {
  const endpoint = `${FACEBOOK_PAGE_ID}/videos`;

  const initResponse = await axios.post(`https://graph.facebook.com/v17.0/${endpoint}`, null, {
    params: {
      upload_phase: 'start',
      access_token: FACEBOOK_PAGE_ACCESS_TOKEN,
    },
  });

  const uploadUrl = initResponse.data.upload_url;
  const videoId = initResponse.data.video_id;

  const formData = new FormData();
  formData.append('access_token', FACEBOOK_PAGE_ACCESS_TOKEN);
  formData.append('start_offset', '0');
  formData.append('file_size', fs.statSync(videoPath).size);
  formData.append('video_file_chunk', fs.createReadStream(videoPath));

  await axios.post(uploadUrl, formData, {
    headers: formData.getHeaders(),
  });

  await axios.post(`https://graph.facebook.com/v17.0/${endpoint}`, null, {
    params: {
      upload_phase: 'finish',
      access_token: FACEBOOK_PAGE_ACCESS_TOKEN,
      video_id: videoId,
    },
  });

  await axios.post(`https://graph.facebook.com/v17.0/${videoId}`, null, {
    params: {
      description: message,
      access_token: FACEBOOK_PAGE_ACCESS_TOKEN,
    },
  });

  return videoId;
}

function schedulePost() {
  schedule.scheduleJob('*/5 * * * *', async function() {
    console.log('Running scheduled job to generate post.');
    await scheduledPost();
  });
}

async function scheduledPost() {
  try {
    const query = 'SELECT * FROM images ORDER BY RAND() LIMIT 1';
    connection.query(query, async (err, results) => {
      if (err) {
        console.error('Error fetching random image:', err);
        return;
      }

      const randomImage = results[0];
      const imagePath = path.join(__dirname, randomImage.image_path);
      const mediaType = randomImage.filename.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg';
      
      const instruction = 'Your name is eva a social media handler for PizzaJelof write a short simple Pizza ad for Pizzajelof use hastags, never use unlocking';
      const postContent = await generatePost(instruction);

      await postToFacebook(postContent, imagePath, mediaType);
    });
  } catch (error) {
    console.error(`Error in scheduled post: ${error.message}`);
  }
}

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}/Autoai`);
});