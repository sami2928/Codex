const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const OpenAI = require("openai");
require("colors");
const { GoogleGenerativeAI } = require("@google/generative-ai");


dotenv.config({
  path: "./config/config.env",
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const genAI = new GoogleGenerativeAI(process.env.GEMNI_API_KEY);

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", async (req, res) => {
  res.status(200).send({
    message: "Hello from Codex!",
  });
});

app.post("/openai", async (req, res) => {
  try {
    const { prompt } = req.body.prompt;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      prompt: `${prompt}`,
      temperature: 0,
      maxTokens: 100,
      top_p: 1,
      frequency_penalty: 0.5,
      presence_penalty: 0,
    });

    res.status(200).send({
      response: response.data.choices[0].text,
    });
  } catch (error) {
    console.log("Error calling OpenAI API:", error);
    res.status(500).send({ error });
  }
});

app.post('/gemini', async (req, res) => {
  try {
      const prompt = req.body.prompt;

      // Initialize the Gemini model
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      const result = await model.generateContent(prompt);
      const responseText = result.response.text(); // Correctly extract the text from the response

      // Send the response text back to the client
      res.status(200).send({
        bot: responseText,
      });
  } catch (error) {
      console.error("Error calling Gemini API:", error);
      res.status(500).send({ error: "Failed to generate response." });
  }
});

app.listen(
  process.env.PORT,
  console.log(
    `Server running on port: http://localhost:${process.env.PORT}/`.red.underline
      .bold
  )
);
