const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const port = process.env.PORT || 3000;
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// 👉 public 폴더를 정적 파일로 제공
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));  // ✅ 핵심 수정

const dataFilePath = path.join(__dirname, "data.json");
const maxValues =  [1265, 660, 1466, 1265, 779, 1803, 791, 406]; // 각 단과대 최대값

function loadData() {
    try {
        if (fs.existsSync(dataFilePath)) {
            const rawData = fs.readFileSync(dataFilePath);
            return JSON.parse(rawData);
        }
    } catch (err) {
        console.error("⚠ 데이터 로딩 실패:", err);
    }
    return Array(maxValues.length).fill(0);
}

function saveData(data) {
    try {
        fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
        broadcastData();
    } catch (err) {
        console.error("⚠ 데이터 저장 실패:", err);
    }
}

let data = loadData();

function broadcastData() {
    const percentageData = data.map((val, idx) => (val / maxValues[idx]) * 100);
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ data: percentageData }));
        }
    });
}

app.get("/data", (req, res) => {
    const percentageData = data.map((val, idx) => (val / maxValues[idx]) * 100);
    res.json({ data: percentageData });
});

app.post("/update-single", (req, res) => {
    const { index, newValue } = req.body;
    if (index >= 0 && index < maxValues.length && newValue >= 0) {
        data[index] = newValue;
        saveData(data);
        res.json({ success: true, data });
    } else {
        res.status(400).json({ success: false, message: "잘못된 요청입니다." });
    }
});

// ✅ 수정: public 폴더 기준으로 HTML 파일 라우팅
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});
app.get("/input", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "input.html"));
});

// 서버 실행
server.listen(port, () => {
    console.log(`✅ Server running on port ${port}`);
});
