/**
 * 違反勞動法令事業單位（雇主）查詢系統 - Netlify 版本
 * 整合勞動基準法、性別工作平等法、最低工資法裁處資料
 */

// 系統配置 - Netlify 版本
const SYSTEM_CONFIG = {
    // 資料來源配置 - 使用 Netlify Functions
    dataSources: {
        a0101: {
            name: '勞動基準法',
            url: '/api/labor-data/a0101',  // 相對路徑，會路由到 Netlify Functions
            lawType: '勞動基準法'
        },
        a0201: {
            name: '性別工作平等法',
            url: '/api/labor-data/a0201',
            lawType: '性別工作平等法'
        },
        a0901: {
            name: '最低工資法',
            url: '/api/labor-data/a0901',
            lawType: '最低工資法'
        }
    },
    
    // 分頁設定 - 預設值，可動態調整
    defaultPageSize: 50,
    
    // 預設查詢期間（最近一年）
    defaultDateRange: 365,
    
    // 效能優化設定
    performance: {
        enableVirtualScrolling: true,    // 啟用虛擬滾動
        virtualScrollItemHeight: 60,     // 每個項目高度（像素）
        visibleItems: 20,                // 同時顯示的項目數量
        debounceDelay: 300,              // 搜尋防抖延遲（毫秒）
        maxDisplayItems: 1000,           // 最大顯示項目數（防止記憶體過載）
        enableLazyLoading: true,         // 啟用懶載入
        chunkSize: 1000                  // 每次處理的資料塊大小
    }
};

// 全域變數
let allData = [];           // 所有載入的資料
let filteredData = [];      // 篩選後的資料
let currentPage = 1;        // 當前頁面
let authorities = new Set(); // 主管機關清單
let searchDebounceTimer = null; // 搜尋防抖計時器
let isProcessing = false;   // 處理狀態標記

// 初始化系統
document.addEventListener('DOMContentLoaded', function() {
    console.log('系統初始化開始 - Netlify 版本');
    initializeSystem();
});

/**
 * 初始化系統
 */
async function initializeSystem() {
    try {
        showLoading();
        
        // 設定預設日期範圍
        setDefaultDateRange();
        
        // 載入所有資料來源
        await loadAllDataSources();
        
        // 初始化主管機關選項
        initializeAuthorityOptions();
        
        // 執行預設查詢
        await performSearch();
        
        console.log('系統初始化完成');
    } catch (error) {
        console.error('系統初始化失敗:', error);
        alert('系統初始化失敗，請重新整理頁面');
    } finally {
        hideLoading();
    }
}

/**
 * 設定預設日期範圍（最近一年）
 */
function setDefaultDateRange() {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - SYSTEM_CONFIG.defaultDateRange);
    
    document.getElementById('startDate').value = formatDateForInput(startDate);
    document.getElementById('endDate').value = formatDateForInput(endDate);
    
    updateDateRangeDisplay();
}

/**
 * 更新日期範圍顯示
 */
function updateDateRangeDisplay() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === SYSTEM_CONFIG.defaultDateRange) {
            document.getElementById('dateRangeDisplay').textContent = '最近一年';
        } else {
            document.getElementById('dateRangeDisplay').textContent = 
                `${startDate} 至 ${endDate} (共${daysDiff}天)`;
        }
    }
}

/**
 * 切換日期範圍選擇器顯示
 */
function toggleDateRange() {
    const selector = document.getElementById('dateRangeSelector');
    const isVisible = selector.style.display !== 'none';
    
    if (isVisible) {
        selector.style.display = 'none';
        setDefaultDateRange();
    } else {
        selector.style.display = 'flex';
        updateDateRangeDisplay();
    }
}

/**
 * 載入所有資料來源
 */
async function loadAllDataSources() {
    console.log('開始載入資料來源');
    
    const loadPromises = Object.entries(SYSTEM_CONFIG.dataSources).map(async ([key, source]) => {
        try {
            console.log(`載入 ${source.name} 資料...`);
            updateLoadingMessage(`正在載入 ${source.name} 資料...`);
            const data = await loadCSVData(source.url, source.lawType);
            console.log(`${source.name} 載入完成，共 ${data.length} 筆資料`);
            return data;
        } catch (error) {
            console.error(`載入 ${source.name} 失敗:`, error);
            return [];
        }
    });
    
    const results = await Promise.all(loadPromises);
    
    // 分批處理大量資料
    updateLoadingMessage('正在處理資料...');
    allData = await processDataInChunks(results.flat());
    
    console.log(`所有資料載入完成，總計 ${allData.length} 筆資料`);
}

