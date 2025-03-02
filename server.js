const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// 检查配置文件是否存在
const configPath = path.join(__dirname, 'config.js');
if (!fs.existsSync(configPath)) {
    console.error('错误：配置文件不存在！');
    console.log('请复制 config.example.js 文件为 config.js，并设置你的API密钥。');
    process.exit(1);
}

// 导入配置
const { API_KEY, API_URL } = require('./config');

const app = express();
app.use(cors());
app.use(express.json());

// 添加健康检查端点
app.get('/', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

app.post('/summarize', async (req, res) => {
    try {
        const { text } = req.body;
        
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: 'deepseek-r1-250120',
                messages: [
                    {"role": "system", "content": "使用一个金句总结全文最核心的内容"},
                    {"role": "user", "content": text}
                ],
                temperature: 0.6,
                stream: true
            })
        });

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        // 设置响应头以支持流式输出
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // 使用原生流处理方式
        response.body.pipe(res);

        // 监听结束和错误事件
        response.body.on('end', () => {
            console.log('Stream ended');
            res.end();
        });

        response.body.on('error', (err) => {
            console.error('Stream error:', err);
            res.status(500).end();
        });


    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});