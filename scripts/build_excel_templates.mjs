import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const rootDir = path.resolve(".");
const templateDir = path.join(rootDir, "static", "templates");
await fs.mkdir(templateDir, { recursive: true });

const templates = [
  {
    fileName: "库存导入模板.xlsx",
    sheetName: "库存导入模板",
    widths: [14, 28, 18, 14, 18, 22, 14, 12, 18, 12, 14, 12, 12, 12, 12, 14, 16, 18, 14, 14],
    headers: [
      "时间",
      "商品名称",
      "SKU",
      "品牌",
      "供应商简称",
      "供应商名称",
      "是否售完即止",
      "RDC",
      "配送中心",
      "全国采购价",
      "销售员名称",
      "是否新品",
      "现货库存",
      "内配在途",
      "可订购库存",
      "采购在途数量",
      "近7日出库商品件数",
      "近14日出库商品件数",
      "7日有货天数",
      "14日有货天数",
    ],
  },
  {
    fileName: "商品导入模板.xlsx",
    sheetName: "商品导入模板",
    widths: [18, 34, 14, 18, 18, 18, 14, 14, 18, 18, 14],
    headers: [
      "商品SKU",
      "商品名称",
      "品牌",
      "一二分类",
      "二级分类",
      "三级分类",
      "采控员",
      "采购员",
      "包装方案",
      "外箱箱规(X件/箱)",
      "是否畅销品",
    ],
  },
];

function columnName(index) {
  let name = "";
  let n = index + 1;
  while (n > 0) {
    const remainder = (n - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

async function buildTemplate({ fileName, sheetName, headers, widths }) {
  const workbook = Workbook.create();
  const sheet = workbook.worksheets.add(sheetName);
  const lastCol = columnName(headers.length - 1);

  sheet.showGridLines = false;
  sheet.getRange(`A1:${lastCol}1`).values = [headers];
  sheet.freezePanes.freezeRows(1);

  const headerRange = sheet.getRange(`A1:${lastCol}1`);
  headerRange.format = {
    fill: "#126F68",
    font: { bold: true, color: "#FFFFFF" },
    wrapText: false,
    horizontalAlignment: "center",
    verticalAlignment: "center",
    borders: { preset: "all", style: "thin", color: "#DCE5E4" },
  };
  headerRange.format.rowHeight = 26;

  headers.forEach((_, index) => {
    const col = columnName(index);
    const columnRange = sheet.getRange(`${col}:${col}`);
    columnRange.format.columnWidth = widths[index] ?? 14;
    columnRange.format.wrapText = false;
    columnRange.format.numberFormat = index === 0 && fileName.includes("库存") ? "yyyy-mm-dd" : "@";
  });

  const xlsx = await SpreadsheetFile.exportXlsx(workbook);
  const outputPath = path.join(templateDir, fileName);
  await xlsx.save(outputPath);
  return outputPath;
}

for (const template of templates) {
  const outputPath = await buildTemplate(template);
  console.log(outputPath);
}
