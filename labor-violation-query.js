/**
 * 違反勞動法令事業單位（雇主）查詢系統
 * 整合勞動基準法、性別工作平等法、最低工資法裁處資料
 */

// 系統配置
const SYSTEM_CONFIG = {
    // 資料來源配置 - 使用本地代理伺服器
    dataSources: {
        a0101: {
            name: '勞動基準法',
            url: 'http://127.0.0.1:5001/api/labor-data/a0101',
            lawType: '勞動基準法'
        },
        a0201: {
            name: '性別工作平等法',
            url: 'http://127.0.0.1:5001/api/labor-data/a0201',
            lawType: '性別工作平等法'
        },
        a0901: {
            name: '最低工資法',
            url: 'http://127.0.0.1:5001/api/labor-data/a0901',
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
    console.log('系統初始化開始');
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
        loadingElement.textContent = `正在處理資料... ${progress}% (${current.toLocaleString()}/${total.toLocaleString()})`;
    }
    
    if (progressBar) {
        progressBar.style.width = `${progress}%`;
        progressBar.setAttribute('aria-valuenow', progress);
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
 * @param {string} url CSV檔案URL
 * @param {string} lawType 法規類型
 * @returns {Array} 解析後的資料陣列
 */
async function loadCSVData(url, lawType) {
    const maxRetries = 3;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            console.log(`嘗試載入 ${lawType} (第${attempt + 1}次嘗試): ${url}`);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'text/csv,text/plain,*/*'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const csvText = await response.text();
            console.log(`${lawType} 載入成功，資料長度: ${csvText.length} 字符`);
            return parseCSVData(csvText, lawType);
            
        } catch (error) {
            console.warn(`${lawType} 載入失敗 (嘗試${attempt + 1}):`, error.message);
            
            // 如果不是最後一次嘗試，等待一下再重試
            if (attempt < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }
    
    throw new Error(`載入 ${lawType} 失敗，已嘗試 ${maxRetries} 次`);
}

/**
 * 解析CSV資料
 * @param {string} csvText CSV文字內容
 * @param {string} lawType 法規類型
 * @returns {Array} 解析後的資料陣列
 */
function parseCSVData(csvText, lawType) {
    // 先將整個CSV文字按行分割
    const rawLines = csvText.split('\n');
    const lines = [];
    let currentLine = '';
    let inQuotes = false;
    
    // 處理跨行的欄位
    for (let i = 0; i < rawLines.length; i++) {
        const line = rawLines[i];
        
        if (!inQuotes) {
            // 檢查這行是否包含未配對的引號
            const quoteCount = (line.match(/"/g) || []).length;
            if (quoteCount % 2 === 1) {
                // 有未配對的引號，需要合併下一行
                currentLine = line;
                inQuotes = true;
                continue;
            } else {
                // 正常行，直接加入
                lines.push(line);
            }
        } else {
            // 在引號內，合併行
            currentLine += '\n' + line;
            
            // 檢查引號是否配對
            const quoteCount = (currentLine.match(/"/g) || []).length;
            if (quoteCount % 2 === 0) {
                // 引號配對了，加入完整行
                lines.push(currentLine);
                currentLine = '';
                inQuotes = false;
            }
        }
    }
    
    // 過濾空行
    const validLines = lines.filter(line => line.trim());
    if (validLines.length === 0) return [];
    
    // 解析標題行
    const headers = parseCSVLine(validLines[0]).map(h => h.trim().replace(/"/g, ''));
    
    // 解析資料行
    return validLines.slice(1).map((line, index) => {
        const values = parseCSVLine(line);
        const record = {
            id: index + 1,
            lawType: lawType
        };
        
        headers.forEach((header, i) => {
            record[header] = values[i] || '';
        });
        
        // 標準化日期格式
        if (record['處分日期']) {
            record['處分日期'] = standardizeDate(record['處分日期']);
        }
        
        return record;
    });
}

/**
 * 解析CSV行（處理包含逗號、換行符和引號的欄位）
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
            if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
                // 處理雙引號轉義
                current += '"';
                i += 2;
                continue;
            }
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
        
        i++;
    }
    
    // 加入最後一個欄位
    result.push(current.trim());
    
    // 清理欄位內容（移除多餘的引號和空白）
    return result.map(field => {
        // 移除開頭和結尾的引號
        field = field.replace(/^"|"$/g, '');
        // 清理多餘的空白
        field = field.trim();
        return field;
    });
}

/**
 * 標準化日期格式
 * @param {string} dateStr 日期字串
 * @returns {string} 標準化後的日期字串 (YYYY-MM-DD)
 */
function standardizeDate(dateStr) {
    if (!dateStr) return '';
    
    // 處理 YYYYMMDD 格式
    if (/^\d{8}$/.test(dateStr)) {
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const day = dateStr.substring(6, 8);
        return `${year}-${month}-${day}`;
    }
    
    // 處理其他格式，嘗試轉換
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
        return formatDateForInput(date);
    }
    
    return dateStr;
}

/**
 * 格式化日期為輸入框格式
 * @param {Date} date 日期物件
 * @returns {string} YYYY-MM-DD 格式
 */
function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * 初始化主管機關選項
 */
function initializeAuthorityOptions() {
    // 收集所有主管機關
    allData.forEach(record => {
        if (record['主管機關']) {
            authorities.add(record['主管機關']);
        }
    });
    
    // 更新選項
    const authoritySelect = document.getElementById('authority');
    const currentValue = authoritySelect.value;
    
    authoritySelect.innerHTML = '<option value="">全部機關</option>';
    Array.from(authorities).sort().forEach(authority => {
        const option = document.createElement('option');
        option.value = authority;
        option.textContent = authority;
        authoritySelect.appendChild(option);
    });
    
    authoritySelect.value = currentValue;
}

/**
 * 執行搜尋（防抖版本）
 */
async function performSearch() {
    // 清除之前的防抖計時器
    if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer);
    }
    
    // 設定新的防抖計時器
    searchDebounceTimer = setTimeout(async () => {
        if (isProcessing) {
            console.log('搜尋處理中，跳過此次請求');
            return;
        }
        
        isProcessing = true;
        showLoading();
        
        try {
            console.log('開始執行搜尋...');
            const query = getQueryConditions();
            
            // 分批處理篩選
            filteredData = await applyFiltersAsync(allData, query);
            
            currentPage = 1;
            updateResultDisplay();
            
            console.log(`搜尋完成，符合條件: ${filteredData.length} 筆`);
        } catch (error) {
            console.error('搜尋執行失敗:', error);
            alert('搜尋執行失敗，請重試');
        } finally {
            isProcessing = false;
            hideLoading();
        }
    }, SYSTEM_CONFIG.performance.debounceDelay);
}

/**
 * 非同步篩選資料（分批處理）
 * @param {Array} data 原始資料
 * @param {Object} query 查詢條件
 * @returns {Array} 篩選後的資料
 */
async function applyFiltersAsync(data, query) {
    const chunkSize = SYSTEM_CONFIG.performance.chunkSize;
    const filteredResults = [];
    
    for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        const filteredChunk = applyFilters(chunk, query);
        filteredResults.push(...filteredChunk);
        
        // 讓出控制權給UI更新
        await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    return filteredResults;
}

/**
 * 取得查詢條件
 * @returns {Object} 查詢條件物件
 */
function getQueryConditions() {
    return {
        startDate: document.getElementById('startDate').value,
        endDate: document.getElementById('endDate').value,
        companyName: document.getElementById('companyName').value.trim(),
        authority: document.getElementById('authority').value,
        lawType: document.getElementById('lawType').value
    };
}

/**
 * 套用篩選條件
 * @param {Array} data 原始資料
 * @param {Object} query 查詢條件
 * @returns {Array} 篩選後的資料
 */
function applyFilters(data, query) {
    return data.filter(record => {
        // 日期範圍篩選
        if (query.startDate && query.endDate) {
            const recordDate = record['處分日期'];
            if (recordDate) {
                const date = new Date(recordDate);
                const startDate = new Date(query.startDate);
                const endDate = new Date(query.endDate);
                
                if (date < startDate || date > endDate) {
                    return false;
                }
            }
        }
        
        // 事業單位名稱篩選
        if (query.companyName) {
            const companyName = record['事業單位名稱或負責人'] || '';
            if (!companyName.toLowerCase().includes(query.companyName.toLowerCase())) {
                return false;
            }
        }
        
        // 主管機關篩選
        if (query.authority) {
            if (record['主管機關'] !== query.authority) {
                return false;
            }
        }
        
        // 法規類型篩選
        if (query.lawType) {
            if (record['lawType'] !== query.lawType) {
                return false;
            }
        }
        
        return true;
    }).sort((a, b) => {
        // 按處分日期降序排列
        const dateA = new Date(a['處分日期'] || '1900-01-01');
        const dateB = new Date(b['處分日期'] || '1900-01-01');
        return dateB - dateA;
    });
}

/**
 * 更新結果顯示
 */
function updateResultDisplay() {
    const totalCount = filteredData.length;
    const resultCountElement = document.getElementById('resultCount');
    const resultTableElement = document.getElementById('resultTable');
    const paginationInfoElement = document.getElementById('paginationInfo');
    
    if (resultCountElement) {
        resultCountElement.textContent = `查詢結果：共 ${totalCount.toLocaleString()} 筆資料`;
    }
    
    // 更新分頁資訊
    if (paginationInfoElement) {
        const pageSize = getCurrentPageSize();
        const totalPages = Math.ceil(totalCount / pageSize);
        const startItem = totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0;
        const endItem = Math.min(currentPage * pageSize, totalCount);
        
        if (totalCount === 0) {
            paginationInfoElement.textContent = '無資料';
        } else {
            paginationInfoElement.textContent = `第 ${currentPage} 頁，共 ${totalPages} 頁 (顯示第 ${startItem.toLocaleString()}-${endItem.toLocaleString()} 筆)`;
        }
    }
    
    if (totalCount === 0) {
        showNoResult();
        return;
    }
    
    // 限制顯示數量以防止記憶體過載
    const maxDisplay = SYSTEM_CONFIG.performance.maxDisplayItems;
    if (totalCount > maxDisplay) {
        const warningElement = document.getElementById('displayWarning');
        if (warningElement) {
            warningElement.style.display = 'block';
            warningElement.textContent = `注意：由於資料量龐大（${totalCount.toLocaleString()}筆），僅顯示前${maxDisplay.toLocaleString()}筆資料。請使用更精確的搜尋條件。`;
        }
    } else {
        const warningElement = document.getElementById('displayWarning');
        if (warningElement) {
            warningElement.style.display = 'none';
        }
    }
    
    // 使用虛擬滾動或分頁顯示
    // 暫時關閉虛擬滾動，使用傳統分頁顯示
    updateResultTable();
    
    updatePagination();
}

/**
 * 顯示無結果訊息
 */
function showNoResult() {
    document.getElementById('resultSection').style.display = 'none';
    document.getElementById('noResultSection').style.display = 'block';
    
    // 更新分頁資訊
    const paginationInfoElement = document.getElementById('paginationInfo');
    if (paginationInfoElement) {
        paginationInfoElement.textContent = '無資料';
    }
    
    // 停用匯出按鈕
    document.getElementById('exportCSV').disabled = true;
    document.getElementById('exportExcel').disabled = true;
}

/**
 * 獲取當前頁面大小
 * @returns {number} 當前頁面大小
 */
function getCurrentPageSize() {
    const pageSizeSelect = document.getElementById('pageSize');
    return pageSizeSelect ? parseInt(pageSizeSelect.value) : SYSTEM_CONFIG.defaultPageSize;
}

/**
 * 更新結果表格（傳統分頁版本）
 */
function updateResultTable() {
    const tableBody = document.getElementById('resultTableBody');
    if (!tableBody) {
        console.error('找不到表格主體元素');
        return;
    }
    
    console.log('開始更新結果表格');
    console.log('filteredData 長度:', filteredData.length);
    console.log('currentPage:', currentPage);
    console.log('pageSize:', getCurrentPageSize());
    
    // 清空表格
    tableBody.innerHTML = '';
    
    // 計算分頁
    const pageSize = getCurrentPageSize();
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, filteredData.length);
    const pageData = filteredData.slice(startIndex, endIndex);
    
    console.log('分頁資料:', {
        startIndex,
        endIndex,
        pageDataLength: pageData.length,
        firstItem: pageData[0]
    });
    
    // 顯示結果區域
    document.getElementById('resultSection').style.display = 'block';
    document.getElementById('noResultSection').style.display = 'none';
    
    // 啟用匯出按鈕
    document.getElementById('exportCSV').disabled = false;
    document.getElementById('exportExcel').disabled = false;
    
    // 渲染表格行
    pageData.forEach((item, index) => {
        console.log(`渲染第 ${index + 1} 行:`, item);
        const row = createTableRow(item, startIndex + index + 1);
        tableBody.appendChild(row);
    });
    
    console.log('表格更新完成，共渲染', pageData.length, '行');
}

/**
 * 建立表格行
 * @param {Object} item 資料項目
 * @param {number} index 索引
 * @returns {HTMLElement} 表格行元素
 */
function createTableRow(item, index) {
    const row = document.createElement('tr');
    row.className = 'result-row';
    
    row.innerHTML = `
        <td>${index}</td>
        <td>${item['事業單位名稱或負責人'] || '-'}</td>
        <td>${item['lawType'] || '-'}</td>
        <td>${item['違反法規內容'] || '-'}</td>
        <td>${item['主管機關'] || '-'}</td>
        <td>${item['處分日期'] || '-'}</td>
        <td>${formatAmount(item['罰鍰金額']) || '-'}</td>
    `;
    
    return row;
}

/**
 * 更新分頁控制
 */
function updatePagination() {
    const pageSize = getCurrentPageSize();
    const totalPages = Math.ceil(filteredData.length / pageSize);
    const pagination = document.getElementById('pagination');
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let paginationHTML = '';
    
    // 最前頁按鈕
    paginationHTML += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(1)" title="最前頁">
                <i class="bi bi-chevron-double-left"></i>
            </a>
        </li>
    `;
    
    // 上一頁按鈕
    paginationHTML += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage - 1})" title="上一頁">
                <i class="bi bi-chevron-left"></i>
            </a>
        </li>
    `;
    
    // 頁碼按鈕
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    // 如果起始頁不是第一頁，顯示省略號
    if (startPage > 1) {
        paginationHTML += `
            <li class="page-item disabled">
                <span class="page-link">...</span>
            </li>
        `;
    }
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="#" onclick="changePage(${i})">${i}</a>
            </li>
        `;
    }
    
    // 如果結束頁不是最後一頁，顯示省略號
    if (endPage < totalPages) {
        paginationHTML += `
            <li class="page-item disabled">
                <span class="page-link">...</span>
            </li>
        `;
    }
    
    // 下一頁按鈕
    paginationHTML += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage + 1})" title="下一頁">
                <i class="bi bi-chevron-right"></i>
            </a>
        </li>
    `;
    
    // 最末頁按鈕
    paginationHTML += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${totalPages})" title="最末頁">
                <i class="bi bi-chevron-double-right"></i>
            </a>
        </li>
    `;
    
    pagination.innerHTML = paginationHTML;
}

/**
 * 切換頁面
 * @param {number} page 目標頁面
 */
function changePage(page) {
    const pageSize = getCurrentPageSize();
    const totalPages = Math.ceil(filteredData.length / pageSize);
    
    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        updateResultTable();
        updatePagination();
    }
}

/**
 * 重置查詢條件
 */
function resetQuery() {
    document.getElementById('companyName').value = '';
    document.getElementById('authority').value = '';
    document.getElementById('lawType').value = '';
    setDefaultDateRange();
    
    // 執行搜尋
    performSearch();
}

/**
 * 格式化金額
 * @param {string} amount 金額字串
 * @returns {string} 格式化後的金額
 */
function formatAmount(amount) {
    if (!amount || amount === '') return '-';
    
    // 如果是數字，格式化為千分位
    const num = parseFloat(amount);
    if (!isNaN(num)) {
        return new Intl.NumberFormat('zh-TW').format(num);
    }
    
    return amount;
}

/**
 * 匯出為CSV
 */
function exportToCSV() {
    if (filteredData.length === 0) {
        alert('沒有資料可以匯出');
        return;
    }
    
    const headers = [
        '序號', '主管機關', '處分日期', '事業單位名稱或負責人', 
        '違法法規法條', '違反法規內容', '罰鍰金額', '備註說明'
    ];
    
    const csvContent = [
        headers.join(','),
        ...filteredData.map((record, index) => [
            index + 1,
            record['主管機關'] || '',
            record['處分日期'] || '',
            `"${record['事業單位名稱或負責人'] || ''}"`,
            `"${record['違法法規法條'] || ''}"`,
            `"${record['違反法規內容'] || ''}"`,
            record['罰鍰金額'] || '',
            `"${record['備註說明'] || ''}"`
        ].join(','))
    ].join('\n');
    
    downloadFile(csvContent, '勞動法令裁處資料.csv', 'text/csv');
}

/**
 * 匯出為Excel
 */
function exportToExcel() {
    if (filteredData.length === 0) {
        alert('沒有資料可以匯出');
        return;
    }
    
    const headers = [
        '序號', '主管機關', '處分日期', '事業單位名稱或負責人', 
        '違法法規法條', '違反法規內容', '罰鍰金額', '備註說明'
    ];
    
    const worksheet = XLSX.utils.aoa_to_sheet([
        headers,
        ...filteredData.map((record, index) => [
            index + 1,
            record['主管機關'] || '',
            record['處分日期'] || '',
            record['事業單位名稱或負責人'] || '',
            record['違法法規法條'] || '',
            record['違反法規內容'] || '',
            record['罰鍰金額'] || '',
            record['備註說明'] || ''
        ])
    ]);
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '勞動法令裁處資料');
    
    XLSX.writeFile(workbook, '勞動法令裁處資料.xlsx');
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
    document.getElementById('loadingOverlay').style.display = 'flex';
}

/**
 * 隱藏載入中
 */
function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

/**
 * 處理頁面大小變更
 */
function handlePageSizeChange() {
    // 重置到第一頁
    currentPage = 1;
    
    // 重新更新顯示
    updateResultDisplay();
}

// 監聽日期變更事件
document.getElementById('startDate').addEventListener('change', updateDateRangeDisplay);
document.getElementById('endDate').addEventListener('change', updateDateRangeDisplay);

// 監聽頁面大小變更事件
document.addEventListener('DOMContentLoaded', function() {
    const pageSizeSelect = document.getElementById('pageSize');
    if (pageSizeSelect) {
        pageSizeSelect.addEventListener('change', handlePageSizeChange);
    }
});
