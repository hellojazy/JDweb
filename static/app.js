const form = document.querySelector("#generateForm");
const fileInput = document.querySelector("#inventoryFile");
const fileLabel = document.querySelector("#fileLabel");
const dropzone = document.querySelector("#dropzone");
const runDate = document.querySelector("#runDate");
const statusPill = document.querySelector("#statusPill");
const manualCount = document.querySelector("#manualCount");
const bCount = document.querySelector("#bCount");
const totalQty = document.querySelector("#totalQty");
const downloads = document.querySelector("#downloads");
const ruleNote = document.querySelector("#ruleNote");
const previewTitle = document.querySelector("#previewTitle");
const previewHead = document.querySelector("#previewHead");
const previewBody = document.querySelector("#previewBody");
const previewMeta = document.querySelector("#previewMeta");
const shortageBody = document.querySelector("#shortageBody");
const shortageMeta = document.querySelector("#shortageMeta");
const stagnantBody = document.querySelector("#stagnantBody");
const stagnantMeta = document.querySelector("#stagnantMeta");
const productRankingList = document.querySelector("#productRankingList");
const productRankingMeta = document.querySelector("#productRankingMeta");
const centerRankingList = document.querySelector("#centerRankingList");
const centerRankingMeta = document.querySelector("#centerRankingMeta");
const tabButtons = document.querySelectorAll(".tab-button");

let latestPayload = null;
let activePreview = "manual";

runDate.value = new Date().toISOString().slice(0, 10);

function setStatus(text, mode = "ready") {
  statusPill.textContent = text;
  statusPill.dataset.mode = mode;
}

function formatNumber(value, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  return new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(value);
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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
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

function renderManualPreview(rows) {
  previewTitle.textContent = "手工作业单预览";
  previewHead.innerHTML = `
    <tr>
      <th>SKU</th>
      <th>商品名称</th>
      <th>配送中心</th>
      <th>采购需求数量</th>
      <th>箱规</th>
      <th>类型</th>
      <th>日销</th>
      <th>可订购库存</th>
      <th>采购在途</th>
      <th>可售天数</th>
    </tr>
  `;
  previewBody.innerHTML = "";
  if (!rows.length) {
    previewBody.innerHTML = `<tr><td colspan="10" class="placeholder">没有计算出正向补货行</td></tr>`;
    return;
  }
  for (const row of rows) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(row.sku)}</td>
      <td class="name-cell">${escapeHtml(row.product_name)}</td>
      <td>${escapeHtml(row.center)}</td>
      <td>${formatNumber(row.quantity)}</td>
      <td>${formatNumber(row.box_spec)}</td>
      <td>${escapeHtml(row.band || "-")}</td>
      <td>${formatNumber(row.near_14_daily_sales, 2)}</td>
      <td>${formatNumber(row.available_order_qty)}</td>
      <td>${formatNumber(row.purchase_in_transit_qty)}</td>
      <td>${formatDays(row.coverage_days)}</td>
    `;
    previewBody.append(tr);
  }
}

function renderBPreview(rows) {
  previewTitle.textContent = "B仓入仓预览";
  previewHead.innerHTML = `
    <tr>
      <th>SKU</th>
      <th>商品名称</th>
      <th>配送中心</th>
      <th>B仓入库量</th>
      <th>分仓差额</th>
      <th>B仓本仓库存</th>
      <th>B仓采购在途</th>
      <th>分仓日销合计</th>
      <th>箱规</th>
    </tr>
  `;
  previewBody.innerHTML = "";
  if (!rows.length) {
    previewBody.innerHTML = `<tr><td colspan="9" class="placeholder">没有计算出 B 仓入库行</td></tr>`;
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
  if (!latestPayload) {
    if (activePreview === "manual") {
      renderManualPreview([]);
    } else {
      renderBPreview([]);
    }
    previewMeta.textContent = "全部数据，表格内滚动";
    return;
  }
  const rows = activePreview === "manual" ? latestPayload.manual_preview : latestPayload.b_preview;
  if (activePreview === "manual") {
    renderManualPreview(rows);
  } else {
    renderBPreview(rows);
  }
  previewMeta.textContent = `共 ${rows.length} 行，表格内滚动查看`;
}

function renderShortage(rows) {
  shortageMeta.textContent = rows.length ? `${rows.length} 条` : "暂无数据";
  shortageBody.innerHTML = "";
  if (!rows.length) {
    shortageBody.innerHTML = `<tr><td colspan="6" class="placeholder">暂无预警</td></tr>`;
    return;
  }
  for (const row of rows) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(row.sku)}</td>
      <td class="name-cell">${escapeHtml(row.product_name)}</td>
      <td>${escapeHtml(row.center)}</td>
      <td>${formatNumber(row.available_order_qty)}</td>
      <td>${formatNumber(row.near_14_daily_sales, 2)}</td>
      <td>${formatDays(row.coverage_days)}</td>
    `;
    shortageBody.append(tr);
  }
}

