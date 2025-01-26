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

// Define the default port number
const DEFAULT_PORT = 3000;

// Define the actual port number
const port = process.env.PORT || DEFAULT_PORT;

// Create an instance of the OpenAI class
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    organization: process.env.OPENAI_ORG_KEY,
    project: process.env.OPENAI_PROJECT_ID,
});

// Store the API response temporarily
let apiResponse = null;
// OpenAI's resources that will be used in different endpoints
let assistantID = null;
let vectorStoreID = null;
// Project counter for the assistant
let projectCount = 1;
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
        cleanUpProgress();
    });
});

// GET endpoint to get the API response
app.get('/get-api-response', (req, res) => {
    if (apiResponse)
        res.json({ success: true, response: apiResponse });
    else
        res.status(404).json({ success: false, error: 'La réponse n\'est pas encore prête.' });
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
    await prepareAssistant(req, res);

    // Send the response back to the client
    return res.json({ success: true });
});

// POST endpoint for the next API queries
app.post('/ask', upload.array('submissions', 50), async (req, res) => {
    // Check if the request contains the files
    if (!req.files || !req.files.length)
        return res.status(400).json({ error: 'Les fichiers n\'ont pas été reçus par le système.' });

    // Check if the assistant and vector store are ready
    if (!assistantID || !vectorStoreID)
        return res.status(400).json({ error: 'L\'assistant n\'est pas prêt à générer une réponse.' });

    // Generate the feedback and store the response
    await generateFeedback(req.files, res);
    projectCount++;

    // Send the response back to the client
    res.json({ success: true });
});

