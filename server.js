 
const express = require('express');     // Import Express JS to create the server
const { OpenAI } = require("openai");   // Import OpenAI class to interact with the API
const dotenv = require('dotenv');       // Import dotenv to read environment variables from .env file
const path = require('path');           // Import path to work with file and directory paths

// Load environment variables from .env file
dotenv.config();

// Create an Express application
const app = express();

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
app.use(express.json());

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve the index.html file when the root URL is accessed
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/ask', async (req, res) => {

    // Extract the question from the request body
    const question = req.body.question;

    // Check if the question is provided
    if (!question) {
        return res.status(400).json({ error: 'Question is required' });
    }

    // Query API
    try {

        // Call the OpenAI API to get a response
        const stream = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: question }],
            stream: true,
        });

        // Set the response headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Write the response to the client
        for await (const chunk of stream) {
            res.write(chunk.choices[0]?.delta?.content || "");
        }

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
