
const { sendProgressUpdate, uploadFiles } = require('./utils');

async function prepareAssistant(req, res, openai, progressRes) {
    
    // Query API
    try {

        sendProgressUpdate(10, "Téléchargement des instructions...", progressRes);

        // Upload the standards and criteria files
        let fileIDS = [];
        try {
            fileIDS = await uploadFiles([
                req.files['standards'][0],
                req.files['criteria'] ? req.files['criteria'][0] : null,
            ],
            openai);
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
        Perform the following actions :
        1 - Based on the file corresponding to the id ${fileIDS[0]}, write a 
        checklist with bullet points that will indicate to a programmer what he 
        must include in his code in this format :
            ### Section
            - ...
            - ...
            ### Other section
            - ...
            ...
        2 - (optional) If you can find a file corresponding to the id ${fileIDS[1]}, add instructions 
        that have not yet been stated in the checklist.
        3 - Print the checklist.
        4 - Verify if the code provided respects each bullet point by adding 'yes',  
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

        sendProgressUpdate(20, "Préparation de l'assistant...", progressRes);
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
            global.assistantID = assistant.id;
            global.vectorStoreID = vectorStore.id;
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

async function generateFeedback(submissions, res, openai, progressRes) {
    
    console.log(submissions.length + " project files loaded.");

    try {
        sendProgressUpdate(30, "Téléversement des fichiers étudiants...", progressRes);
        // Upload the student projects
        let studentFiles;
        try {
            studentFiles = await uploadFiles(submissions, openai);
            console.log("Student files uploaded successfully.");
        } catch (error) {
            return res.status(500).json({ error: 'Une erreur est survenue lors du téléversement des fichiers des étudiants.' });
        }

        sendProgressUpdate(50, "Analyse des fichiers...", progressRes);

        // Attach the student files to the thread
        let thread;
        try {
            thread = await openai.beta.threads.create({
                messages: [
                    {
                        role: 'user',
                        content: "Here is the student project #" + global.projectCount + ".",
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
                    assistant_id: global.assistantID,
            });
        } catch (error) {
            console.error("Error running thread:", error);
            console.error("Error message :", error.message);
            console.error("Error stack :", error.stack);
            return res.status(500).json({ error: 'Une erreur est survenue lors de l\'analyse des fichiers.' });
        }

        sendProgressUpdate(80, "Préparation d'une réponse...", progressRes);
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

        sendProgressUpdate(100, "Renvoi de la réponse...", progressRes);

        console.log("Sending the response back to the client.");
        // Store the response and indicate to the client that the response is ready
        if (message && message.content && message.content[0].type === 'text') {
            const text = message.content[0].text;
            global.apiResponse = text.value;
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

module.exports = { prepareAssistant, generateFeedback };