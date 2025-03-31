const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const port = 3000;
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname))); // 정적 파일 제공
// 정적 파일 서비스
app.use(express.static(__dirname));


const dataFilePath = path.join(__dirname, "data.json");
const maxValues = [100, 200, 150, 180, 250, 120, 300, 500]; // 각 단과대 최대값

// 📌 JSON 파일에서 데이터 불러오기 (서버 시작 시 유지)
function loadData() {
    try {
        if (fs.existsSync(dataFilePath)) {
            const rawData = fs.readFileSync(dataFilePath);
            return JSON.parse(rawData);
        }
    } catch (err) {
        console.error("⚠ 데이터 로딩 실패:", err);
    }
    return [0, 0, 0, 0, 0, 0, 0, 0]; // 기본값
}

// 📌 JSON 파일에 데이터 저장
function saveData(data) {
    try {
        fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
        broadcastData(); // 데이터 변경 시 WebSocket으로 전송
    } catch (err) {
        console.error("⚠ 데이터 저장 실패:", err);
    }
}

let data = loadData(); // 서버 시작 시 데이터 로드

// 📌 WebSocket을 통한 데이터 변경 감지 및 전송
function broadcastData() {
    const percentageData = data.map((val, idx) => (val / maxValues[idx]) * 100);
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ data: percentageData }));
        }
    });
}

// 📌 데이터 반환 (퍼센트 변환)
app.get("/data", (req, res) => {
    const percentageData = data.map((val, idx) => (val / maxValues[idx]) * 100);
    res.json({ data: percentageData });
});

// 📌 단일 값 업데이트 (특정 단과대 값 변경)
app.post("/update-single", (req, res) => {
    const { index, newValue } = req.body;
    if (index >= 0 && index < 8 && newValue >= 0) {
        data[index] = newValue;
        saveData(data);
        res.json({ success: true, data });
    } else {
        res.status(400).json({ success: false, message: "잘못된 요청입니다." });
    }
});

// 📌 정적 페이지 라우팅
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});
app.get("/input", (req, res) => {
    res.sendFile(path.join(__dirname, "input.html"));
});

// 📌 WebSocket 서버 실행
server.listen(port, () => {
    console.log(`✅ Server running on http://localhost:${port}`);
});
