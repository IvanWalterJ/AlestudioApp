import * as fs from "fs";
import * as dotenv from "dotenv";
dotenv.config();

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY || "";
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();
        let txt = "=== MODELS ===\n";
        if (data.models) {
            for (const m of data.models) {
                txt += `${m.name} | ${m.displayName} | ${m.supportedGenerationMethods.join(",")}\n`;
            }
        } else {
            txt += "No models found or error in data: " + JSON.stringify(data);
        }
        fs.writeFileSync("tmp/models_raw.txt", txt);
    } catch (error) {
        fs.writeFileSync("tmp/models_raw.txt", "ERROR: " + error.message + "\n" + error.stack);
    }
}

listModels();
