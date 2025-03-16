const { updateLastActivity, checkInactivity, cleanUpProgress, sendFeedbackUpdate } = require('./scripts/utils');
const { prepareAssistant, generateFeedback, generateSummaries } = require('./scripts/assistant');

const express = require('express');     // Import Express JS to create the server
const OpenAI = require("openai");       // Import OpenAI class to interact with the API
const dotenv = require('dotenv');       // Import dotenv to read environment variables from .env file
const path = require('path');           // Import path to work with file and directory paths
const multer = require('multer');       // Import multer to add files to the request object
const fs = require('fs');               // Import fs to send files to the openai api
const cors = require('cors');           // Import cors to allow cross-origin requests

// Load environment variables from .env file
dotenv.config();

// Create an Express application
const app = express();

// Configure the path where files to be used by openai will be uploaded
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads');
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

// Define files storage limits
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 20 * 1024 * 1024,
        files: 50
    }
});

// Create an instance of the OpenAI class
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    organization: process.env.OPENAI_ORG_KEY,
    project: process.env.OPENAI_PROJECT_ID,
});

// Store the API responses and checked responses of user
global.apiResponse = [];
global.checkedResponses = [];
global.summaries = '';

// OpenAI's resources that will be used in different endpoints
global.assistantID = 'asst_zy9rLkw0KQ4Q9J0Ye5s5PHWg';
global.vectorStoreID = null;

// Project counter for the assistant
global.projectCount = 0;

// Response object for the SSE
let progressRes = null;

// Middleware to parse JSON bodies
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve the index.html file when the root URL is accessed
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Enable CORS
app.use(cors());

// SSE endpoint to send updates to the client
app.get('/progress', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Store the progress response
    progressRes = res;

    // Listen for the close event to clean up
    req.on('close', () => {
        cleanUpProgress(progressRes);
    });
});

// POST endpoint for the first API query
app.post('/initialize', upload.fields([{
        name: 'standards', maxCount: 1
    }, {
        name: 'criteria', maxCount: 1
    }]), async (req, res) => {
    
    // Activity detected
    updateLastActivity();

    // Check if the request contains the files
    if (!req.files || !req.files['standards'])
        return res.status(400).json({ error: 'Les fichiers n\'ont pas été reçus par le système.' });

    // Prepare the assistant and vector store
    await prepareAssistant(req, res, openai, progressRes);

    // Send the response back to the client
    return res.json({ success: true });
});

// POST endpoint for the next API queries
app.post('/ask', upload.any(), async (req, res) => {

    // Activity detected
    updateLastActivity();

    // Check if the request contains the files
    if (!req.files || !req.files.length) {
        console.log("No files received.");
        return res.status(400).json({ error: 'Les fichiers n\'ont pas été reçus par le système.' });
    }

    // Check if the assistant and vector store are ready
    if (!global.assistantID || !global.vectorStoreID) {
        console.log("Assistant not ready.");
        return res.status(400).json({ error: 'L\'assistant n\'est pas prêt à générer une réponse.' });
    }

    // Process the files
    const files = {};
    req.files.forEach(file => {
        const field = file.fieldname;
        // Group the files by field name
        if (!files[field])
            files[field] = [];
        files[field].push(file);
    });

    // Number of files groups
    const nbGroups = Object.keys(files).length;
    let currentGroup = 1;

    // Return to client-side as soon as first feedback is ready
    let firstFeedbackProcessed = false;

    // Loop through each field and generate feedback
    for (const field in files) {
        console.log("Generating feedback for project "+global.projectCount+"...");
        console.log("Group "+currentGroup+" of "+nbGroups+" for this batch of projects.");
        const fieldFiles = files[field];
        await generateFeedback(fieldFiles, res, openai, progressRes, currentGroup, nbGroups);
        global.projectCount++;
        currentGroup++;

        // Send the first response back
        if (!firstFeedbackProcessed) {
            firstFeedbackProcessed = true;
            res.json({ success: true });
        }
        // For the other projects, send the response with SSE
        else
            sendFeedbackUpdate(progressRes, global.projectCount);
    }
});

// GET endpoint to get the selected API response
app.post('/get-api-response', (req, res) => {
    // Activity detected
    updateLastActivity();

    const pjNumber = req.body.pjNumber;
    if (global.apiResponse[pjNumber])
        res.json({ success: true, response: global.apiResponse[pjNumber] });
    else
        res.status(404).json({ success: false, error: 'La réponse n\'est pas encore prête.' });
});

// GET endpoint to get all stored responses
app.get('/get-stored-responses', (req, res) => {
    
    // Activity detected
    updateLastActivity();

    // Ensure that checkedResponses is not null if the user had not checked any responses
    if (!global.checkedResponses)
        global.checkedResponses = [];
    // Same for summaries
    if (!global.summaries)
        global.summaries = '';

    if (global.apiResponse && global.checkedResponses) {
        console.log("No problem here.");
        res.json({ success: true, allResponses: global.apiResponse, checkedResponses: global.checkedResponses, summaries: global.summaries });
    }
    else
        res.status(404).json({ success: false, allResponses: global.apiResponse, checkedResponses: global.checkedResponses, summaries: global.summaries, error: 'La réponse n\'est pas encore prête.' });
});

// POST endpoint to store the checked responses
app.post('/store-checked-responses', (req, res) => {
    // Activity detected
    updateLastActivity();

    global.checkedResponses = req.body.checkedResponses;
    res.json({ success: true });
});

// POST endpoint to retrieve a detailed summary of all checked responses
app.post('/get-summaries', async (req, res) => {

    // Activity detected
    updateLastActivity();

    // Store the checked responses
    global.checkedResponses = req.body.checkedResponses;

    // Check for checked responses
    if (!global.checkedResponses) {
        console.log("No responses selected by the user.");
        return res.status(400).json({ error: 'Vous n\'avez sélectionné aucune réponse.' });
    }

    // Generate the summaries
    global.summaries = await generateSummaries(global.checkedResponses, openai);
    res.json({ success: true, response: global.summaries });
});

// Periodically check for inactivity every minute
setInterval(async () => {
    if (await checkInactivity(openai))
        console.log("Inactivity detected. Cleaning up resources...");
}, 60000);

// Define the default port number
const DEFAULT_PORT = 5000;

// Define the actual port number
const port = process.env.PORT || DEFAULT_PORT;

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
