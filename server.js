import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// Simple local test level
app.post("/generate-level", (req, res) => {
    const levelData = {
        platforms: [
            { x: 0, y: 550, width: 1000 },
            { x: 150, y: 450, width: 150 },
            { x: 400, y: 350, width: 150 },
            { x: 600, y: 450, width: 150 },
            { x: 800, y: 300, width: 150 }
        ],
        coins: [
            { x: 200, y: 500 },
            { x: 450, y: 300 },
            { x: 650, y: 400 },
            { x: 850, y: 250 },
            { x: 50, y: 500 }
        ],
        enemies: [
            { x: 300, y: 530, dx: 2 },
            { x: 500, y: 330, dx: 1.5 },
            { x: 750, y: 430, dx: 2.5 }
        ]
    };

    res.json({ choices: [{ message: { content: JSON.stringify(levelData) } }] });
});

app.listen(3000, () => console.log("Backend running on port 3000"));
