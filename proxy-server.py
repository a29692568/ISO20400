#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
勞動部資料代理伺服器
解決CORS問題，代理勞動部CSV資料
"""

import requests
from flask import Flask, request, Response
from flask_cors import CORS
import logging

# 設定日誌
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # 允許跨域請求

# 勞動部資料來源
LABOR_DATA_SOURCES = {
    'a0101': 'https://announcement.mol.gov.tw/data/announcement_a0101.csv',
    'a0201': 'https://announcement.mol.gov.tw/data/announcement_a0201.csv', 
    'a0901': 'https://announcement.mol.gov.tw/data/announcement_a0901.csv'
}

@app.route('/api/labor-data/<data_type>')
def get_labor_data(data_type):
    """
    代理勞動部資料
    :param data_type: 資料類型 (a0101, a0201, a0901)
    :return: CSV資料
    """
    try:
        if data_type not in LABOR_DATA_SOURCES:
            return {'error': '不支援的資料類型'}, 400
        
        url = LABOR_DATA_SOURCES[data_type]
        logger.info(f'正在代理請求: {url}')
        
        # 設定請求標頭，模擬瀏覽器請求
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/csv,text/plain,*/*',
            'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        }
        
        # 發送請求
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        
        # 設定回應標頭
        response_headers = {
            'Content-Type': 'text/csv; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
        
        logger.info(f'成功代理資料，大小: {len(response.content)} bytes')
        return Response(response.content, headers=response_headers)
        
    except requests.exceptions.RequestException as e:
        logger.error(f'代理請求失敗: {e}')
        return {'error': f'代理請求失敗: {str(e)}'}, 500
    except Exception as e:
        logger.error(f'未知錯誤: {e}')
        return {'error': f'未知錯誤: {str(e)}'}, 500

@app.route('/api/health')
def health_check():
    """健康檢查端點"""
    return {'status': 'ok', 'message': '代理伺服器運行正常'}

@app.route('/')
def index():
    """首頁"""
    return '''
    <h1>勞動部資料代理伺服器</h1>
    <p>可用的資料端點：</p>
    <ul>
        <li><a href="/api/labor-data/a0101">勞動基準法資料</a></li>
        <li><a href="/api/labor-data/a0201">性別工作平等法資料</a></li>
        <li><a href="/api/labor-data/a0901">最低工資法資料</a></li>
    </ul>
    <p>健康檢查：<a href="/api/health">/api/health</a></p>
    '''

if __name__ == '__main__':
    print('啟動勞動部資料代理伺服器...')
    print('可用的資料端點：')
    print('  - 勞動基準法: http://localhost:5001/api/labor-data/a0101')
    print('  - 性別工作平等法: http://localhost:5001/api/labor-data/a0201')
    print('  - 最低工資法: http://localhost:5001/api/labor-data/a0901')
    print('健康檢查: http://localhost:5001/api/health')
    print('按 Ctrl+C 停止伺服器')
    
    app.run(host='127.0.0.1', port=5001, debug=False) 