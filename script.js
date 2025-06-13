// 在檔案最上方加入除錯訊息
console.log('script.js 開始載入');

// API設定
const API_CONFIG = {
    baseUrl: 'https://data.moenv.gov.tw/api/v2',
    dataset: 'ems_p_46',  // 環保署裁處資料集代碼
    apiKey: '3ad11674-a8ed-463d-86fb-22f564a23350',
    format: 'json',
    defaultLimit: 5,
    defaultOffset: 0
};

// 全域變數，用於儲存 DOM 元素
let elements = {
    filterContainer: null,
    resultBody: null,
    fieldInfoBody: null
};

// 操作符定義（更友善的顯示方式）
const OPERATOR_DEFINITIONS = {
    text: [
        { value: 'EQ', label: '等於' }
    ],
    date: [
        { value: 'EQ', label: '等於' },
        { value: 'GR', label: '大於' },
        { value: 'GE', label: '大於等於' },
        { value: 'LT', label: '小於' },
        { value: 'LE', label: '小於等於' },
        { value: 'BETWEEN', label: '介於' }
    ]
};

// 欄位定義（用於篩選條件）
const FIELD_DEFINITIONS = {
    ems_no: { label: '管制事業編號', type: 'text' },
    fac_name: { label: '事業名稱', type: 'text' },
    county_name: { label: '裁處機關', type: 'text' },
    document_no: { label: '裁處書字號', type: 'text' },
    transgress_date: { label: '違反時間', type: 'date' },  // 保持 date 類型用於篩選
    transgress_law: { label: '違反法令', type: 'text' },
    penalty_money: { label: '裁處金額', type: 'text' },
    penalty_date: { label: '裁處時間', type: 'date' },     // 保持 date 類型用於篩選
    ispetition: { label: '是否訴願訴訟', type: 'text' },
    petition_results: { label: '訴願訴訟結果', type: 'text' },
    appeal_or_rescind: { label: '陳述意見結果', type: 'text' },
    transgress_type: { label: '污染類別', type: 'text' },
    fac_address: { label: '公司（工廠）地址', type: 'text' },
    transgress_name: { label: '違規人名稱', type: 'text' },
    openinfor: { label: '違反事實', type: 'text' },
    lawsuit_date_1: { label: '訴願提出日期', type: 'date' },  // 保持 date 類型用於篩選
    illegal_money: { label: '不法利得', type: 'text' },
    track_illegal_money: { label: '水污追繳不法利得', type: 'text' },
    petition_agency: { label: '審議機關', type: 'text' },
    fac_uniformno: { label: '統一編號', type: 'text' },
    subject: { label: '主旨', type: 'text' },
    gist_define: { label: '裁處理由及法令', type: 'text' },
    improve_deadline: { label: '限改日期', type: 'date' },    // 保持 date 類型用於篩選
    inspection_condition: { label: '複查稽查單稽查結果', type: 'text' },
    transgress_control_id: { label: '違規人管制編號', type: 'text' },
    is_improve: { label: '改善完妥與否', type: 'text' },
    inspection_datetime_s: { label: '複查稽查單稽查日期', type: 'date' },  // 保持 date 類型用於篩選
    penaltykind: { label: '其他處罰方式', type: 'text' },
    isimportant: { label: '情節重大', type: 'text' },
    paymentstate: { label: '罰鍰是否繳清', type: 'text' },
    isreminder: { label: '是否進行催繳', type: 'text' },
    isadmincourt: { label: '是否行政移送', type: 'text' },
    isreducemoney: { label: '是否減免罰鍰', type: 'text' },
    transgress_address: { label: '違反地址', type: 'text' },
    allow_rework_date: { label: '核准復工日期', type: 'date' },  // 保持 date 類型用於篩選
    fac_city_code: { label: '公司（工廠）地址縣市別代碼', type: 'text' },
    fac_area_code: { label: '公司（工廠）地址縣市鄉鎮市區別代碼', type: 'text' },
    transgress_city_code: { label: '違反地址縣市別代碼', type: 'text' }
};