/**
 * 分批處理資料以避免阻塞UI
 * @param {Array} data 原始資料陣列
 * @returns {Array} 處理後的資料陣列
 */
async function processDataInChunks(data) {
    const chunkSize = SYSTEM_CONFIG.performance.chunkSize;
    const processedData = [];
    
    for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        
        // 讓出控制權給UI更新
        await new Promise(resolve => {
            setTimeout(() => {
                processedData.push(...chunk);
                updateLoadingProgress(i + chunk.length, data.length);
                resolve();
            }, 0);
        });
    }
    
    return processedData;
}

/**
 * 更新載入進度
 * @param {number} current 當前處理數量
 * @param {number} total 總數量
 */
function updateLoadingProgress(current, total) {
    const progress = Math.round((current / total) * 100);
    const loadingElement = document.getElementById('loadingMessage');
    const progressBar = document.querySelector('.progress-bar');
    
    if (loadingElement) {
        loadingElement.textContent = `正在處理資料... ${current}/${total} (${progress}%)`;
    }
    
    if (progressBar) {
        progressBar.style.width = `${progress}%`;
    }
}

/**
 * 更新載入訊息
 * @param {string} message 載入訊息
 */
function updateLoadingMessage(message) {
    const loadingElement = document.getElementById('loadingMessage');
    if (loadingElement) {
        loadingElement.textContent = message;
    }
}

/**
 * 載入CSV資料
 * @param {string} url 資料來源URL
 * @param {string} lawType 法規類型
 * @returns {Promise<Array>} 解析後的資料陣列
 */
async function loadCSVData(url, lawType) {
    try {
        console.log(`開始載入 ${lawType} 資料: ${url}`);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'text/csv,text/plain,*/*',
                'Cache-Control': 'no-cache'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const csvText = await response.text();
        console.log(`${lawType} 原始資料大小: ${csvText.length} 字元`);
        
        return parseCSVData(csvText, lawType);
        
    } catch (error) {
        console.error(`載入 ${lawType} 資料失敗:`, error);
        throw error;
    }
}

/**
 * 解析CSV資料
 * @param {string} csvText CSV文字內容
 * @param {string} lawType 法規類型
 * @returns {Array} 解析後的資料陣列
 */
function parseCSVData(csvText, lawType) {
    const lines = csvText.split('\n');
    const headers = parseCSVLine(lines[0]);
    const data = [];
    
    console.log(`${lawType} 欄位標題:`, headers);
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        try {
            const values = parseCSVLine(line);
            if (values.length >= headers.length) {
                const item = {
                    lawType: lawType  // 添加法規類型標識
                };
                
                headers.forEach((header, index) => {
                    item[header] = values[index] || '';
                });
                
                // 標準化日期格式
                if (item['裁處日期']) {
                    item['裁處日期'] = standardizeDate(item['裁處日期']);
                }
                
                data.push(item);
            }
        } catch (error) {
            console.warn(`解析第 ${i + 1} 行失敗:`, error, line);
        }
    }
    
    console.log(`${lawType} 解析完成，共 ${data.length} 筆資料`);
    return data;
}

/**
 * 解析CSV單行資料（處理引號和逗號）
 * @param {string} line CSV行
 * @returns {Array} 解析後的欄位陣列
 */
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    let i = 0;
    
    while (i < line.length) {
        const char = line[i];
        
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                // 處理轉義引號
                current += '"';
                i += 2;
            } else {
                // 切換引號狀態
                inQuotes = !inQuotes;
                i++;
            }
        } else if (char === ',' && !inQuotes) {
            // 欄位分隔符
            result.push(current.trim());
            current = '';
            i++;
        } else {
            current += char;
            i++;
        }
    }
    
    // 添加最後一個欄位
    result.push(current.trim());
    
    return result;
}

/**
 * 標準化日期格式
 * @param {string} dateStr 日期字串
 * @returns {string} 標準化日期
 */
