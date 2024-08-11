require('dotenv').config();
const express = require('express');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql');
const FormData = require('form-data');

const app = express();
const port = process.env.PORT || 3000;

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const FACEBOOK_PAGE_ID = process.env.FB_PAGE_ID;
const FACEBOOK_PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;

// MySQL connection
const connection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'automationdb'
});

connection.connect(err => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL');
});
// Set up multer for file storage (update 'uploads/' if you want a different directory)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
      cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
      cb(null, file.originalname); // Keep original filename
  }
});









// Set up multer for handling file uploads
const upload = multer({ dest: 'uploads/' });

app.use(express.static('public'));

app.post('/api/generatePost', upload.single('media'), async (req, res) => {
  try {
    const instruction = req.body.instruction || '';
    const mediaFile = req.file;

    // Generate post content
    const postContent = await generatePost(instruction);

    if (mediaFile) {
      const mediaPath = mediaFile.path;
      const mediaType = mediaFile.mimetype;

      // Store the media file details in the database
const imagePath = `/uploads/${mediaFile.filename}`;
const query = 'INSERT INTO images (filename, image_path) VALUES (?, ?)';
connection.query(query, [mediaFile.filename, imagePath], (err, result) => {
        if (err) {
          console.error('Error inserting into database:', err);
        }
      });

      // Post to Facebook with media
      await postToFacebook(postContent, mediaPath, mediaType);
    } else {
      // Post to Facebook without media
      await postToFacebook(postContent);
    }

    res.json({ success: true, generatedPost: postContent });
  } catch (error) {
    console.error(`Error: ${error.message}`);
    res.json({ success: false, error: error.message });
  }
});

// New Endpoint for ONLY Uploading Images:
app.post('/api/upload', upload.single('image'), (req, res) => { // 'image' is the field name in your form
  const mediaFile = req.file;
  if (!mediaFile) {
      return res.status(400).json({ error: 'No image file provided' });
  }

  const imagePath = `/uploads/${mediaFile.filename}`;
  const query = 'INSERT INTO images (filename, image_path) VALUES (?, ?)';

  connection.query(query, [mediaFile.filename, imagePath], (err, result) => {
      if (err) {
          console.error('Error inserting into database:', err);
          return res.status(500).json({ error: 'Database error' });
      }
      res.json({ success: true, imagePath: imagePath });
  });
});

app.get('/api/latestImages', (req, res) => {
  const query = 'SELECT * FROM images ORDER BY upload_time DESC LIMIT 5';
  connection.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching images:', err);
      return res.status(500).send({ error: 'Failed to retrieve images' });
    }
    res.send(results);
  });
});

// Endpoint to serve images:
app.get('/uploads/:filename', (req, res) => {
  const filePath = path.join(__dirname, 'uploads', req.params.filename);
  res.sendFile(filePath);
});

// Update /api/latestImages route:
app.get('/api/latestImages', (req, res) => {
  const query = 'SELECT filename, image_path FROM images ORDER BY upload_time DESC LIMIT 5';
  connection.query(query, (err, results) => {
      if (err) {
          console.error('Error fetching images:', err);
          return res.status(500).send({ error: 'Failed to retrieve images' });
      }
      res.send(results);
  });
});



const schedule = require('node-schedule');

// Schedule the task to run every 5 minutes
const job = schedule.scheduleJob('*/5 * * * *', async function() {
  console.log('Running scheduled job to generate post.');
  await scheduledPost();
});
async function scheduledPost() {
  try {
    // Fetch a random image from the database
    const query = 'SELECT * FROM images ORDER BY RAND() LIMIT 1';
    connection.query(query, async (err, results) => {
      if (err) {
        console.error('Error fetching random image:', err);
        return;
      }

      const randomImage = results[0];
      const imagePath = path.join(__dirname, randomImage.image_path);
      const mediaType = randomImage.filename.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg';
      
      // Generate post content with a default instruction or provide a way to set it
      const instruction = 'Your name is eva a social media handler for PizzaJelof write a short simple Pizza ad for Pizzajelof use hastags, never use unlocking';
      const postContent = await generatePost(instruction);

      // Post to Facebook with the random image
      await postToFacebook(postContent, imagePath, mediaType);
    });
  } catch (error) {
    console.error(`Error in scheduled post: ${error.message}`);
  }
}


app.post('/api/generatePost', upload.single('media'), async (req, res) => {
  try {
    const instruction = req.body.instruction || '';
    const mediaFile = req.file;
    const isScheduled = req.body.schedule === 'true'; // Check if scheduling is requested

    // Generate post content
    const postContent = await generatePost(instruction);

    if (mediaFile) {
      const mediaPath = mediaFile.path;
      const mediaType = mediaFile.mimetype;

      // Store the media file details in the database
      const imagePath = `/uploads/${mediaFile.filename}`;
      const query = 'INSERT INTO images (filename, image_path) VALUES (?, ?)';
      connection.query(query, [mediaFile.filename, imagePath], (err, result) => {
        if (err) {
          console.error('Error inserting into database:', err);
        }
      });

      // Post to Facebook with media
      await postToFacebook(postContent, mediaPath, mediaType);
    } else {
      // Post to Facebook without media
      await postToFacebook(postContent);
    }

    if (isScheduled) {
      job.schedule();
    }

    res.json({ success: true, generatedPost: postContent });
  } catch (error) {
    console.error(`Error: ${error.message}`);
    res.json({ success: false, error: error.message });
  }
});





async function fetchLatestImages() {
  try {
      const response = await fetch('/api/latestImages');
      const images = await response.json();
      // Clear previous images
      const imagesContainer = document.getElementById('imagesContainer');
      imagesContainer.innerHTML = ''; 
      // Use the full relative path for img src:
      images.forEach(image => {
          const imgElement = document.createElement('img');
          imgElement.src = image.image_path; 
          imgElement.alt = 'Uploaded Image';
          imgElement.classList.add('w-full', 'h-auto', 'rounded-lg', 'shadow-md');
          imagesContainer.appendChild(imgElement);
      });
  } catch (error) {
      console.error('Failed to fetch latest images:', error);
  }
}

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



// Endpoint to handle image upload
app.post('/api/uploadImage', upload.single('image'), (req, res) => {
  try {
    const imagePath = `/uploads/${req.file.filename}`;
    const query = 'INSERT INTO images (filename, image_path) VALUES (?, ?)';
    connection.query(query, [req.file.filename, imagePath], (err, result) => {
      if (err) {
        console.error('Error inserting into database:', err);
        res.json({ success: false, error: err.message });
        return;
      }
      res.json({ success: true, message: 'Image uploaded successfully' });
    });
  } catch (error) {
    console.error(`Error: ${error.message}`);
    res.json({ success: false, error: error.message });
  }
});

// Endpoint to fetch the latest images
app.get('/api/latestImages', (req, res) => {
  const query = 'SELECT * FROM images ORDER BY upload_time DESC LIMIT 5';
  connection.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching images:', err);
      return res.status(500).send({ error: 'Failed to retrieve images' });
    }
    res.send(results);
  });
});

// Endpoint to serve images:
app.get('/uploads/:filename', (req, res) => {
  const filePath = path.join(__dirname, 'uploads', req.params.filename);
  res.sendFile(filePath);
});


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

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
