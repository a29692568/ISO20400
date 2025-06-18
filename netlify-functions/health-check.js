/**
 * Netlify Functions - 健康檢查端點
 */

exports.handler = async (event, context) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    };
    
    // 處理 OPTIONS 預檢請求
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }
    
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            status: 'ok',
            message: '勞動部資料代理服務運行正常',
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development'
        })
    };
}; 