function standardizeDate(dateStr) {
    if (!dateStr) return '';
    
    // 移除多餘空格
    dateStr = dateStr.trim();
    
    // 處理常見的日期格式
    const patterns = [
        /(\d{4})\/(\d{1,2})\/(\d{1,2})/,  // 2024/1/1
        /(\d{4})-(\d{1,2})-(\d{1,2})/,    // 2024-1-1
        /(\d{4})\.(\d{1,2})\.(\d{1,2})/,  // 2024.1.1
        /(\d{1,2})\/(\d{1,2})\/(\d{4})/,  // 1/1/2024
    ];
    
    for (const pattern of patterns) {
        const match = dateStr.match(pattern);
        if (match) {
            let year, month, day;
            
            if (match[1].length === 4) {
                // 年份在前
                year = match[1];
                month = match[2].padStart(2, '0');
                day = match[3].padStart(2, '0');
            } else {
                // 年份在後
                year = match[3];
                month = match[1].padStart(2, '0');
                day = match[2].padStart(2, '0');
            }
            
            return `${year}-${month}-${day}`;
        }
    }
    
    return dateStr; // 如果無法解析，返回原始字串
}

/**
 * 格式化日期為輸入框格式
 * @param {Date} date 日期物件
 * @returns {string} YYYY-MM-DD 格式
 */
function formatDateForInput(date) {
    return date.toISOString().split('T')[0];
}

/**
 * 初始化主管機關選項
 */
function initializeAuthorityOptions() {
    // 收集所有主管機關
    authorities.clear();
    allData.forEach(item => {
        if (item['主管機關']) {
            authorities.add(item['主管機關']);
        }
    });
    
    // 更新選項
    const authoritySelect = document.getElementById('authorityFilter');
    authoritySelect.innerHTML = '<option value="">全部主管機關</option>';
    
    Array.from(authorities).sort().forEach(authority => {
        const option = document.createElement('option');
        option.value = authority;
        option.textContent = authority;
        authoritySelect.appendChild(option);
    });
    
    console.log(`主管機關選項初始化完成，共 ${authorities.size} 個選項`);
}

/**
 * 執行搜尋
 */
async function performSearch() {
    if (isProcessing) {
        console.log('搜尋進行中，忽略重複請求');
        return;
    }
    
    isProcessing = true;
    
    try {
        showLoading();
        updateLoadingMessage('正在搜尋資料...');
        
        const query = getQueryConditions();
        console.log('搜尋條件:', query);
        
        // 非同步篩選資料
        filteredData = await applyFiltersAsync(allData, query);
        
        console.log(`搜尋完成，符合條件: ${filteredData.length} 筆`);
        
        // 重置分頁
        currentPage = 1;
        
        // 更新顯示
        updateResultDisplay();
        
    } catch (error) {
        console.error('搜尋失敗:', error);
        alert('搜尋失敗，請重試');
    } finally {
        isProcessing = false;
        hideLoading();
    }
}

/**
 * 非同步篩選資料
 * @param {Array} data 原始資料
 * @param {Object} query 查詢條件
 * @returns {Promise<Array>} 篩選後的資料
 */
async function applyFiltersAsync(data, query) {
    return new Promise(resolve => {
        setTimeout(() => {
            const result = applyFilters(data, query);
            resolve(result);
        }, 0);
    });
}

/**
 * 取得查詢條件
 * @returns {Object} 查詢條件物件
 */
function getQueryConditions() {
    return {
        companyName: document.getElementById('companyName').value.trim(),
        startDate: document.getElementById('startDate').value,
        endDate: document.getElementById('endDate').value,
        authority: document.getElementById('authorityFilter').value,
        lawType: document.getElementById('lawTypeFilter').value
    };
}

/**
 * 篩選資料
 * @param {Array} data 原始資料
 * @param {Object} query 查詢條件
 * @returns {Array} 篩選後的資料
 */
function applyFilters(data, query) {
    return data.filter(item => {
        // 事業單位名稱篩選（模糊搜尋）
        if (query.companyName) {
            const companyName = item['事業單位名稱'] || '';
            if (!companyName.toLowerCase().includes(query.companyName.toLowerCase())) {
                return false;
            }
        }
        
        // 日期範圍篩選
        if (query.startDate || query.endDate) {
            const itemDate = item['裁處日期'] || '';
            if (itemDate) {
                if (query.startDate && itemDate < query.startDate) return false;
                if (query.endDate && itemDate > query.endDate) return false;
            }
        }
        
        // 主管機關篩選
        if (query.authority) {
            if (item['主管機關'] !== query.authority) {
                return false;
            }
        }
        
        // 法規類型篩選
        if (query.lawType) {
            if (item.lawType !== query.lawType) {
                return false;
            }
        }
        
        return true;
    });
}

