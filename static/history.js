const historyList = document.querySelector("#historyList");
const historyMeta = document.querySelector("#historyMeta");
const statusPill = document.querySelector("#statusPill");
const recordTitle = document.querySelector("#recordTitle");
const recordMeta = document.querySelector("#recordMeta");
const downloads = document.querySelector("#downloads");
const previewHead = document.querySelector("#previewHead");
const previewBody = document.querySelector("#previewBody");
const historyProductRankingList = document.querySelector("#historyProductRankingList");
const historyProductRankingMeta = document.querySelector("#historyProductRankingMeta");
const historyCenterRankingList = document.querySelector("#historyCenterRankingList");
const historyCenterRankingMeta = document.querySelector("#historyCenterRankingMeta");
const tabButtons = document.querySelectorAll(".tab-button");
const prevPage = document.querySelector("#prevPage");
const nextPage = document.querySelector("#nextPage");
const pageMeta = document.querySelector("#pageMeta");

let records = [];
let selectedRecord = null;
let activePreview = "manual";
let currentPage = 1;
const pageSize = 10;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatNumber(value, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  return new Intl.NumberFormat("zh-CN", { maximumFractionDigits: digits }).format(value);
}

function formatCurrency(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value) {
  return `${formatNumber(value, 1)}%`;
}

function formatDays(value) {
  return value === null || value === undefined ? "无销量" : `${formatNumber(value, 1)}天`;
}

function renderDownloads(files) {
  downloads.innerHTML = "";
  for (const file of [files.manual, files.b]) {
    if (!file) continue;
    const row = document.createElement("div");
    row.className = "download-row";
    row.innerHTML = `<span>${escapeHtml(file.name)}</span><a href="${file.url}">下载</a>`;
    downloads.append(row);
  }
}

function renderManual(rows) {
  previewHead.innerHTML = `
    <tr>
      <th>SKU</th><th>商品名称</th><th>配送中心</th><th>采购需求数量</th>
      <th>日销</th><th>可订购库存</th><th>采购在途</th><th>可售天数</th>
    </tr>
  `;
  previewBody.innerHTML = "";
  if (!rows.length) {
    previewBody.innerHTML = `<tr><td colspan="8" class="placeholder">没有数据</td></tr>`;
    return;
  }
  for (const row of rows) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(row.sku)}</td>
      <td class="name-cell">${escapeHtml(row.product_name)}</td>
      <td>${escapeHtml(row.center)}</td>
      <td>${formatNumber(row.quantity)}</td>
      <td>${formatNumber(row.near_14_daily_sales, 2)}</td>
      <td>${formatNumber(row.available_order_qty)}</td>
      <td>${formatNumber(row.purchase_in_transit_qty)}</td>
      <td>${formatDays(row.coverage_days)}</td>
    `;
    previewBody.append(tr);
  }
}

function renderB(rows) {
  previewHead.innerHTML = `
    <tr>
      <th>SKU</th><th>商品名称</th><th>配送中心</th><th>B仓入库量</th><th>分仓差额</th>
      <th>B仓本仓库存</th><th>B仓采购在途</th><th>分仓日销合计</th><th>箱规</th>
    </tr>
  `;
  previewBody.innerHTML = "";
  if (!rows.length) {
    previewBody.innerHTML = `<tr><td colspan="9" class="placeholder">没有数据</td></tr>`;
    return;
  }
  for (const row of rows) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(row.sku)}</td>
      <td class="name-cell">${escapeHtml(row.product_name)}</td>
      <td>${escapeHtml(row.center)}</td>
      <td>${formatNumber(row.quantity)}</td>
      <td>${formatNumber(row.branch_gap)}</td>
      <td>${formatNumber(row.available_order_qty)}</td>
      <td>${formatNumber(row.purchase_in_transit_qty)}</td>
      <td>${formatNumber(row.near_14_daily_sales, 2)}</td>
      <td>${formatNumber(row.box_spec)}</td>
    `;
    previewBody.append(tr);
  }
}

function renderPreview() {
  if (!selectedRecord) return;
  const rows = activePreview === "manual" ? selectedRecord.manual_preview : selectedRecord.b_preview;
  if (activePreview === "manual") renderManual(rows);
  else renderB(rows);
  recordMeta.textContent = `共 ${rows.length} 行，表格内滚动查看`;
}

