 
const express = require('express');     // Import Express JS to create the server
const OpenAI = require("openai");   // Import OpenAI class to interact with the API
const dotenv = require('dotenv');       // Import dotenv to read environment variables from .env file
const path = require('path');           // Import path to work with file and directory paths
const multer = require('multer');       // Import multer to add files to the request object
const fs = require('fs');               // Import fs to send files to the openai api
//const ASSISTANT_ID = 

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

const upload = multer({
    storage: storage,
    limits: {fileSize: 50 * 1024 * 1024}
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
    /*
    if (!standardsUpload || !criteriaUpload || !submissionUpload) {
        return res.status(400).json({ error: 'Un fichier de normes de programmation, un énoncé'+
            ' et au moins un travail d\'étudiant sont requis.'});
    }
    */

    standards = standardsUpload[0];
    criteria = criteriaUpload[0];
    if (referenceUpload) {
        reference = referenceUpload[0];
        console.log("Reference solution loaded.");
    } else {
        reference = null;
        console.log("No reference solution provided.");
    }

    console.log(submissionUpload.length+" students solutions loaded.");

    // Query API
    try {
        // Create a readstream with the files uploaded except the students' solutions
        let filePaths = [
            'uploads/'+standards.filename,
            'uploads/'+criteria.filename,
            'uploads/'+submissionUpload[0].filename
        ];
        if (reference != null)
            filePaths.push('uploads/'+reference.filename)

        // Upload the files and get their ID
        const uploadFiles = async(filePaths) => {
            try {
                const fileIDs = [];
                for (const filePath of filePaths) {
                    const uploadedFile = await openai.files.create({
                        file: fs.createReadStream(filePath),
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

        const fileIDs = await uploadFiles(filePaths);

        // Create the vector store
        let vectorStore = await openai.beta.vectorStores.create({
            name: "Student Project",
        });

        // Add the files to the vector store
        await openai.beta.vectorStores.fileBatches.createAndPoll(
            vectorStore.id,
            { file_ids: fileIDs },
        );

        // Create the assistant
        let instructions = `If you're unable to process the files, please
        provide the error you're encountering.
        
        Perform the following actions :
        1 - Based on the file corresponding to the id ${fileIDs[1]}, write a 
        checklist with bullet points that will indicate to a programmer what he 
        must include in his code in this format :
            ### Section
            - ...
            - ...
            ### Other section
            - ...
            ...
        2 - Add to the checklist instructions from the file ${fileIDs[0]} that have
        not yet been stated in the checklist. Print this checklist.
        3 - Verify if the code provided respects each bullet point by adding 'yes',  
        'no' or 'N/A' if it does not apply, in the following format. Do not verify
        the code before your checklist is completed and printed.
            yes - ...
            yes - ...
            no - ...
            ...
        4 - Is there any syntax errors that could prevent the code compilation?

        Use the following format :
        '''Your checklist from step 1 and 2'''
            ...
        '''Your result of the code verification'''
            ...
        `;

        /*
        if (reference != null) {
            instructions += " A reference solution is also provided as an example of a great project.";
        }
        */

        const assistant = await openai.beta.assistants.create({
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

        // Create the thread and run
        const thread = await openai.beta.threads.create(
            /*messages: [
                {
                    role: "user",
                    content: question,
                },
            ],*/
        );
        const run = await openai.beta.threads.runs.createAndPoll(
            thread.id,
            {
                assistant_id: assistant.id,
            }
        );

        console.log("API queried");

        if (run.status === 'completed') {
            const messages = await openai.beta.threads.messages.list(run.thread_id);
            for (const message of messages.data.reverse()) {
                console.log(`${message.role} > ${message.content[0].text.value}`);
            }
        }

        // Delete the assistant
        await openai.beta.assistants.del(assistant.id);
        console.log("Assistant deleted");

        // Delete the vector store
        await openai.beta.vectorStores.del(vectorStore.id);
        console.log("Vector store deleted");

        // Delete the files from OpenAI
        const list = await openai.files.list();
        const nbFiles = (list.data).length;
        console.log("Number of files before deletion : "+nbFiles);

        for (let i=0; i<nbFiles; i++) {
            try {
                let f = (list.data)[i];
                await openai.files.del(f.id);
            } catch (error) {
                console.log("Failed to delete a file from openai.");
            }
        }
        console.log("All files have been deleted.");

        return;

        // Set the response headers
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Transfer-Encoding', 'chunked');

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

        // Write the response to the client
        res.write(responseText);
        res.write(responseCitations);



        // Query the API for each student projects
        for (let i=0; i<submissionUpload.length; i++) {
            console.log("Analyzing student solution "+(i+1)+"...");

            // Create the file
            const studentProjectFile = await openai.files.create({
                file: fs.createReadStream(path.resolve('uploads/'+submissionUpload[i].filename)),
                purpose: 'assistants',
            });

            // Attach the file to the vector store
            await openai.beta.vectorStores.files.create(
                vectorStore.id,
                {
                    file_id: studentProjectFile.id
                }
            );

            // Update the assistant with the new vector store
            const updatedAssistant = await openai.beta.assistants.update(assistant.id, {
                tool_resources: { file_search: {vector_store_ids: [vectorStore.id] } },
            });
            console.log("Assistant updated with student solution "+(i+1)+".");

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

            // Write the response to the client
            res.write(responseText);
            res.write(responseCitations);

            // Delete the file from the vector store and from openai
            await openai.beta.vectorStores.files.del(
                vectorStore.id,
                studentProjectFile.id
            );
            await openai.files.del(studentProjectFile.id);
            console.log("Student solution "+(i+1)+" done.");
        }

        // Delete files from 'uploads' folder after use
        fs.readdir('uploads', (err, files) => {
            if (err) throw err;
            for (const file of files) {
                fs.unlink(path.join('uploads', file), (err) => {
                    if (err) throw err;
                });
            }
        });

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