/**
 * 更新結果顯示
 */
function updateResultDisplay() {
    const resultCount = document.getElementById('resultCount');
    const resultTable = document.getElementById('resultTable');
    const paginationContainer = document.getElementById('paginationContainer');
    
    if (filteredData.length === 0) {
        showNoResult();
        return;
    }
    
    // 更新結果數量
    resultCount.textContent = `查詢結果：共 ${filteredData.length} 筆資料`;
    
    // 更新表格
    updateResultTable();
    
    // 更新分頁
    updatePagination();
    
    // 顯示結果區域
    document.getElementById('searchResults').style.display = 'block';
}

/**
 * 顯示無結果訊息
 */
function showNoResult() {
    const resultCount = document.getElementById('resultCount');
    const resultTable = document.getElementById('resultTable');
    const paginationContainer = document.getElementById('paginationContainer');
    
    resultCount.textContent = '查詢結果：無符合條件的資料';
    resultTable.innerHTML = '<tr><td colspan="7" class="no-result">無符合條件的資料</td></tr>';
    paginationContainer.innerHTML = '';
    
    document.getElementById('searchResults').style.display = 'block';
}

/**
 * 取得當前頁面大小
 * @returns {number} 頁面大小
 */
function getCurrentPageSize() {
    return parseInt(document.getElementById('pageSize').value) || SYSTEM_CONFIG.defaultPageSize;
}

/**
 * 更新結果表格
 */
function updateResultTable() {
    const resultTable = document.getElementById('resultTable');
    const pageSize = getCurrentPageSize();
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pageData = filteredData.slice(startIndex, endIndex);
    
    resultTable.innerHTML = '';
    
    pageData.forEach((item, index) => {
        const row = createTableRow(item, startIndex + index + 1);
        resultTable.appendChild(row);
    });
}

/**
 * 建立表格行
 * @param {Object} item 資料項目
 * @param {number} index 索引
 * @returns {HTMLElement} 表格行元素
 */
function createTableRow(item, index) {
    const row = document.createElement('tr');
    
    row.innerHTML = `
        <td>${index}</td>
        <td>${item['事業單位名稱'] || ''}</td>
        <td>${item['裁處日期'] || ''}</td>
        <td>${item['主管機關'] || ''}</td>
        <td>${item.lawType || ''}</td>
        <td>${item['違反法規'] || ''}</td>
        <td>${formatAmount(item['罰鍰金額']) || ''}</td>
    `;
    
    return row;
}

/**
 * 更新分頁
 */
function updatePagination() {
    const paginationContainer = document.getElementById('paginationContainer');
    const pageSize = getCurrentPageSize();
    const totalPages = Math.ceil(filteredData.length / pageSize);
    
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }
    
    let paginationHTML = '<div class="pagination">';
    
    // 最前頁按鈕
    if (currentPage > 1) {
        paginationHTML += '<button onclick="changePage(1)" class="page-btn">最前頁</button>';
    }
    
    // 上一頁按鈕
    if (currentPage > 1) {
        paginationHTML += `<button onclick="changePage(${currentPage - 1})" class="page-btn">上一頁</button>`;
    }
    
    // 頁碼按鈕
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        if (i === currentPage) {
            paginationHTML += `<span class="page-btn current">${i}</span>`;
        } else {
            paginationHTML += `<button onclick="changePage(${i})" class="page-btn">${i}</button>`;
        }
    }
    
    // 下一頁按鈕
    if (currentPage < totalPages) {
        paginationHTML += `<button onclick="changePage(${currentPage + 1})" class="page-btn">下一頁</button>`;
    }
    
    // 最末頁按鈕
    if (currentPage < totalPages) {
        paginationHTML += `<button onclick="changePage(${totalPages})" class="page-btn">最末頁</button>`;
    }
    
    // 分頁資訊
    const startIndex = (currentPage - 1) * pageSize + 1;
    const endIndex = Math.min(currentPage * pageSize, filteredData.length);
    
    paginationHTML += `
        </div>
        <div class="pagination-info">
            顯示第 ${startIndex}-${endIndex} 筆，共 ${filteredData.length} 筆資料
        </div>
    `;
    
    paginationContainer.innerHTML = paginationHTML;
}

