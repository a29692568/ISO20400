/**
 * Netlify Functions - 勞動部資料代理
 * 解決靜態託管環境的CORS問題
 */

const https = require('https');
const http = require('http');

// 勞動部資料來源
const LABOR_DATA_SOURCES = {
    'a0101': 'https://announcement.mol.gov.tw/data/announcement_a0101.csv',
    'a0201': 'https://announcement.mol.gov.tw/data/announcement_a0201.csv', 
    'a0901': 'https://announcement.mol.gov.tw/data/announcement_a0901.csv'
};

/**
 * 發送 HTTPS 請求
 * @param {string} url 目標URL
 * @returns {Promise<string>} 回應內容
 */
function makeRequest(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https:') ? https : http;
        
        const request = client.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/csv,text/plain,*/*',
                'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            },
            timeout: 30000
        }, (response) => {
            let data = '';
            
            response.on('data', (chunk) => {
                data += chunk;
            });
            
            response.on('end', () => {
                if (response.statusCode >= 200 && response.statusCode < 300) {
                    resolve(data);
                } else {
                    reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                }
            });
        });
        
        request.on('error', (error) => {
            reject(error);
        });
        
        request.on('timeout', () => {
            request.destroy();
            reject(new Error('請求超時'));
        });
    });
}

/**
 * 勞動部資料代理端點
 */
exports.handler = async (event, context) => {
    // 設定 CORS 標頭
    const headers = {
        'Content-Type': 'text/csv; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=3600' // 快取1小時
    };
    
    // 處理 OPTIONS 預檢請求
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }
    
    try {
        // 從路徑中提取資料類型
        const path = event.path;
        const dataType = path.split('/').pop();
        
        if (!LABOR_DATA_SOURCES[dataType]) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: '不支援的資料類型' })
            };
        }
        
        const url = LABOR_DATA_SOURCES[dataType];
        console.log(`正在代理請求: ${url}`);
        
        const data = await makeRequest(url);
        
        console.log(`成功代理資料，大小: ${data.length} bytes`);
        
        return {
            statusCode: 200,
            headers,
            body: data
        };
        
    } catch (error) {
        console.error('代理請求失敗:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: '代理請求失敗', 
                message: error.message 
            })
        };
    }
}; 