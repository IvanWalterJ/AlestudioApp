import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";
dotenv.config();

async function listModels() {
    const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY || "");
    try {
        const models = await genAI.listModels();
        console.log("=== AVAILABLE MODELS ===");
        for (const model of models.models) {
            console.log(`- ID: ${model.name}`);
            console.log(`  DisplayName: ${model.displayName}`);
            console.log(`  SupportedMethods: ${model.supportedGenerationMethods.join(", ")}`);
            console.log(`  -------------------`);
        }
    } catch (error) {
        console.error("Error listing models:", error);
    }
}

listModels();
