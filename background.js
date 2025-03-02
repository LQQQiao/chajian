// Service Worker 基本配置
chrome.runtime.onInstalled.addListener(() => {
    console.log('网页金句导出插件已安装');
});

// 初始化存储默认样式设置
chrome.runtime.onInstalled.addListener(async () => {
    try {
        const defaultStyle = {
            backgroundColor: '#FFFFFF',
            fontFamily: 'SimSun',
            fontSize: 20,
            textColor: '#000000'
        };

        await chrome.storage.local.set({ styleSettings: defaultStyle });
        console.log('默认样式设置已初始化');
    } catch (error) {
        console.error('初始化默认样式设置失败:', error);
    }
});