// 定義顯示欄位的順序（與實際資料欄位順序一致）
const DISPLAY_FIELDS = [
    'ems_no',           // 管制事業編號
    'fac_name',         // 事業名稱
    'county_name',      // 裁處機關
    'document_no',      // 裁處書字號
    'transgress_date',  // 違反時間
    'transgress_law',   // 違反法令
    'transgress_type',  // 汙染類別
    'penalty_date',     // 裁處時間
    'penalty_money'     // 裁處金額
];

// 運算符對應表
const OPERATOR_MAP = {
    'equals': 'EQ',
    'contains': 'LIKE',
    'starts_with': 'LIKE',
    'ends_with': 'LIKE',
    'before': 'LT',
    'after': 'GT',
    'between': 'BETWEEN'
};

// 初始化 DOM 元素
function initializeElements() {
    console.log('開始初始化 DOM 元素');
    
    try {
        // 取得所有需要的 DOM 元素
        elements.filterContainer = document.getElementById('filterContainer');
        elements.resultBody = document.getElementById('resultBody');
        elements.fieldInfoBody = document.getElementById('fieldInfoBody');
        
        // 檢查元素是否存在
        Object.entries(elements).forEach(([key, element]) => {
            if (!element) {
                console.error(`找不到元素: ${key}`);
            } else {
                console.log(`成功找到元素: ${key}`);
            }
        });
        
        return true;
    } catch (error) {
        console.error('初始化 DOM 元素時發生錯誤:', error);
        return false;
    }
}

/**
 * 顯示錯誤訊息
 * @param {string} message 錯誤訊息
 */
function showError(message) {
    elements.error.textContent = message;
    elements.error.classList.remove('d-none');
    elements.result.classList.add('d-none');
}

/**
 * 隱藏錯誤訊息
 */
function hideError() {
    elements.error.classList.add('d-none');
}

/**
 * 顯示載入中狀態
 */
function showLoading() {
    elements.loading.classList.remove('d-none');
    elements.submitBtn.disabled = true;
    hideError();
}

/**
 * 隱藏載入中狀態
 */
function hideLoading() {
    elements.loading.classList.add('d-none');
    elements.submitBtn.disabled = false;
}

/**
 * 格式化日期為 YYYY-MM-DD
 * @param {string} date 日期字串
 * @returns {string} 格式化後的日期字串
 */
function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * 格式化金額
 * @param {string} amount 金額字串
 * @returns {string} 格式化後的金額字串
 */
function formatAmount(amount) {
    if (!amount) return '-';
    return new Intl.NumberFormat('zh-TW').format(amount);
}

/**
 * 建立結果表格行
 * @param {Object} record 資料記錄
 * @returns {HTMLTableRowElement} 表格行元素
 */
function createTableRow(record) {
    const row = document.createElement('tr');
    
    // 定義要顯示的欄位
    const fields = [
        '管制事業編號',
        '事業名稱',
        '裁處機關',
        '裁處書字號',
        '違反時間',
        '違反法令',
        '裁處金額',
        '裁處時間'
    ];

    // 為每個欄位建立單元格
    fields.forEach(field => {
        const cell = document.createElement('td');
        let value = record[field] || '-';
        
        // 根據欄位類型進行格式化
        if (field.includes('時間')) {
            value = formatDate(value);
        } else if (field.includes('金額')) {
            value = formatAmount(value);
        }
        
        cell.textContent = value;
        row.appendChild(cell);
    });

    return row;
}

/**
 * 顯示查詢結果
 * @param {Object} data API回應資料
 */
function showResults(data) {
    elements.resultBody.innerHTML = '';
    
    if (!data.records || data.records.length === 0) {
        showError('查無資料');
        return;
    }

    // 顯示結果表格
    data.records.forEach(record => {
        const row = document.createElement('tr');
        
        // 定義要顯示的欄位
        const fields = [
            { id: 'ems_no', label: '管制事業編號' },
            { id: 'fac_name', label: '事業名稱' },
            { id: 'county_name', label: '裁處機關' },
            { id: 'document_no', label: '裁處書字號' },
            { id: 'transgress_date', label: '違反時間' },
            { id: 'transgress_law', label: '違反法令' },
            { id: 'penalty_money', label: '裁處金額' },
            { id: 'penalty_date', label: '裁處時間' }
        ];

        // 為每個欄位建立單元格
        fields.forEach(field => {
            const cell = document.createElement('td');
            let value = record[field.id] || '-';
            
            // 根據欄位類型進行格式化
            if (field.id.includes('date')) {
                value = formatDate(value);
            } else if (field.id.includes('money')) {
                value = formatAmount(value);
            }
            
            cell.textContent = value;
            row.appendChild(cell);
        });

        elements.resultBody.appendChild(row);
    });

    elements.result.classList.remove('d-none');
}

