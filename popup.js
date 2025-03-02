// 存储当前样式设置
let currentStyle = {
    backgroundColor: '#FFFFFF',
    fontFamily: 'SimSun',
    fontSize: 20,
    textColor: '#000000'
};

// DOM 元素
const quoteText = document.getElementById('quoteText');
const previewCanvas = document.getElementById('previewCanvas');
const exportBtn = document.getElementById('exportBtn');
const ctx = previewCanvas.getContext('2d');

// 初始化函数
async function init() {
    // 从 storage 加载上次的样式设置
    try {
        const saved = await chrome.storage.local.get('styleSettings');
        if (saved.styleSettings) {
            currentStyle = saved.styleSettings;
            applyCurrentStyle();
        }
    } catch (error) {
        console.error('加载样式设置失败:', error);
    }

    // 绑定事件监听器
    bindEventListeners();
    
    // 初始渲染预览
    renderPreview();
}

// 绑定事件监听器
function bindEventListeners() {
    // 文本输入事件
    quoteText.addEventListener('input', renderPreview);

    // 背景颜色选择
    document.querySelectorAll('#bgColorOptions .color-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentStyle.backgroundColor = btn.dataset.color;
            updateColorButtons(btn, 'bgColorOptions');
            renderPreview();
            saveStyle();
        });
    });

    // 字体选择
    document.getElementById('fontFamily').addEventListener('change', (e) => {
        currentStyle.fontFamily = e.target.value;
        renderPreview();
        saveStyle();
    });

    // 字号选择
    document.querySelectorAll('.size-options button').forEach(btn => {
        btn.addEventListener('click', () => {
            currentStyle.fontSize = parseInt(btn.dataset.size);
            updateSizeButtons(btn);
            renderPreview();
            saveStyle();
        });
    });

    // 文字颜色选择
    document.querySelectorAll('#textColorOptions .color-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentStyle.textColor = btn.dataset.color;
            updateColorButtons(btn, 'textColorOptions');
            renderPreview();
            saveStyle();
        });
    });

    // AI总结按钮点击事件
    document.getElementById('aiSummaryBtn').addEventListener('click', async () => {
        const text = quoteText.value.trim();
        if (!text) {
            alert('请先输入或粘贴要总结的文字');
            return;
        }
    
        const button = document.getElementById('aiSummaryBtn');
        const summaryText = document.getElementById('summaryText');
        button.disabled = true;
        button.textContent = '正在总结...';
        summaryText.value = '';
    
        try {
            // 检查服务器连接状态
            try {
                const serverCheck = await fetch('http://localhost:3000');
                if (!serverCheck.ok) {
                    throw new Error(`服务器连接失败: HTTP ${serverCheck.status}`);
                }
            } catch (error) {
                throw new Error('无法连接到服务器，请确保服务器已启动 (node server.js)');
            }

            // 发送POST请求进行总结
            const response = await fetch('http://localhost:3000/summarize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`服务器响应错误: ${response.status} - ${errorData.error || '未知错误'}`);
            }

            if (!response.body) {
                throw new Error('服务器返回的响应格式不正确');
            }

            const reader = new Response(response.body).body.getReader();
            const decoder = new TextDecoder();
            let summary = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const jsonData = JSON.parse(line.slice(6));
                            if (jsonData.choices && jsonData.choices[0] && jsonData.choices[0].delta && jsonData.choices[0].delta.content) {
                                summary += jsonData.choices[0].delta.content;
                                summaryText.value = summary;
                            }
                        } catch (e) {
                            console.warn('解析数据流出错:', e);
                        }
                    }
                }
            }
    
        } catch (error) {
            console.error('AI总结失败:', error);
            alert(`总结失败: ${error.message}\n请检查控制台以获取详细信息`);
        } finally {
            button.disabled = false;
            button.textContent = 'DeepSeek R1总结';
        }
    });

    // 导出按钮点击事件
    exportBtn.addEventListener('click', exportImage);
}

// 更新颜色按钮状态
function updateColorButtons(selectedBtn, groupId) {
    document.querySelectorAll(`#${groupId} .color-btn`).forEach(btn => {
        btn.classList.toggle('active', btn === selectedBtn);
    });
}

// 更新字号按钮状态
function updateSizeButtons(selectedBtn) {
    document.querySelectorAll('.size-options button').forEach(btn => {
        btn.classList.toggle('active', btn === selectedBtn);
    });
}

// 应用当前样式到界面
function applyCurrentStyle() {
    // 设置背景颜色
    const bgBtn = document.querySelector(`#bgColorOptions .color-btn[data-color="${currentStyle.backgroundColor}"]`);
    if (bgBtn) updateColorButtons(bgBtn, 'bgColorOptions');

    // 设置字体
    document.getElementById('fontFamily').value = currentStyle.fontFamily;

    // 设置字号
    const sizeBtn = document.querySelector(`.size-options button[data-size="${currentStyle.fontSize}"]`);
    if (sizeBtn) updateSizeButtons(sizeBtn);

    // 设置文字颜色
    const textColorBtn = document.querySelector(`#textColorOptions .color-btn[data-color="${currentStyle.textColor}"]`);
    if (textColorBtn) updateColorButtons(textColorBtn, 'textColorOptions');
}

// 保存样式设置到 storage
async function saveStyle() {
    try {
        await chrome.storage.local.set({ styleSettings: currentStyle });
    } catch (error) {
        console.error('保存样式设置失败:', error);
    }
}

// 渲染预览图片
function renderPreview() {
    const text = quoteText.value;
    const width = 800;
    const padding = 40;
    const lineHeight = currentStyle.fontSize * 1.5;

    // 计算文本换行和总高度
    ctx.font = `${currentStyle.fontSize}px ${currentStyle.fontFamily}`;
    const lines = getTextLines(text, width - padding * 2);
    const height = Math.max(400, padding * 2 + lines.length * lineHeight);

    // 设置画布尺寸
    previewCanvas.width = width;
    previewCanvas.height = height;

    // 绘制背景
    ctx.fillStyle = currentStyle.backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // 绘制文本
    ctx.fillStyle = currentStyle.textColor;
    ctx.font = `${currentStyle.fontSize}px ${currentStyle.fontFamily}`;
    ctx.textBaseline = 'top';

    lines.forEach((line, index) => {
        const y = padding + index * lineHeight;
        ctx.fillText(line, padding, y);
    });
}

// 计算文本换行
function getTextLines(text, maxWidth) {
    const lines = [];
    const words = text.split('');
    let currentLine = words[0] || '';

    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = ctx.measureText(currentLine + word).width;
        if (width < maxWidth) {
            currentLine += word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    lines.push(currentLine);
    return lines;
}

// 导出图片
async function exportImage() {
    try {
        const dataUrl = previewCanvas.toDataURL('image/png');
        const now = new Date();
        const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
        
        await chrome.downloads.download({
            url: dataUrl,
            filename: `quote_${timestamp}.png`,
            saveAs: false
        });
    } catch (error) {
        console.error('导出图片失败:', error);
        alert('导出图片失败，请重试');
    }
}

// 初始化
init();