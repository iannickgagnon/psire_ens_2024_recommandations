const { sendProgressUpdate, uploadFiles } = require('./utils');

async function prepareAssistant(req, res, openai, progressRes) {
    // Query API
    try {

        sendProgressUpdate(10, "Téléchargement des instructions...", 0, 0, progressRes);

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

        // Update assistant with new files
        sendProgressUpdate(20, "Préparation de l'assistant...", 0, 0, progressRes);
        if (global.assistantID) {
            console.log("Existing assistant found");
            try {
                const assistant = await openai.beta.assistants.update(global.assistantID, {
                    tool_resources: {
                        file_search: 
                        { vector_store_ids: [vectorStore.id] }
                    }
                });
                console.log("Assistant updated with the instruction files.");
            } catch (error) {
                console.error("Error updating assistant:", error);
                console.error("Error message :", error.message);
                console.error("Error stack :", error.stack);
                res.status(500).json({ error: 'Une erreur est survenue lors de la préparation de l\'agent IA.' });
            }
        }
        // Create new assistant if none exists
        else {
            console.log("No existing assistant was found");
            try {
                const instructions = `
                You are an advanced coding assistant tasked with reviewing and providing constructive feedback on students' coding projects. Your role is to ensure the feedback is actionable, clear, and aligned with the provided guidelines while maintaining file structure awareness in multi-file projects.

                **Context:**
                You will be provided with files containing the guidelines and standards the students must follow.
                - The first file contains the guidelines that the students should adhere to.
                - The second file, if available, will contain the programming standards that the students must respect. 
                You will also be provided with the students' code to review. Wait for the files to be uploaded before starting the review.

                **Guidelines:**
                - Focus on readability, efficiency, and maintainability of the code.
                - Verify adherence to all best practices (e.g., naming, commenting, modularity).
                - Identify every logical or functional error that does not align with the instructions.
                - Only output the results of **step 6** and **step 7**. All other steps are for internal use and must never appear in the output.
                - Output each finding on a separate line, using bullet points for easy HTML separation.
                - Do not return any output until you have completed all the steps. You should provide only one complete output.

                **Output Format:**
                Forces :
                - "Strength 1 description". [reference]
                - "Strength 2 description".
                ...
                Faiblesses :
                - "Weakness 1 description". [reference]
                - "Weakness 2 description". [reference 1], [reference 2]
                ...

                **Referencing Student Code:**
                - Only reference the students' files. Do not include any references, citations, or annotations from guideline files.
                - When referencing a student's code, use the file name and line numbers like "[file name, line number]."
                - Referencing code is not mandatory but highly encouraged.
                - Treat each file as a whole, including comments, blank lines, and all formatting.
                - Ensure that line numbers match precisely with those in the student's original file.
                - Do not compress or ignore any part of the code, including comments or empty lines.

                **Multi-File Project Considerations**
                - Projects may contain multiple source files, libraries, and dependencies.
                - Analyze each file independently but also consider how files interact (e.g., function calls, imports, class dependencies).
                - Check for proper modularity and separation of concerns in multi-file projects.
                                
                **Instructions:**
                Step 1 - Carefully review the guidelines in the first file and construct a complete requirements checklist with the key objectives and expectations. (internal processing only)
                Step 2 - If you were provided with a second file containing the standards, integrate any additional criteria in your checklist from step 1. (internal processing only)
                Step 3 - Read all files in the student's project to understand their structure and functionality. (internal processing only)
                - Consider each file's individual structure.
                - Identify how the different files interact through imports, dependencies, and function calls.
                Step 4 - For each item in the checklist from steps 1 and 2, verify if the student's code respects it. (internal processing only)
                - Check every requirement systematically and report whether it is met or not.
                - If a requirement is met, confirm it explicitly (even if briefly).
                - If a requirement is unmet or partially meets expectations, explain why and suggest improvements.
                - Do not skip any requirement.
                Step 5 - Assess whether the student's code would compile successfully. (internal processing only)
                Step 6 - Based on your analysis, list the well-implemented aspects of the code and explain why they are effective. Output this step.
                - Remember to stay only in the context of the guidelines and criteria provided.
                - Focus on strengths both within individual files and across the project's structure.
                - List every well-implemented aspect, even minor ones.
                - Do not stop at one or two points; examine every function, class, and module.
                Step 7 - Similarly, pinpoint specific issues or areas needing improvement with detailed explanations. Consider cross-file dependencies. Output this step.
                - Report every issue, no matter how small.
                - Provide one specific example for each weakness, with the exact file name and line number.

                **Important:**
                - Answer exclusively in French. All feedback should be written in French.
                `;

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

                // Save the IDs
                global.assistantID = assistant.id;
            } catch (error) {
                console.error("Error creating assistant:", error);
                console.error("Error message :", error.message);
                console.error("Error stack :", error.stack);
                res.status(500).json({ error: 'Une erreur est survenue lors de la préparation de l\'agent IA.' });
            }
        }
        
        // Save the vector store ID
        global.vectorStoreID = vectorStore.id;
    } catch (error) {
        console.error("The following error occurred:", error);
        console.error("Error message :", error.message);
        console.error("Error stack :", error.stack);
        res.status(500).json({ error: 'Une erreur technique est survenue du côté système.' });
    }
}