/**
 * 更新值輸入容器的函數
 * @param {HTMLSelectElement} fieldSelect 欄位選擇器
 * @param {HTMLDivElement} valueContainer 值輸入容器
 */
function updateValueContainer(fieldSelect, valueContainer) {
    const fieldType = FIELD_DEFINITIONS[fieldSelect.value]?.type || 'text';
    const operatorSelect = fieldSelect.closest('.filter-group').querySelector('.operator-select');
    const operator = operatorSelect.value;

    // 清空現有內容
    valueContainer.innerHTML = '';

    if (fieldType === 'date') {
        if (operator === 'BETWEEN') {
            // 建立一個 div 作為區間容器
            const rangeDiv = document.createElement('div');
            rangeDiv.className = 'date-range';

            const startInput = document.createElement('input');
            startInput.type = 'date';
            startInput.className = 'form-control date-range-start';
            startInput.placeholder = '開始日期';

            const endInput = document.createElement('input');
            endInput.type = 'date';
            endInput.className = 'form-control date-range-end';
            endInput.placeholder = '結束日期';

            rangeDiv.appendChild(startInput);
            rangeDiv.appendChild(document.createTextNode(' 至 '));
            rangeDiv.appendChild(endInput);

            valueContainer.appendChild(rangeDiv);
        } else {
            // 單一日期輸入
            const dateInput = document.createElement('input');
            dateInput.type = 'date';
            dateInput.className = 'form-control';
            valueContainer.appendChild(dateInput);
        }
    } else {
        // 文字輸入（只使用 EQ）
        const textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.className = 'form-control';
        textInput.placeholder = '請輸入搜尋值';
        valueContainer.appendChild(textInput);
    }
}

/**
 * 執行搜尋
 * @param {Object} params 查詢參數
 */
async function performSearch() {
    console.log('開始執行搜尋');
    try {
        const filters = [];
        const filterGroups = document.querySelectorAll('.filter-group');
        
        filterGroups.forEach(group => {
            const fieldSelect = group.querySelector('.field-select');
            const operatorSelect = group.querySelector('.operator-select');
            const valueContainer = group.querySelector('.value-container');
            
            const field = fieldSelect.value;
            const operator = operatorSelect.value;
            const fieldType = FIELD_DEFINITIONS[field]?.type || 'text';
            
            if (field && operator) {
                if (fieldType === 'date') {
                    if (operator === 'BETWEEN') {
                        const startDate = valueContainer.querySelector('.date-range-start')?.value;
                        const endDate = valueContainer.querySelector('.date-range-end')?.value;
                        if (startDate && endDate) {
                            filters.push(`${field},GR,${formatDate(startDate)}`);
                            filters.push(`${field},LE,${formatDate(endDate)}`);
                        }
                    } else {
                        const dateInput = valueContainer.querySelector('input[type="date"]');
                        if (dateInput?.value) {
                            filters.push(`${field},${operator},${formatDate(dateInput.value)}`);
                        }
                    }
                } else {
                    // 文字欄位只使用 EQ
                    const textInput = valueContainer.querySelector('input[type="text"]');
                    if (textInput?.value) {
                        filters.push(`${field},EQ,${textInput.value}`);
                    }
                }
            }
        });

        // 將所有條件用 | 連接
        const filterString = filters.join('|');
        console.log('搜尋條件:', filterString);
        
        // 構建 API URL
        const params = new URLSearchParams({
            format: API_CONFIG.format,
            offset: API_CONFIG.defaultOffset,
            limit: API_CONFIG.defaultLimit,
            api_key: API_CONFIG.apiKey
        });
        
        if (filterString) {
            params.append('filters', filterString);
        }
        
        const url = `${API_CONFIG.baseUrl}/${API_CONFIG.dataset}?${params.toString()}`;
        console.log('API 請求 URL:', url);
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`API 請求失敗: ${response.status}`);
        }
        
        const data = await response.json();
        updateResultTable(data.records || []);
        
    } catch (error) {
        console.error('搜尋時發生錯誤:', error);
        alert('搜尋時發生錯誤，請稍後再試');
    }
}

