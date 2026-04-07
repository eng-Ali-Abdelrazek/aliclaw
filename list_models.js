import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI("AIzaSyAqAmza2wMdAbxzKRX5quoQkDO--IBvYdE");

async function listModels() {
    try {
        // Unfortunately standard JS SDK doesn't expose listModels natively
        const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyAqAmza2wMdAbxzKRX5quoQkDO--IBvYdE");
        const data = await res.json();
        console.log("AVAILABLE MODELS:");
        data.models.forEach((m) => {
             console.log(m.name, " - ", m.supportedGenerationMethods.join(", "));
        });
    } catch(err) {
        console.error(err);
    }
}
listModels();
