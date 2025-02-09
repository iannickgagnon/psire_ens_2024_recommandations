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
        ...
        Weaknesses:
        - [Weakness 1 description, line number]
        - [Weakness 2 description, line number]
        ...

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
        let projectNumber = global.projectCount + 1;
        let thread;
        try {
            thread = await openai.beta.threads.create({
                messages: [
                    {
                        role: 'user',
                        content: "Here is the student project #" + projectNumber + ".",
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

        console.log("Thread created successfully.");

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
            global.apiResponse.push(text.value);
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