/**
 * 執行API查詢
 * @param {Object} params 查詢參數
 */
async function queryData(params) {
    try {
        // 構建查詢參數
        const queryParams = new URLSearchParams({
            format: params.format,
            offset: params.offset,
            limit: params.limit,
            api_key: API_CONFIG.apiKey
        });

        // 如果有篩選條件，加入到查詢參數中
        if (params.filters) {
            queryParams.append('filters', params.filters);
        }

        const fullUrl = `${API_CONFIG.baseUrl}/${API_CONFIG.dataset}?${queryParams}`;
        console.log('完整URL:', fullUrl);

        const response = await fetch(fullUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            },
            mode: 'cors'  // 啟用CORS
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API錯誤回應:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const data = await response.json();
        console.log('API回應資料:', data);

        // 檢查回應格式
        if (!data || !data.records) {
            console.error('API回應格式不正確:', data);
            throw new Error('API回應格式不正確');
        }

        // 更新表格顯示
        updateResultTable(data.records);
    } catch (error) {
        console.error('查詢失敗:', error);
        showError(`查詢失敗：${error.message}`);
    } finally {
        hideLoading();
    }
}

// 表單提交事件處理
elements.form.addEventListener('submit', async (event) => {
    event.preventDefault();
    
    // 取得表單資料
    const params = {
        dataset: API_CONFIG.dataset,
        format: document.getElementById('format').value,
        offset: parseInt(document.getElementById('offset').value) || 0,
        limit: parseInt(document.getElementById('limit').value) || 5
    };

    // 驗證輸入
    if (params.limit < 1 || params.limit > 1000) {
        showError('取得筆數必須在1到1000之間');
        return;
    }

    if (params.offset < 0) {
        showError('起始筆數不能為負數');
        return;
    }

    // 執行查詢
    showLoading();
    await queryData(params);
});

// 新增篩選條件群組
function addFilterGroup() {
    const filterContainer = document.getElementById('filterContainer');
    const filterGroup = document.createElement('div');
    filterGroup.className = 'filter-group mb-3 p-3 border rounded';
    
    // 生成唯一ID
    const groupId = 'filter_' + Date.now();
    
    filterGroup.innerHTML = `
        <div class="row g-3 align-items-center">
            <div class="col-auto">
                <select class="form-select field-select" onchange="updateOperators(this)">
                    <option value="">請選擇欄位</option>
                    ${Object.entries(FIELD_DEFINITIONS).map(([key, field]) => 
                        `<option value="${key}">${field.label}</option>`
                    ).join('')}
                </select>
            </div>
            <div class="col-auto">
                <select class="form-select operator-select" disabled>
                    <option value="">請選擇運算符</option>
                </select>
            </div>
            <div class="col-auto value-container">
                <input type="text" class="form-control" disabled>
            </div>
            <div class="col-auto">
                <button type="button" class="btn btn-danger" onclick="removeFilterGroup(this)">
                    <i class="bi bi-trash"></i> 移除
                </button>
            </div>
        </div>
    `;
    
    filterContainer.appendChild(filterGroup);
}

// 移除篩選條件群組
function removeFilterGroup(button) {
    // 找到最近的 filter-group 元素並移除
    const filterGroup = button.closest('.filter-group');
    if (filterGroup) {
        filterGroup.remove();
    }
}

/**
 * 更新運算符選項
 * @param {HTMLSelectElement} select 欄位選擇器
 */
