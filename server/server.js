import express from "express";
import * as dotenv from "dotenv";
import cors from "cors";
import OpenAI from "openai";
import "colors";

dotenv.config({
  path: "./config/config.env",
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", async (req, res) => {
  res.status(200).send({
    message: "Hello from Codex!",
  });
});

app.post("/", async (req, res) => {
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
    console.log(error);
    res.status(500).send({ error });
  }
});

app.listen(
  process.env.PORT,
  console.log(
    `Server running on port: http://localhost:${process.env.PORT}/`.red.underline
      .bold
  )
);
