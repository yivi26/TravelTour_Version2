import express from "express";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        message: "Thiếu message",
      });
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(500).json({
        message: "Chưa có OPENROUTER_API_KEY trong file .env",
      });
    }

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        },
        body: JSON.stringify({
          model: "openrouter/free",
          messages: [
            {
              role: "system",
              content:
                "Bạn là chatbot tư vấn du lịch cho website TravelTour. Trả lời ngắn gọn, thân thiện, bằng tiếng Việt.",
            },
            {
              role: "user",
              content: message,
            },
          ],
        }),
      },
    );

    const data = await response.json();

    console.log("OPENROUTER STATUS:", response.status);
    console.log("OPENROUTER DATA:", JSON.stringify(data, null, 2));

    if (!response.ok) {
      return res.status(response.status).json({
        message: "Lỗi gọi OpenRouter",
        error: data,
      });
    }

    return res.json({
      reply: data?.choices?.[0]?.message?.content || "Bot chưa có phản hồi",
    });
  } catch (error) {
    console.error("Chatbot route error:", error);

    return res.status(500).json({
      message: "Lỗi chatbot server",
      error: error.message,
    });
  }
});

export default router;