function updateOperators(select) {
    const filterGroup = select.closest('.filter-group');
    const operatorSelect = filterGroup.querySelector('.operator-select');
    const valueContainer = filterGroup.querySelector('.value-container');
    const fieldType = FIELD_DEFINITIONS[select.value]?.type || 'text';
    
    // 清空現有選項
    operatorSelect.innerHTML = '';
    
    // 根據欄位類型顯示對應的運算符
    const operators = OPERATOR_DEFINITIONS[fieldType] || OPERATOR_DEFINITIONS.text;
    operators.forEach(op => {
        const option = document.createElement('option');
        option.value = op.value;
        option.textContent = op.label;
        operatorSelect.appendChild(option);
    });
    
    // 移除 disabled 屬性
    operatorSelect.removeAttribute('disabled');
    
    // 移除舊的事件監聽器（如果有的話）
    const newOperatorSelect = operatorSelect.cloneNode(true);
    operatorSelect.parentNode.replaceChild(newOperatorSelect, operatorSelect);
    
    // 添加新的事件監聽器
    newOperatorSelect.addEventListener('change', function() {
        updateValueContainer(select, valueContainer);
    });
    
    // 更新值輸入容器
    updateValueContainer(select, valueContainer);
}

// 初始化欄位說明 Modal
function initializeFieldInfoModal() {
    console.log('初始化欄位說明 Modal');
    
    if (!elements.fieldInfoBody) {
        console.error('找不到欄位說明表格主體');
        return;
    }
    
    elements.fieldInfoBody.innerHTML = Object.entries(FIELD_DEFINITIONS)
        .map(([code, info]) => `
            <tr>
                <td>${code}</td>
                <td>${info.label}</td>
                <td>${info.type}</td>
            </tr>
        `).join('');
    
    console.log('欄位說明 Modal 初始化完成');
}

// 更新結果表格
function updateResultTable(records) {
    const tbody = document.querySelector('#resultTable tbody');
    if (!tbody) {
        console.error('找不到結果表格的 tbody 元素');
        return;
    }

    // 清空現有內容
    tbody.innerHTML = '';

    if (!records || records.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="${DISPLAY_FIELDS.length + 1}" class="text-center">無符合條件的資料</td>`;
        tbody.appendChild(tr);
        return;
    }

    // 新增資料列
    records.forEach(record => {
        const tr = document.createElement('tr');
        
        DISPLAY_FIELDS.forEach(field => {
            const td = document.createElement('td');
            let value = record[field] || '';
            
            // 格式化日期欄位
            if (['transgress_date', 'penalty_date'].includes(field) && value) {
                // 確保日期格式正確顯示
                value = value.replace(/\//g, '-');  // 將斜線替換為連字符
            }
            
            td.textContent = value;
            tr.appendChild(td);
        });

        // 新增操作欄位
        const actionTd = document.createElement('td');
        actionTd.innerHTML = `
            <button class="btn btn-sm btn-info view-details" data-record='${JSON.stringify(record)}'>
                查看詳情
            </button>
        `;
        tr.appendChild(actionTd);

        tbody.appendChild(tr);
    });

    // 綁定查看詳情按鈕事件
    document.querySelectorAll('.view-details').forEach(button => {
        button.addEventListener('click', function() {
            const record = JSON.parse(this.dataset.record);
            showRecordDetails(record);
        });
    });
}

// 顯示詳細資料
function showDetail(documentNo) {
    alert(`顯示文件編號 ${documentNo} 的詳細資料`);
}

// 確保 DOM 完全載入後才執行初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePage);
} else {
    initializePage();
}

// 初始化頁面
function initializePage() {
    console.log('開始初始化頁面');
    
    // 初始化 DOM 元素
    if (initializeElements()) {
        // 初始化欄位說明 Modal
        initializeFieldInfoModal();
        
        // 新增第一個篩選條件
        addFilterGroup();
        
        console.log('頁面初始化完成');
    }
}

// 更新表格標題的函數
function updateTableHeaders() {
    const headers = [
        '管制事業編號',
        '事業名稱',
        '裁處機關',
        '裁處書字號',
        '違反時間',
        '違反法令',
        '裁處時間',
        '裁處金額',
        '操作'
    ];
    
    const thead = document.querySelector('#resultTable thead tr');
    thead.innerHTML = headers.map(header => `<th>${header}</th>`).join('');
}

// 在頁面載入時更新表格標題
document.addEventListener('DOMContentLoaded', function() {
    updateTableHeaders();
    // ... 其他初始化程式碼 ...
});

// 在檔案結尾加入除錯訊息
console.log('script.js 載入完成'); 