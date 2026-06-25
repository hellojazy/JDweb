# 京东补货单生成器

把京东后台导出的库存表转换为两个补货 Excel：

- 手工作业单：按分仓库存、采购在途、14 日销售和周转周期计算分仓补货量。
- 京东入 B 仓：按分仓补货差额、分仓日销、B 仓库存和 B 仓周转周期计算工厂入 B 仓数量。

程序还包含商品管理、生成历史、表格预览、下载、库存不足预警和滞销分仓预警。

## 页面入口

- `/`：补货生成。
- `/products`：商品管理。
- `/history`：生成历史。
- `/static/templates/库存导入模板.xlsx`：库存导入空模板。
- `/static/templates/商品导入模板.xlsx`：商品导入空模板。
- `/static/docs/操作说明.md`：前台操作说明。

前台不展示程序使用文档入口，程序说明和部署方法以本 README 为准。

## 运行依赖

- Python 3.12 或兼容版本。
- FastAPI。
- Uvicorn。
- openpyxl。
- SQLite，使用 Python 内置 `sqlite3`。

程序运行和补货计算不依赖根目录业务 Excel。计算只依赖：

- 上传的库存 Excel。
- SQLite 商品库。
- 前台填写的热销阈值和周转周期参数。

生成的手工作业单和京东入 B 仓 Excel 由程序直接创建，不再套用根目录 Excel 范本。

## 数据文件

- `jd_replenishment.sqlite3`：本地 SQLite 数据库，已被 `.gitignore` 忽略，不提交到 Gitea。
- `uploads/`：上传文件目录，已忽略。
- `outputs/`：生成结果目录，已忽略。
- `static/templates/*.xlsx`：可公开下载的空白导入模板，只保留表头，可提交。

## 商品管理

商品数据从 `/products` 页面导入。

导入规则：

- `商品SKU` 是唯一 ID。
- 每次导入都以本次表格为准。
- 表格中已有 SKU 会覆盖更新。
- 表格中新 SKU 会新增。
- 商品库中存在、但本次表格不存在的 SKU 会删除。

补货计算主要使用：

- `商品SKU`
- `商品名称`
- `外箱箱规(X件/箱)`

## 库存导入核心字段

库存表需要包含以下核心字段：

- `SKU`
- `商品名称`
- `供应商简称`
- `RDC`
- `配送中心`
- `可订购库存`
- `采购在途数量`
- `近14日出库商品件数`
- `14日有货天数`

配送中心为 `全国` 的行不生成分仓补货，仅用于热销判断和汇总参考。

## 计算逻辑

### 热销品判断

```text
SKU 近14日销量 > 前台设置阈值
```

默认阈值为 `1000`。

优先使用配送中心为 `全国` 的 14 日销量；没有全国行时，按分仓销量汇总。

### 分仓补货

```text
补货量 = ROUNDUP((日销 * 对应周转周期 - 分仓可订购库存 - 分仓采购在途数量) / 箱规) * 箱规
```

- 热销品使用热销品周转周期，默认 `30` 天。
- 普通品使用普通品周转周期，默认 `25` 天。
- 配送中心为 `全国` 的数据不生成分仓补货行。
- 配送中心为 B 仓的数据不生成分仓补货行。

### B 仓入库

```text
入库量 = ROUNDUP((分仓补货差额 + 分仓日销合计 * B仓周转周期 - B仓本仓库存 - B仓采购在途数量) / 箱规) * 箱规
```

- B 仓默认配送中心为 `成都补货B`。
- B 仓不销售，只作为调拨到分仓的库存池。
- B 仓周转周期默认 `14` 天。
- 周转周期已包含调货运输时间，不再单独计算调货周期。

## 预警逻辑

库存不够 14 天销售预警：

```text
可订购库存 / 日销 < 14
```

库存滞销分仓预警：

```text
分仓可订购库存 > 0 且 14天销售量 < 10
```

## 本地启动

在项目目录执行：

```powershell
python -m uvicorn app:app --host 127.0.0.1 --port 8001
```

如果使用本机 Nginx 对外提供 `8000` 端口，Nginx 反向代理到：

```text
http://127.0.0.1:8001
```

常用访问地址：

```text
http://127.0.0.1:8000/
http://192.168.0.200:8000/
```

## Nginx 部署方式

示例配置：

```nginx
server {
    listen 8000;
    server_name _;

    client_max_body_size 50m;

    location / {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

检查并重载：

```powershell
nginx -t
nginx -s reload
```

路由器端口映射时，外网 `8000` 映射到内网机器 `192.168.0.200:8000`。

## 更新到 Gitea

当前远程仓库：

```text
http://192.168.0.10:8418/admin/JDweb.git
```

提交并推送：

```powershell
git status --short
git add .
git commit -m "Update JD replenishment app"
git push origin main
```

注意不要提交：

- `jd_replenishment.sqlite3`
- `uploads/`
- `outputs/`
- 根目录业务 Excel
- 日志文件
- `node_modules/`

这些内容已在 `.gitignore` 中忽略。

## 生产部署建议

1. 从 Gitea 拉取代码到服务器或目标机器。
2. 安装 Python 依赖。
3. 用 Uvicorn 启动 `app:app`，监听 `127.0.0.1:8001`。
4. 用 Nginx 监听公网或局域网 `8000`，反向代理到 `127.0.0.1:8001`。
5. 持久化保留 `jd_replenishment.sqlite3`、`uploads/`、`outputs/`，不要随着代码更新覆盖。

Windows 可用计划任务、NSSM 或启动脚本托管 Uvicorn；Linux 可用 systemd 托管 Uvicorn。
