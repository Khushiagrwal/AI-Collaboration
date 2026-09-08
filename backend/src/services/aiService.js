const path = require("path");
const dotenv = require("dotenv");

dotenv.config({
  path: path.resolve(__dirname, "..", "..", ".env")
});

const { GoogleGenAI, Type } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function generateDiagram(prompt) {

  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",

    contents: `
      Convert the user's request into a diagram.

      User request:
      ${prompt}
    `,

    config: {
      responseMimeType: "application/json",

      responseSchema: {
        type: Type.OBJECT,

        properties: {
          nodes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: {
                  type: Type.STRING
                },
                type: {
                  type: Type.STRING
                },
                label: {
                  type: Type.STRING
                }
              },
              required: ["id", "type", "label"]
            }
          },

          edges: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                source: {
                  type: Type.STRING
                },
                target: {
                  type: Type.STRING
                }
              },
              required: ["source", "target"]
            }
          }
        },

        required: ["nodes", "edges"]
      }
    }
  });

  return JSON.parse(response.text);
}

module.exports = {
  generateDiagram
};

