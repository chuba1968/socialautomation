require('dotenv').config();
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

// Use environment variables
const MODEL_NAME = 'gemini-1.5-flash';
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const FACEBOOK_PAGE_ID = process.env.FB_PAGE_ID;
const FACEBOOK_PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;

async function generatePost() {
  try {
    const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const generationConfig = {
      temperature: 1,
      topK: 64,
      topP: 0.95,
      maxOutputTokens: 8192,
    };

    const safetySettings = [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ];

    const parts = [{ text: 'write a short advert, for my Business Ourlawyer app a law firm keep it short and nice, simple add htags and emogies' }];

    const result = await model.generateContent({
      contents: [{ role: 'user', parts }],
      generationConfig,
      safetySettings,
    });

    const response = result.response;
    // Remove asterisks from the generated text
    const cleanedText = response.text().replace(/\*/g, '');
    return cleanedText;
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

async function run() {
  try {
    const postContent = await generatePost();
    console.log(`Generated Post: ${postContent}`);

    await postToFacebook(postContent);

    // Example to post with media
    // const mediaPath = 'path/to/your/media/file.jpg';
    // const mediaType = 'image/jpeg'; // or 'video/mp4' for videos
    // await postToFacebook(postContent, mediaPath, mediaType);

  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
}

run();
