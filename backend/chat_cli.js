// import the required dependencies
require("dotenv").config();
const OpenAI = require("openai");
const fsPromises = require("fs").promises;
const fs = require("fs");
const readline = require("readline").createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Create a OpenAI connection
const secretKey = process.env.OPENAI_API_KEY;
const openai = new OpenAI({
  apiKey: secretKey,
});

async function askQuestion(question) {
  return new Promise((resolve, reject) => {
    readline.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function main() {
  try {
    let assistantId;
    const assistantFilePath = "./assistant.json";

    // Check if the assistant.json file exists
    try {
      const assistantData = await fsPromises.readFile(
        assistantFilePath,
        "utf8"
      );
      assistantDetails = JSON.parse(assistantData);
      assistantId = assistantDetails.assistantId;
      console.log("\nExisting assistant detected.\n");
    } catch (error) {
      // If file does not exist or there is an error in reading it, create a new assistant
      console.log("No existing assistant detected, creating new.\n");
      const assistantConfig = {
        name: "Murder mystery helper",
        instructions:
          "You're a professional who hack the exam question and give professional answer.",
        tools: [{ type: "retrieval" }], // configure the retrieval tool to retrieve files in the future
        model: "gpt-4-1106-preview",
      };

      const assistant = await openai.beta.assistants.create(assistantConfig);
      assistantDetails = { assistantId: assistant.id, ...assistantConfig };

      // Save the assistant details to assistant.json
      await fsPromises.writeFile(
        assistantFilePath,
        JSON.stringify(assistantDetails, null, 2)
      );
      assistantId = assistantDetails.assistantId;
    }

    // Log the first greeting
    console.log(
      `Hello there, I'm your personal assistant. You gave me these instructions:\n${assistantDetails.instructions}\n`
    );

    // Create a thread using the assistantId
    const thread = await openai.beta.threads.create();
    // Use keepAsking as state for keep asking questions
    let keepAsking = true;
    while (keepAsking) {
      const action = await askQuestion(
        "What do you want to do?\n1. Chat with assistant\n2. Upload file to assistant \n Enter your choice (1 , 2 or 3): "
      );

      if (action === "2") {
        const fileName = await askQuestion("Enter the filename to upload: ");

        // Upload the file
        const file = await openai.files.create({
          file: fs.createReadStream(fileName),
          purpose: "assistants",
        });

        // Retrieve existing file IDs from assistant.json to not overwrite
        let existingFileIds = assistantDetails.file_ids || [];

        // Update the assistant with the new file ID
        await openai.beta.assistants.update(assistantId, {
          file_ids: [...existingFileIds, file.id],
        });

        // Update local assistantDetails and save to assistant.json
        assistantDetails.file_ids = [...existingFileIds, file.id];
        await fsPromises.writeFile(
          assistantFilePath,
          JSON.stringify(assistantDetails, null, 2)
        );

        console.log("File uploaded and successfully added to assistant\n");
      }

      if (action === "1") {
        let continueAskingQuestion = true;

        while (continueAskingQuestion) {
          const userQuestion = await askQuestion("\nWhat is your question? ");

          // Pass in the user question into the existing thread
          await openai.beta.threads.messages.create(thread.id, {
            role: "user",
            content: userQuestion,
          });

          // Create a run
          const run = await openai.beta.threads.runs.create(thread.id, {
            assistant_id: assistantId,
          });

          // Imediately fetch run-status, which will be "in_progress"
          let runStatus = await openai.beta.threads.runs.retrieve(
            thread.id,
            run.id
          );

          // Polling mechanism to see if runStatus is completed
          while (runStatus.status !== "completed") {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            runStatus = await openai.beta.threads.runs.retrieve(
              thread.id,
              run.id
            );

            // Check for failed, cancelled, or expired status
            if (["failed", "cancelled", "expired"].includes(runStatus.status)) {
              console.log(
                `Run status is '${runStatus.status}'. Unable to complete the request.`
              );
              break; // Exit the loop if the status indicates a failure or cancellation
            }
          }

          // Get the last assistant message from the messages array
          const messages = await openai.beta.threads.messages.list(thread.id);

          // Find the last message for the current run
          const lastMessageForRun = messages.data
            .filter(
              (message) =>
                message.run_id === run.id && message.role === "assistant"
            )
            .pop();

          // If an assistant message is found, console.log() it
          if (lastMessageForRun) {
            console.log(`${lastMessageForRun.content[0].text.value} \n`);
          } else if (
            !["failed", "cancelled", "expired"].includes(runStatus.status)
          ) {
            console.log("No response received from the assistant.");
          }

          // Ask if the user wants to ask another question
          const continueAsking = await askQuestion(
            "Do you want to ask another question? (yes/no) "
          );
          continueAskingQuestion =
            continueAsking.toLowerCase() === "yes" ||
            continueAsking.toLowerCase() === "y";
        }
      }

      // Outside of action "1", ask if the user wants to continue with any action
      const continueOverall = await askQuestion(
        "Do you want to perform another action? (yes/no) "
      );
      keepAsking =
        continueOverall.toLowerCase() === "yes" ||
        continueOverall.toLowerCase() === "y";

      // If the keepAsking state is falsy show an ending message
      if (!keepAsking) {
        console.log("Alrighty then, see you next time!\n");
      }
    }
    // close the readline
    readline.close();
  } catch (error) {
    console.error(error);
  }
}

// Call the main function
main();