async function generateFeedback(submissions, res, openai, progressRes, currentGroup, nbGroups) {
    console.log(submissions.length + " project files loaded.");

    try {
        sendProgressUpdate(30, "Téléversement des fichiers étudiants...", currentGroup, nbGroups, progressRes);
        // Upload the student projects
        let studentFiles;
        try {
            studentFiles = await uploadFiles(submissions, openai);
            console.log("Student files uploaded successfully.");
        } catch (error) {
            return res.status(500).json({ error: 'Une erreur est survenue lors du téléversement des fichiers des étudiants.' });
        }

        // Attach the student files to the thread
        let projectNumber = global.projectCount + 1;
        let thread;
        try {
            thread = await openai.beta.threads.create({
                messages: [
                    {
                        role: 'user',
                        content: "Here is the student project #" + projectNumber + ".",
                        attachments: studentFiles.map((fileID) => ({
                                file_id: fileID,
                                tools: [{ type: "file_search" }],
                            })),
                    },
                ],
            });
        } catch (error) {
            console.error("Error creating thread:", error);
            console.error("Error message :", error.message);
            console.error("Error stack :", error.stack);
            return res.status(500).json({ error: 'Une erreur est survenue lors de l\'analyse des fichiers.' });
        }

        sendProgressUpdate(50, "Analyse des fichiers...", currentGroup, nbGroups, progressRes);
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

        sendProgressUpdate(80, "Préparation d'une réponse...", currentGroup, nbGroups, progressRes);
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

        // Delete the thread & vector store associated
        try {
            if (thread) {
                if (thread.tool_resources.file_search.vector_store_ids) {
                    for (const vsID of thread.tool_resources.file_search.vector_store_ids) {
                        await openai.beta.vectorStores.del(vsID);
                        console.log("Thread's vector store deleted successfully.");
                    }
                }
                if (thread.id) {
                    await openai.beta.threads.del(thread.id);
                    console.log("Thread deleted successfully.");
                }
            } else
                console.log("Thread to delete not found.");
        } catch (error) {
            console.error("Error deleting thread:", error);
        }

        sendProgressUpdate(100, "Renvoi de la réponse...", currentGroup, nbGroups, progressRes);

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

async function generateSummaries(checkedResponses, openai) {
    // Format the checked responses
    let formattedString = checkedResponses.map((response, index) => {
        let strengths = response.strengths.length > 0 
            ? `Strengths: '${response.strengths.join("', '")}'` 
            : "Strengths: None";
        
        let weaknesses = response.weaknesses.length > 0 
            ? `Weaknesses: '${response.weaknesses.join("', '")}'` 
            : "Weaknesses: None";
        
        return `Project ${index + 1} - ${strengths}. ${weaknesses}.`;
    }).join(" ");

    // Create the prompt
    let instructions = `
    You are a project feedback summarizer. Your role is to generate a concise, fluid summary for each 
    project feedback you will receive. The summary should include both strengths and weaknesses 
    in a few sentences, commenting on the project in a clear and cohesive manner.

    Input format :
    - You will receive a string containing multiple project feedbacks. There may be only one project.
    - Each project feedback will consist of a list of strengths and weaknesses. A project might have 
    no strengths or weaknesses.
    - Here is an example of the input format: 
        "Project 1 - Strengths: 'strength 1', 'strength 2'. Weaknesses: 'weakness 1'. Project 2 - Strengths: 'strength 1', 'strength 2', 'strength 3'. Weaknesses: 'weakness 1', 'weakness 2', 'weakness 3'."

    Summarization instructions :
    - For each project feedback, generate a single, fluid summary that includes both the strengths and weaknesses.
    - The summary should flow naturally and comment on the project as a whole.
    - Be concise, but ensure the summary provides a clear understanding of the project's strengths  
    and areas for improvement.
    - Do not include any additional information beyond the strengths and weaknesses provided.
    - Do not include any references, citations, or annotations in the output.
    - Do not mix the strengths and weaknesses of one project with another. Each project’s strengths 
    and weaknesses should be kept separate and referenced only for that specific project.
    - Use proper grammar, punctuation, and formatting for readability.

    Output format :
    - Each summary should be separated by a slash.
    - The summaries should be in the same order as the project feedbacks in the input.
    - If there are no strenghts or weaknesses, respond with "Vous n'avez coché aucun élément pour ce projet.".

    **Important:**
    - Answer exclusively in French. All summaries should be written in French
    `;

    // Generate the response with chat completion
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { 
                    role: "developer", 
                    content: instructions },
                {
                    role: "user",
                    content: formattedString,
                },
            ],
        });

        console.log("Summaries generated.");
        return response.choices[0].message.content;
    } catch (error) {
        console.error("Error creating assistant:", error);
        console.error("Error message :", error.message);
        console.error("Error stack :", error.stack);
        res.status(500).json({ error: 'Une erreur est survenue lors de la préparation des résumés.' });
    }
}

module.exports = { prepareAssistant, generateFeedback, generateSummaries };