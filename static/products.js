const form = document.querySelector("#productImportForm");
const fileInput = document.querySelector("#productFile");
const fileLabel = document.querySelector("#fileLabel");
const statusPill = document.querySelector("#statusPill");
const productHead = document.querySelector("#productHead");
const productBody = document.querySelector("#productBody");
const productMeta = document.querySelector("#productMeta");
const productSearch = document.querySelector("#productSearch");
const refreshProducts = document.querySelector("#refreshProducts");

let products = [];
let headers = [];

function setStatus(text) {
  statusPill.textContent = text;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function rowText(row) {
  return row.values.map((value) => String(value ?? "")).join(" ").toLowerCase();
}

function renderProducts() {
  const keyword = productSearch.value.trim().toLowerCase();
  const rows = keyword ? products.filter((row) => rowText(row).includes(keyword)) : products;
  productHead.innerHTML = `<tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>`;
  productBody.innerHTML = "";
  if (!rows.length) {
    productBody.innerHTML = `<tr><td colspan="${Math.max(headers.length, 1)}" class="placeholder">没有匹配商品</td></tr>`;
    return;
  }
  for (const row of rows) {
    const tr = document.createElement("tr");
    tr.innerHTML = row.values.map((value) => `<td>${escapeHtml(value)}</td>`).join("");
    productBody.append(tr);
  }
  productMeta.textContent = `共 ${products.length} 个商品，当前显示 ${rows.length} 个`;
}

async function loadProducts() {
  setStatus("正在读取");
  const response = await fetch("/api/products");
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.detail || "读取商品失败");
  headers = payload.headers;
  products = payload.rows;
  renderProducts();
  setStatus("商品表就绪");
}

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  fileLabel.textContent = file ? file.name : "选择或拖入商品箱规表";
});

productSearch.addEventListener("input", renderProducts);
refreshProducts.addEventListener("click", () => {
  loadProducts().catch((error) => {
    setStatus("读取失败");
    productMeta.textContent = error.message;
  });
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!fileInput.files[0]) return;
  const button = form.querySelector("button");
  button.disabled = true;
  setStatus("正在导入");
  try {
    const data = new FormData(form);
    const response = await fetch("/api/products/import", { method: "POST", body: data });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.detail || "导入失败");
    headers = payload.products.headers;
    products = payload.products.rows;
    renderProducts();
    productMeta.textContent = `新增 ${payload.created}，更新 ${payload.updated}，删除 ${payload.deleted}，跳过 ${payload.skipped}，当前 ${payload.total} 个商品`;
    setStatus("导入完成");
  } catch (error) {
    setStatus("导入失败");
    productMeta.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

loadProducts().catch((error) => {
  setStatus("读取失败");
  productMeta.textContent = error.message;
});