function renderStagnant(rows) {
  stagnantMeta.textContent = rows.length ? `${rows.length} 条` : "暂无数据";
  stagnantBody.innerHTML = "";
  if (!rows.length) {
    stagnantBody.innerHTML = `<tr><td colspan="6" class="placeholder">暂无预警</td></tr>`;
    return;
  }
  for (const row of rows) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(row.sku)}</td>
      <td class="name-cell">${escapeHtml(row.product_name)}</td>
      <td>${escapeHtml(row.center)}</td>
      <td>${formatNumber(row.available_order_qty)}</td>
      <td>${formatNumber(row.sales_14)}</td>
      <td>${formatNumber(row.near_14_daily_sales, 2)}</td>
    `;
    stagnantBody.append(tr);
  }
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
    productRankingList,
    productRankingMeta,
    data.product_top10,
    data.product_total_amount,
    "暂无产品销售排行",
    (row) => row.product_name || row.sku || "-",
    (row) => `SKU ${row.sku || "-"} · 7日销量 ${formatNumber(row.sales_7, 0)}`
  );
  renderRankingChart(
    centerRankingList,
    centerRankingMeta,
    data.center_top10,
    data.center_total_amount,
    "暂无站点销售排行",
    (row) => row.center || "-",
    (row) => `7日销量 ${formatNumber(row.sales_7, 0)}`
  );
}

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  fileLabel.textContent = file ? file.name : "选择或拖入京东库存文件";
});

for (const eventName of ["dragenter", "dragover"]) {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.add("is-dragging");
  });
}

for (const eventName of ["dragleave", "drop"]) {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.remove("is-dragging");
  });
}

dropzone.addEventListener("drop", (event) => {
  const file = event.dataTransfer.files[0];
  if (!file) return;
  const transfer = new DataTransfer();
  transfer.items.add(file);
  fileInput.files = transfer.files;
  fileLabel.textContent = file.name;
});

for (const button of tabButtons) {
  button.addEventListener("click", () => {
    activePreview = button.dataset.preview;
    tabButtons.forEach((item) => item.classList.toggle("active", item === button));
    renderPreview();
  });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!fileInput.files[0]) return;

  const button = form.querySelector("button");
  button.disabled = true;
  setStatus("正在生成");

  const data = new FormData(form);
  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      body: data,
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.detail || "生成失败");
    }

    latestPayload = payload;
    manualCount.textContent = formatNumber(payload.summary.manual_count);
    bCount.textContent = formatNumber(payload.summary.b_count);
    totalQty.textContent = formatNumber(payload.summary.b_total_quantity);
    ruleNote.textContent = `14日销量超过${formatNumber(payload.summary.hot_sales_threshold)}为热销品，热销品${payload.summary.hot_turnover_days}天，普通品${payload.summary.normal_turnover_days}天，B仓${payload.summary.b_target_turnover}天周转。采购需求会扣减可订购库存和采购在途数量。`;
    renderDownloads(payload.files);
    renderShortage(payload.warnings.shortage);
    renderStagnant(payload.warnings.stagnant);
    renderSalesRankings(payload.sales_rankings);
    renderPreview();
    setStatus("生成完成");
  } catch (error) {
    setStatus("生成失败");
    downloads.innerHTML = `<p class="empty">${escapeHtml(error.message)}</p>`;
  } finally {
    button.disabled = false;
  }
});

renderSalesRankings(null);
renderPreview();
