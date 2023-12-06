const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const multer = require("multer");
const OpenAI = require("openai");
const fsPromises = require("fs").promises;
const fs = require("fs");
require("dotenv").config();

// Initialize Express app
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Initialize OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Multer for file upload
const upload = multer({ dest: "uploads/" });

// Async function to create or get existing assistant
async function getOrCreateAssistant() {
  const assistantFilePath = "./assistant.json";
  let assistantDetails;

  try {
    // Check if the assistant.json file exists
    const assistantData = await fsPromises.readFile(assistantFilePath, "utf8");
    assistantDetails = JSON.parse(assistantData);
  } catch (error) {
    // If file does not exist, create a new assistant
    const assistantConfig = {
      name: "Helper",
      instructions: "you are helpful assistant.",
      tools: [{ type: "retrieval" }],
      model: "gpt-4-1106-preview",
    };

    const assistant = await openai.beta.assistants.create(assistantConfig);
    assistantDetails = { assistantId: assistant.id, ...assistantConfig };

    // Save the assistant details to assistant.json
    await fsPromises.writeFile(
      assistantFilePath,
      JSON.stringify(assistantDetails, null, 2)
    );
  }

  return assistantDetails;
}

// POST endpoint to handle chat
app.post("/chat", async (req, res) => {
  try {
    const { question } = req.body;
    const assistantDetails = await getOrCreateAssistant();

    // Create a thread using the assistantId
    const thread = await openai.beta.threads.create();

    // Pass in the user question into the existing thread
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: question,
    });

    // Create a run
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistantDetails.assistantId,
    });

    // Fetch run-status
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);

    // Polling mechanism to see if runStatus is completed
    while (runStatus.status !== "completed") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    }

    // Get the last assistant message from the messages array
    const messages = await openai.beta.threads.messages.list(thread.id);
    const lastMessageForRun = messages.data
      .filter(
        (message) => message.run_id === run.id && message.role === "assistant"
      )
      .pop();

    if (lastMessageForRun) {
      res.json({ response: lastMessageForRun.content[0].text.value });
    } else {
      res.status(500).send("No response received from the assistant.");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred");
  }
});

// POST endpoint for file upload
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const assistantDetails = await getOrCreateAssistant();
    const file = await openai.files.create({
      file: fs.createReadStream(req.file.path),
      purpose: "assistants",
    });

    // Retrieve existing file IDs from assistant.json to not overwrite
    let existingFileIds = assistantDetails.file_ids || [];

    // Update the assistant with the new file ID
    await openai.beta.assistants.update(assistantDetails.assistantId, {
      file_ids: [...existingFileIds, file.id],
    });

    // Update local assistantDetails and save to assistant.json
    assistantDetails.file_ids = [...existingFileIds, file.id];
    await fsPromises.writeFile(
      "./assistant.json",
      JSON.stringify(assistantDetails, null, 2)
    );

    res.send("File uploaded and successfully added to assistant");
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred during file upload");
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
