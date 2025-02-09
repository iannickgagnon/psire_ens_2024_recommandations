const { cleanUpProgress, sendFeedbackUpdate } = require('./scripts/utils');
const { prepareAssistant, generateFeedback } = require('./scripts/assistant');

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

// OpenAI's resources that will be used in different endpoints
global.assistantID = null;
global.vectorStoreID = null;

// Project counter for the assistant
global.projectCount = 0;

// Response object for the SSE
let progressRes = null;

// Delete files from 'uploads' folder after use
fs.readdir('uploads', (err, files) => {
    if (err) throw err;
    for (const file of files) {
        fs.unlink(path.join('uploads', file), (err) => {
            if (err) throw err;
        });
    }
});

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

// GET endpoint to get all stored responses
app.get('/get-stored-responses', (req, res) => {
    // Ensure that checkedResponses is not null if the user had not checked any responses
    if (!global.checkedResponses)
        global.checkedResponses = [];

    if (global.apiResponse && global.checkedResponses)
        res.json({ success: true, allResponses: global.apiResponse, checkedResponses: global.checkedResponses });
    else
        res.status(404).json({ success: false, allResponses: global.apiResponse, checkedResponses: global.checkedResponses, error: 'La réponse n\'est pas encore prête.' });
});

// POST endpoint for the first API query
app.post('/initialize', upload.fields([{
        name: 'standards', maxCount: 1
    }, {
        name: 'criteria', maxCount: 1
    }]), async (req, res) => {

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

    // Return to client-side as soon as first feedback is ready
    let firstFeedbackProcessed = false;

    // Loop through each field and generate feedback
    for (const field in files) {
        console.log("Generating feedback for project "+global.projectCount+"...");
        const fieldFiles = files[field];
        await generateFeedback(fieldFiles, res, openai, progressRes);
        global.projectCount++;

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

// POST endpoint to free up resources
app.post('/clean-up', async (req, res) => {
    try {
        console.log("Freeing up resources...");

        // Check if the assistant and vector store are set
        if (global.assistantID && global.vectorStoreID) {
            // Delete the assistant
            try {
                await openai.beta.assistants.del(assistantID);
                console.log("Assistant deleted");
            } catch (error) {
                console.error("Error deleting assistant:", error);
                console.error("Error message :", error.message);
                console.error("Error stack :", error.stack);
            }

            // Delete the vector store
            try {
                await openai.beta.vectorStores.del(vectorStoreID);
                console.log("Vector store deleted");
            } catch (error) {
                console.error("Error deleting vector store:", error);
                console.error("Error message :", error.message);
                console.error("Error stack :", error.stack);
            }
        }

        // Delete the files from OpenAI
        try {
            const list = await openai.files.list();
            for (const file of list.data)
                await openai.files.del(file.id);
            console.log("All files have been deleted.");
        } catch (error) {
            console.error("Error deleting files:", error);
            console.error("Error message :", error.message);
            console.error("Error stack :", error.stack);
        }

        // Delete files from 'uploads' folder after use
        try {
            const uploadedFiles = await fs.promises.readdir('uploads');
            const deleteFiles = uploadedFiles.map(async (file) =>
                fs.promises.unlink(path.join('uploads', file))
            );
            await Promise.all(deleteFiles);
            console.log("uploads folder cleaned up.");
        } catch (error) {
            console.error("Error deleting files from uploads folder:", error);
            console.error("Error message :", error.message);
            console.error("Error stack :", error.stack);
        }

        cleanUpProgress(progressRes);
        res.json({});
    } catch (error) {
        console.error("The following error occurred:", error);
        console.error("Error message :", error.message);
        console.error("Error stack :", error.stack);
    }
});

// POST endpoint to clean up the tests
app.post('/clean-up-tests', async (req, res) => {
    try {
        // List all assistants
        const assistants = await openai.beta.assistants.list();
        console.log("Nb of assistants: ", assistants.data.length);
        for (const assistant of assistants.data) {
            await openai.beta.assistants.del(assistant.id);
        }
        console.log("All assistants deleted.");

        // List all vector stores
        const vectorStores = await openai.beta.vectorStores.list();
        console.log("Nb of vector stores: ", vectorStores.data.length);
        for (const vectorStore of vectorStores.data) {
            await openai.beta.vectorStores.del(vectorStore.id);
        }
        console.log("All vector stores deleted.");

        // Delete the files from OpenAI
        const list = await openai.files.list();
        console.log("Nb of files: ", list.data.length);
        for (const file of list.data)
            await openai.files.del(file.id);
        console.log("All files have been deleted.");

        // Delete files from 'uploads' folder after use
        try {
            const uploadedFiles = await fs.promises.readdir('uploads');
            const deleteFiles = uploadedFiles.map(async (file) =>
                fs.promises.unlink(path.join('uploads', file))
            );
            await Promise.all(deleteFiles);
            console.log("uploads folder cleaned up.");
        } catch (error) {
            console.error("Error deleting files from uploads folder:", error);
            console.error("Error message :", error.message);
            console.error("Error stack :", error.stack);
        }

        cleanUpProgress(progressRes);
        return res.json({});
    } catch (error) {
        console.error("The following error occurred:", error);
        console.error("Error message :", error.message);
        console.error("Error stack :", error.stack);
    }
});

// POST endpoint to get one of the API responses
app.post('/get-api-response', (req, res) => {
    const pjNumber = req.body.pjNumber;
    if (global.apiResponse[pjNumber])
        res.json({ success: true, response: global.apiResponse[pjNumber] });
    else
        res.status(404).json({ success: false, error: 'La réponse n\'est pas encore prête.' });
});

// POST endpoint to store the checked responses
app.post('/store-checked-responses', (req, res) => {
    global.checkedResponses = req.body.checkedResponses;
    res.json({ success: true });
});

// Define the default port number
const DEFAULT_PORT = 5000;

// Define the actual port number
const port = process.env.PORT || DEFAULT_PORT;

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
