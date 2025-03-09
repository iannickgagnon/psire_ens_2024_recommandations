const fs = require('fs');
const path = require('path');

// Track last activity time to clean ressources after 1 hour
let lastActivityTime = Date.now();
const ACTIVITY_TIMEOUT = 1000 * 60 * 60;

/**
 * Updates the last activity time to the current time.
 */
function updateLastActivity() {
    lastActivityTime = Date.now();
    console.log("Activity detected");
}

/**
 * Checks if the session has been inactive for too long and frees up resources if necessary.
 * @param {*} openai - The OpenAI API client.
 * @param {*} progressRes - The response object to write the progress update to.
 * @returns {boolean} True if the session was inactive and resources were freed up, false otherwise.
 */
async function checkInactivity(openai, progressRes) {
    const currentTime = Date.now();
    if (currentTime - lastActivityTime > ACTIVITY_TIMEOUT) {
        console.log("Session inactive for too long. Freeing up resources...");
        try {        
            // Delete the vector stores
            if (global.vectorStoreID) {
                try {
                    await openai.beta.vectorStores.del(global.vectorStoreID);
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

            // Clean up the progress resource
            cleanUpProgress(progressRes);
            console.log("Progress resource cleaned up.");
    
            // Reset the global variables
            global.vectorStoreID = null;
            global.projectCount = 0;
            global.apiResponse = [];
            global.checkedResponses = [];
            global.summaries = '';

            return true;
        } catch (error) {
            console.error("The following error occurred:", error);
            console.error("Error message :", error.message);
            console.error("Error stack :", error.stack);
            return false;
        }
    }
}

/**
 * Cleans up the progress resource by ending it and setting it to null.
 *
 * @param {Object} progressRes - The progress resource to be cleaned up.
 */
function cleanUpProgress(progressRes) {
    if (progressRes)
        progressRes.end();
}

/**
 * Sends a progress update to the client.
 *
 * @param {number} value - The current progress value.
 * @param {string} message - A message describing the current progress.
 * @param {object} progressRes - The response object to write the progress update to.
 */
function sendProgressUpdate(value, message, currentGroup, nbGroups, progressRes) {
    if (progressRes) {
        const jsonData = JSON.stringify({ value: value, message: message, currentGroup: currentGroup, nbGroups: nbGroups });
        progressRes.write(`data: ${jsonData}\n\n`);
    }
}

/**
 * Notifies the client another response is ready.
 * 
 * @param {*} progressRes - The response object to write the progress update to.
 * @param {*} projectNumber - The project number ready with feedback.
 */
function sendFeedbackUpdate(progressRes, projectNumber) {
    if (progressRes) {
        const jsonData = JSON.stringify({ projectNumber: projectNumber });
        progressRes.write(`data: ${jsonData}\n\n`);
    }
}

/**
 * Uploads an array of files to the OpenAI API.
 *
 * @param {string[]} filePaths - An array of file paths to be uploaded.
 * @returns {Promise<string[]>} A promise that resolves to an array of uploaded file IDs.
 * @throws Will throw an error if the upload process fails.
 */
async function uploadFiles(filePaths, openai) {
    try {
        const fileIDs = [];
        for (const filePath of filePaths) {
            if (filePath) {
                const uploadedFile = await openai.files.create({
                    file: fs.createReadStream(path.resolve(filePath.path)),
                    purpose: 'assistants',
                });
                fileIDs.push(uploadedFile.id);
            }
        }
        return fileIDs;
    } catch (error) {
        console.error("Error uploading student files:", error);
        console.error("Error message :", error.message);
        console.error("Error stack :", error.stack);
        throw error;
    }
}

module.exports = { updateLastActivity, checkInactivity, cleanUpProgress, sendProgressUpdate, sendFeedbackUpdate, uploadFiles };