/**
 * 切換頁面
 * @param {number} page 目標頁面
 */
function changePage(page) {
    currentPage = page;
    updateResultTable();
    updatePagination();
    
    // 滾動到結果區域頂部
    document.getElementById('searchResults').scrollIntoView({ 
        behavior: 'smooth' 
    });
}

/**
 * 重置查詢
 */
function resetQuery() {
    document.getElementById('companyName').value = '';
    setDefaultDateRange();
    document.getElementById('authorityFilter').value = '';
    document.getElementById('lawTypeFilter').value = '';
    
    // 清除防抖計時器
    if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = null;
    }
    
    // 執行搜尋
    performSearch();
}

/**
 * 格式化金額
 * @param {string} amount 金額字串
 * @returns {string} 格式化後的金額
 */
function formatAmount(amount) {
    if (!amount) return '';
    
    // 移除非數字字元
    const numStr = amount.toString().replace(/[^\d]/g, '');
    
    if (numStr) {
        const num = parseInt(numStr);
        return num.toLocaleString('zh-TW');
    }
    
    return amount;
}

/**
 * 匯出CSV
 */
function exportToCSV() {
    if (filteredData.length === 0) {
        alert('沒有資料可匯出');
        return;
    }
    
    const headers = ['序號', '事業單位名稱', '裁處日期', '主管機關', '法規類型', '違反法規', '罰鍰金額'];
    const csvContent = [
        headers.join(','),
        ...filteredData.map((item, index) => [
            index + 1,
            `"${item['事業單位名稱'] || ''}"`,
            item['裁處日期'] || '',
            `"${item['主管機關'] || ''}"`,
            `"${item.lawType || ''}"`,
            `"${item['違反法規'] || ''}"`,
            item['罰鍰金額'] || ''
        ].join(','))
    ].join('\n');
    
    const filename = `勞動法令違規資料_${new Date().toISOString().split('T')[0]}.csv`;
    downloadFile(csvContent, filename, 'text/csv; charset=utf-8');
}

/**
 * 匯出Excel
 */
function exportToExcel() {
    if (filteredData.length === 0) {
        alert('沒有資料可匯出');
        return;
    }
    
    // 建立HTML表格格式
    const headers = ['序號', '事業單位名稱', '裁處日期', '主管機關', '法規類型', '違反法規', '罰鍰金額'];
    const rows = filteredData.map((item, index) => [
        index + 1,
        item['事業單位名稱'] || '',
        item['裁處日期'] || '',
        item['主管機關'] || '',
        item.lawType || '',
        item['違反法規'] || '',
        item['罰鍰金額'] || ''
    ]);
    
    const htmlContent = `
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                table { border-collapse: collapse; width: 100%; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
            </style>
        </head>
        <body>
            <table>
                <thead>
                    <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
                </thead>
                <tbody>
                    ${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
                </tbody>
            </table>
        </body>
        </html>
    `;
    
    const filename = `勞動法令違規資料_${new Date().toISOString().split('T')[0]}.xls`;
    downloadFile(htmlContent, filename, 'application/vnd.ms-excel');
}

/**
 * 下載檔案
 * @param {string} content 檔案內容
 * @param {string} filename 檔案名稱
 * @param {string} mimeType MIME類型
 */
function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
}

/**
 * 顯示載入中
 */
function showLoading() {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.style.display = 'flex';
    }
}

/**
 * 隱藏載入中
 */
function hideLoading() {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.style.display = 'none';
    }
}

/**
 * 處理頁面大小變更
 */
function handlePageSizeChange() {
    currentPage = 1; // 重置到第一頁
    updateResultTable();
    updatePagination();
}

// 搜尋防抖處理
document.getElementById('companyName').addEventListener('input', function() {
    if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer);
    }
    
    searchDebounceTimer = setTimeout(() => {
        performSearch();
    }, SYSTEM_CONFIG.performance.debounceDelay);
});

// 其他篩選條件變更時立即搜尋
document.getElementById('startDate').addEventListener('change', performSearch);
document.getElementById('endDate').addEventListener('change', performSearch);
document.getElementById('authorityFilter').addEventListener('change', performSearch);
document.getElementById('lawTypeFilter').addEventListener('change', performSearch);
document.getElementById('pageSize').addEventListener('change', handlePageSizeChange); 