import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI("AIzaSyAqAmza2wMdAbxzKRX5quoQkDO--IBvYdE");
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

async function test() {
    try {
        const chat = model.startChat();
        const result = await chat.sendMessage("Make an image or video for me");
        console.log("RESPONSE TEXT:", result.response.text());
        console.log("FUNCTION CALLS:", result.response.functionCalls());
    } catch(err) {
        console.error("ERROR HAPPENED:", err);
    }
}
test();
