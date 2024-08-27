 
const express = require('express');     // Import Express JS to create the server
const OpenAI = require("openai");   // Import OpenAI class to interact with the API
const dotenv = require('dotenv');       // Import dotenv to read environment variables from .env file
const path = require('path');           // Import path to work with file and directory paths
const multer = require('multer');       // Import multer to add files to the request object
const fs = require('fs');               // Import fs to send files to the openai api

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
    // TODO : Change filenames for "criteria", "standards", etc., depending on the input id
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
    storage: storage,
    limits: {fileSize: 50 * 1024 * 1024}
});

// Remove current files from 'upload' folder
fs.readdir('uploads', (err, files) => {
    if (err) throw err;
    for (const file of files) {
        fs.unlink(path.join('uploads', file), (err) => {
            if (err) throw err;
        });
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

// Middleware to parse JSON bodies
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve the index.html file when the root URL is accessed
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/ask', upload.fields([{
        name: 'standards', maxCount: 1
    }, {
        name: 'criteria', maxCount: 1
    }, {
        name: 'reference', maxCount: 1
    }, {
        name: 'submissions', maxCount: 50
    }]), async (req, res) => {

    // Extract the question from the request body
    const question = req.body.question;

    // Check if the question is provided
    if (!question) {
        return res.status(400).json({ error: 'Question is required' });
    }

    // Extract the files from the request files
    standardsUpload = req.files['standards'];
    criteriaUpload = req.files['criteria'];
    referenceUpload = req.files['reference'];
    submissionUpload = req.files['submissions'];

    // Check if standards, criteria and submission were uploaded by user
    if (!standardsUpload || !criteriaUpload || !submissionUpload) {
        return res.status(400).json({ error: 'Un fichier de normes de programmation, un énoncé'+
            ' et au moins un travail d\'étudiant sont requis.'});
    }

    standards = standardsUpload[0];
    criteria = criteriaUpload[0];
    if (referenceUpload) {
        reference = referenceUpload[0];
    } else {
        reference = null;
    }

    // Query API
    try {
        // Create the assistant
        let instructions = "You're a programming teacher assistant, helping to generate "+
            "constructive feedback for beginner students' projects. The projects, sent as files, "+
            "must meet all the requirements stated in one of the attached file. The projects must " +
            "also respect the standards of coding given in another one of the attached file." ;

        if (reference != null) {
            instructions += " A reference solution is also provided as an example of a great project.";
        }
        const assistant = await openai.beta.assistants.create({
            name: "Code review helper",
            instructions: instructions,
            model: "gpt-4o",
            tools: [{ type: "file_search" }], // Configure the API to read documents from outside its model
        });

        // Create a readstream with the files uploaded
        let filePaths = [
            'uploads/'+standards.filename,
            'uploads/'+criteria.filename
        ];
        if (reference != null)
            filePaths.push('uploads/'+reference.filename)
        for (let i=0; i<submissionUpload.length; i++) {
            filePaths.push('uploads/'+submissionUpload[i].filename);
        }
        const fileStreams = filePaths.map(filePath =>
            fs.createReadStream(path.resolve(filePath))
        );

        // Upload the files and get their ID
        const uploadFiles = async(fileStreams) => {
            try {
                const fileIDs = [];
                for (const fileStream of fileStreams) {
                    const uploadedFile = await openai.files.create({
                        file: fileStream,
                        purpose: 'assistants',
                    });

                    fileIDs.push(uploadedFile.id);
                }
                return fileIDs;
            } catch (error) {
                console.error("Error uploading files:", error);
                res.status(500).json({ error: 'An error occurred while processing your request.' });
            }
        };

        const fileIDs = await uploadFiles(fileStreams);

        // Create the vector store
        let vectorStore = await openai.beta.vectorStores.create({
            name: "Student Project",
        });

        // Add the files to the vector store
        await openai.beta.vectorStores.fileBatches.createAndPoll(
            vectorStore.id,
            { file_ids: fileIDs },
        );

        // Update the assistant with the vector store
        await openai.beta.assistants.update(assistant.id, {
            tool_resources: { file_search: {vector_store_ids: [vectorStore.id] } },
        });

        console.log("Assistant updated.");

        // Create the thread and add the user's query
        const thread = await openai.beta.threads.create({
            messages: [
                {
                    role: "user",
                    content: question,
                },
            ],
        });

        console.log("Thread created.");

        // Create the run
        const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
            assistant_id: assistant.id,
        });
        const messages = await openai.beta.threads.messages.list(thread.id, {
            run_id: run.id,
        });

        console.log("API queried.");

        // Extract the first message
        const message = messages.data.pop();

        // Texts to send back to the client
        let responseText;
        let responseCitations;

        if (message && message.content[0].type === 'text') {
            const text = message.content[0].text;
            const annotations = text.annotations;
            const citations = [];

            let index = 0;
            for (let annotation of annotations) {
                text.value = text.value.replace(annotation.text, '[' + index + ']');
                const file_citation = annotation.file_citation;

                if (file_citation) {
                    const citedFile = await openai.files.retrieve(file_citation.file_id);
                    citations.push('[' + index + ']' + citedFile.filename);
                }
                index++;
            }

            responseText = text.value + '\n';
            responseCitations = citations.join('\n');
        }

        console.log("Sending the response back to the client.");

        // Set the response headers
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Transfer-Encoding', 'chunked');

        // Write the response to the client
        res.write(responseText);
        res.write(responseCitations);

        // End the response
        res.end();
    } catch (error) {
        console.error("The following error occurred:", error);
        res.status(500).json({ error: 'An error occurred while processing your request.' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
