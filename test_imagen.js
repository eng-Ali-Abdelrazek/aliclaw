import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI("AIzaSyAqAmza2wMdAbxzKRX5quoQkDO--IBvYdE");

async function test() {
    try {
        const model = genAI.getGenerativeModel({ model: 'imagen-4.0-generate-001' });
        const result = await model.generateContent("A cute fluffy 3d cat");
        console.log("SUCCESS!", result);
    } catch(err) {
        console.error("ERROR HAPPENED:", err);
    }
}
test();