// POST endpoint to free up resources
app.post('/clean-up', async (req, res) => {
    try {
        console.log("Freeing up resources...");

        // Check if the assistant and vector store are set
        if (assistantID && vectorStoreID) {
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

        cleanUpProgress();
        res.json({});
    } catch (error) {
        console.error("The following error occurred:", error);
        console.error("Error message :", error.message);
        console.error("Error stack :", error.stack);
    }
});

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

        cleanUpProgress();
        return res.json({});
    } catch (error) {
        console.error("The following error occurred:", error);
        console.error("Error message :", error.message);
        console.error("Error stack :", error.stack);
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

async function prepareAssistant(req, res) {
    // Query API
    try {
        sendProgressUpdate(10, "Téléchargement des instructions...");

        // Upload the standards and criteria files
        let fileIDS = [];
        try {
            fileIDS = await uploadFiles([
                req.files['standards'][0],
                req.files['criteria'] ? req.files['criteria'][0] : null
            ]);
        } catch (error) {
            console.error("Error uploading standards and/or criteria files:", error);
            console.error("Error message :", error.message);
            console.error("Error stack :", error.stack);
            return res.status(500).json({ error: 'Une erreur est survenue lors du téléversement des fichiers.' });
        }

        // Create the vector store
        let vectorStore;
        try {
            vectorStore = await openai.beta.vectorStores.create({
                name: req.files['criteria'] ? 'Standards and Criteria Vector Store' : 'Standards Vector Store',
            });
            console.log("Vector store created successfully.");
        } catch (error) {
            console.error("Error creating vector store:", error);
            console.error("Error message :", error.message);
            console.error("Error stack :", error.stack);
            return res.status(500).json({ error: 'Une erreur est survenue lors du téléversement des fichiers.' });
        }
        
        // Add the files to the vector store
        try {
            await openai.beta.vectorStores.fileBatches.createAndPoll(
                vectorStore.id,
                { file_ids: fileIDS },
            );
            console.log("Files added to the vector store.");
        } catch(error) {
            console.error("Error adding files to vector store:", error);
            console.error("Error message :", error.message);
            console.error("Error stack :", error.stack);
            return res.status(500).json({ error: 'Une erreur est survenue lors du téléversement des fichiers.' });
        }

        // Create the assistant
        let instructions = `        
        You are an advanced coding assistant tasked with reviewing and providing constructive 
        feedback on students' coding projects. Your role is to ensure that the feedback is actionable, 
        clear, and aligned with the provided guidelines.

        Guidelines:
        1. Focus on readability, efficiency, and maintainability of the code.
        2. Highlight areas where best practices (e.g., naming conventions, proper commenting, 
        modularity) can be improved.
        3. Point out potential logical or functional errors.
        4. Suggest improvements to align the code with the project's goals and requirements.

        **Important Output Guidelines:**
        - Only output the results of **step 6** and **step 7**.
        - All other steps are for internal use and must not appear in the output under any circumstances.
        - If you include anything other than step 6 and step 7, you are failing to follow these instructions.
        - Do not include references, citations, or annotations from the guideline or standards files 
        in the output.
        - Use the line numbers from the student's code when explaining strengths and weaknesses like 
        "[file name, line number]", if applicable.
        - Output each point in the checklist on a separate line, using bullet points for easy 
        separation into HTML divs.

        Output format:
        Strengths:
        - [Strength 1 description, line number]
        - [Strength 2 description, line number]
        - [Strength 3 description, line number]
        Weaknesses:
        - [Weakness 1 description, line number]
        - [Weakness 2 description, line number]
        - [Weakness 3 description, line number]

        When analyzing the student's code:
        - Treat the file as a whole, including comments, blank lines, and all formatting.
        - Ensure that all line numbers mentioned in your feedback correspond to the exact line 
        numbers in the file as provided.
        - Do not compress or ignore any part of the code, including comments or empty lines.

        Context:
        You will be provided with a file corresponding to the id ${fileIDS[0]} 
        that contains the guidelines that the students must follow. You may also be
        provided with a file corresponding to the id ${fileIDS[1]} that contains
        the standards of programming that the students must respect. You will also be
        provided with the students' code to review. Wait for the files to be uploaded
        before starting the review.
        
        Instructions:
        Step 1 - Carefully review the guidelines stated in the first file. Identify the key objectives
        and expectations for the code. (This step is for **internal processing only**.)
        Step 2 - If you were provided with the second file containing the standards, add all other
        relevant aspects that have not yet been stated in your checklist from step 1. (This step is for 
        **internal processing only**.)
        Step 3 - Examine the student's code for an overall understanding of its structure and 
        functionality. (This step is for **internal processing only**.)
        Step 4 - Verify if the student's code respects each aspect you've noted in step 1 and 2. 
        (This step is for **internal processing only**.)
        Step 5 - Will the student's code compile? (This step is for **internal processing only**.)
        Step 6 - Based on your analysis, list the aspects of the code that are well-implemented,
        explaining why they are effective or commendable. Remember to stay only in the context of the
        guidelines and criteria provided. Output this step.
        Step 7 - Simmilarly, pinpoint specific issues or areas needing improvement. Provide detailed 
        explanations for each issue. Output this step.
        `;

        sendProgressUpdate(20, "Préparation de l'assistant...");
        let assistant = null;
        try {
            assistant = await openai.beta.assistants.create({
                name: "Code review helper",
                instructions: instructions,
                model: "gpt-4o",
                tools: [{ type: "file_search" }], // Configure the API to read documents from outside its model
                tool_resources: {
                    file_search: 
                    { vector_store_ids: [vectorStore.id] }
                }
            });
            console.log("Assistant updated with the instruction files.");

            // Save the IDs
            assistantID = assistant.id;
            vectorStoreID = vectorStore.id;
        } catch (error) {
            console.error("Error creating assistant:", error);
            console.error("Error message :", error.message);
            console.error("Error stack :", error.stack);
            res.status(500).json({ error: 'Une erreur est survenue lors de la préparation de l\'agent IA.' });
        }
    } catch (error) {
        console.error("The following error occurred:", error);
        console.error("Error message :", error.message);
        console.error("Error stack :", error.stack);
        res.status(500).json({ error: 'Une erreur technique est survenue du côté système.' });
    }
}

async function generateFeedback(submissions, res) {
    console.log(submissions.length+" project files loaded.");

    try {
        sendProgressUpdate(30, "Téléversement des fichiers étudiants...");
        // Upload the student projects
        let studentFiles;
        try {
            studentFiles = await uploadFiles(submissions);
            console.log("Student files uploaded successfully.");
        } catch (error) {
            return res.status(500).json({ error: 'Une erreur est survenue lors du téléversement des fichiers des étudiants.' });
        }

        sendProgressUpdate(50, "Analyse des fichiers...");

        // Attach the student files to the thread
        let thread;
        try {
            thread = await openai.beta.threads.create({
                messages: [
                    {
                        role: 'user',
                        content: "Here is the student project #"+projectCount+".",
                        attachments: [
                            ...studentFiles.map((fileID) => ({
                                file_id: fileID,
                                tools: [{ type: "file_search" }],
                            })),
                        ],
                    },
                ],
            });
        } catch (error) {
            console.error("Error creating thread:", error);
            console.error("Error message :", error.message);
            console.error("Error stack :", error.stack);
            return res.status(500).json({ error: 'Une erreur est survenue lors de l\'analyse des fichiers.' });
        }

        // Run the thread
        let run;
        try {
            run = await openai.beta.threads.runs.createAndPoll(thread.id, {
                    assistant_id: assistantID,
            });
        } catch (error) {
            console.error("Error running thread:", error);
            console.error("Error message :", error.message);
            console.error("Error stack :", error.stack);
            return res.status(500).json({ error: 'Une erreur est survenue lors de l\'analyse des fichiers.' });
        }

        sendProgressUpdate(80, "Préparation d'une réponse...");
        console.log("API queried");

        // Get the answer from the API
        let message;
        try {
            const messages = await openai.beta.threads.messages.list(thread.id, {
                run_id: run.id,
            });
            message = messages.data.pop();
        } catch (error) {
            console.error("Error getting the answer:", error);
            console.error("Error message :", error.message);
            console.error("Error stack :", error.stack);
            return res.status(500).json({ error: 'Une erreur est survenue lors de l\'obtention de la réponse.' });
        }

        sendProgressUpdate(100, "Renvoi de la réponse...");
        console.log("Sending the response back to the client.");
        // Store the response and indicate to the client that the response is ready
        if (message && message.content && message.content[0].type === 'text') {
            const text = message.content[0].text;
            apiResponse = text.value;
        } else {
            return res.status(500).json({ error: 'Une erreur est survenue lors de l\'obtention de la réponse.' });
        }
    } catch (error) {
        console.error("The following error occurred:", error);
        console.error("Error message :", error.message);
        console.error("Error stack :", error.stack);
        res.status(500).json({ error: 'Une erreur technique est survenue du côté système.' });
    }
}

async function uploadFiles(filePaths) {
    try {
        const fileIDs = [];
        for (const filePath of filePaths) {
            const uploadedFile = await openai.files.create({
                file: fs.createReadStream(path.resolve(filePath.path)),
                purpose: 'assistants',
            });
            fileIDs.push(uploadedFile.id);
        }
        return fileIDs;
    } catch (error) {
        console.error("Error uploading student files:", error);
        console.error("Error message :", error.message);
        console.error("Error stack :", error.stack);
        throw error;
    }
}

function sendProgressUpdate(value, message) {
    if (progressRes) {
        const jsonData = JSON.stringify({ value: value, message: message });
        progressRes.write(`data: ${jsonData}\n\n`);
    }
}

function cleanUpProgress() {
    if (progressRes) {
        progressRes.end();
        progressRes = null;
    }
}