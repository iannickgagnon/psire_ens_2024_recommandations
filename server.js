

// Import the OpenAI class from the openai package
const { OpenAI } = require("openai");

// Import the dotenv package to load environment variables from a .env file
const dotenv = require('dotenv');

// Load the environment variables from the .env file
dotenv.config();

// Create a new instance of the OpenAI class from the environment variables
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    organization: process.env.OPENAI_ORG_KEY,
    project: process.env.OPENAI_PROJECT_ID,
});


async function main() {

    try {

        // Create a new completion stream with GPT-3.5-turbo
        const stream = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ 
                role: "user", 
                content: "Say hello" 
            }],
            stream: true,
        });

        // Iterate over the stream and write the response to the console
        for await (const chunk of stream) {
            process.stdout.write(chunk.choices[0]?.delta?.content || "");
        }

    } catch (error) {
        console.error("The following error occured:", error);
    }
}

// Call the main function
main();