function renderRankingChart(listEl, metaEl, rows, totalAmount, emptyText, getTitle, getSubTitle) {
  const safeRows = Array.isArray(rows) ? rows : [];
  metaEl.textContent = safeRows.length ? `总额 ${formatCurrency(totalAmount)} · 7日销售额占比` : "暂无数据";
  listEl.innerHTML = "";
  if (!safeRows.length) {
    listEl.innerHTML = `<p class="placeholder">${escapeHtml(emptyText)}</p>`;
    return;
  }

  const maxShare = Math.max(...safeRows.map((row) => Number(row.share_pct) || 0), 1);
  const chart = document.createElement("div");
  chart.className = "bar-chart";

  safeRows.forEach((row, index) => {
    const share = Math.max(0, Math.min(100, Number(row.share_pct) || 0));
    const barWidth = Math.max(3, (share / maxShare) * 100);
    const title = getTitle(row);
    const subTitle = getSubTitle(row);
    const tooltip = `${title}\n${subTitle}\n销售占比 ${formatPercent(row.share_pct)}\n销售额 ${formatCurrency(row.sales_amount)}`;
    const item = document.createElement("div");
    item.className = "bar-item";
    item.innerHTML = `
      <div class="bar-rank">TOP ${index + 1}</div>
      <div class="bar-title" title="${escapeHtml(tooltip)}">${escapeHtml(title)}</div>
      <div class="bar-plot" title="${escapeHtml(tooltip)}">
        <div class="bar-fill" style="width: ${barWidth}%"></div>
      </div>
      <div class="bar-value">${formatPercent(row.share_pct)}</div>
      <div class="bar-sub" title="${escapeHtml(tooltip)}">${escapeHtml(subTitle)}</div>
    `;
    chart.append(item);
  });
  listEl.append(chart);
}

function renderSalesRankings(rankings) {
  const data = rankings || {};
  renderRankingChart(
    historyProductRankingList,
    historyProductRankingMeta,
    data.product_top10,
    data.product_total_amount,
    "暂无产品销售排行",
    (row) => row.product_name || row.sku || "-",
    (row) => `SKU ${row.sku || "-"} · 7日销量 ${formatNumber(row.sales_7, 0)}`
  );
  renderRankingChart(
    historyCenterRankingList,
    historyCenterRankingMeta,
    data.center_top10,
    data.center_total_amount,
    "暂无站点销售排行",
    (row) => row.center || "-",
    (row) => `7日销量 ${formatNumber(row.sales_7, 0)}`
  );
}

async function loadRecord(runId) {
  statusPill.textContent = "正在读取";
  const response = await fetch(`/api/history/${runId}`);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.detail || "读取记录失败");
  selectedRecord = payload;
  recordTitle.textContent = `${payload.run_date} 生成记录`;
  renderDownloads(payload.files);
  renderSalesRankings(payload.sales_rankings);
  renderPreview();
  statusPill.textContent = "历史记录";
}

function renderHistoryList() {
  historyList.innerHTML = "";
  if (!records.length) {
    historyList.innerHTML = `<p class="empty">暂无生成记录</p>`;
    pageMeta.textContent = "第 0 / 0 页";
    prevPage.disabled = true;
    nextPage.disabled = true;
    return;
  }
  const totalPages = Math.max(1, Math.ceil(records.length / pageSize));
  currentPage = Math.min(Math.max(currentPage, 1), totalPages);
  const start = (currentPage - 1) * pageSize;
  const pageRecords = records.slice(start, start + pageSize);

  for (const record of pageRecords) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "history-card";
    button.dataset.runId = record.run_id;
    button.innerHTML = `
      <strong>${escapeHtml(record.run_date)} · ${escapeHtml(record.run_id)}</strong>
      <span>手工单 ${formatNumber(record.manual_count)} 行，B仓 ${formatNumber(record.b_count)} 个SKU</span>
      <span>${escapeHtml(record.created_at || "")}</span>
    `;
    button.addEventListener("click", async () => {
      document.querySelectorAll(".history-card").forEach((item) => item.classList.toggle("active", item === button));
      await loadRecord(record.run_id);
    });
    historyList.append(button);
  }
  pageMeta.textContent = `第 ${currentPage} / ${totalPages} 页`;
  prevPage.disabled = currentPage <= 1;
  nextPage.disabled = currentPage >= totalPages;
}

for (const button of tabButtons) {
  button.addEventListener("click", () => {
    activePreview = button.dataset.preview;
    tabButtons.forEach((item) => item.classList.toggle("active", item === button));
    renderPreview();
  });
}

prevPage.addEventListener("click", () => {
  currentPage -= 1;
  renderHistoryList();
});

nextPage.addEventListener("click", () => {
  currentPage += 1;
  renderHistoryList();
});

async function loadHistory() {
  const response = await fetch("/api/history");
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.detail || "读取历史失败");
  records = payload.records;
  historyMeta.textContent = `${records.length} 条`;
  currentPage = 1;
  renderHistoryList();
  if (records[0]) {
    const first = document.querySelector(".history-card");
    first?.classList.add("active");
    await loadRecord(records[0].run_id);
  }
}

loadHistory().catch((error) => {
  statusPill.textContent = "读取失败";
  historyMeta.textContent = error.message;
});
