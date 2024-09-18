require('dotenv').config();
const { OpenAI } = require("openai");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

module.exports = function (io) {
    io.on("connection", (socket) => {
        console.log('A user connected:', socket.id);

        socket.on("ask-question", async ({ question, conversation }) => {
            try {
                const formattedConversation = conversation.map((msg) => ({
                    role: msg.role === "user" ? "user" : "assistant",
                    content: msg.content,
                }));

                formattedConversation.push({ role: "user", content: question });

                const response = await openai.chat.completions.create({
                    model: "gpt-3.5-turbo",
                    messages: formattedConversation,
                });

                socket.emit("ai-response", response.choices[0].message.content.trim());
            } catch (error) {
                console.error("Error while processing AI request:", error);
                socket.emit("ai-response", "Sorry, the AI could not process your request.");
            }
        });
    });
};
