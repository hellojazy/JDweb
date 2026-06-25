from __future__ import annotations

from datetime import date

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from replenishment import (
    DEFAULT_B_TURNOVER_DAYS,
    DEFAULT_HOT_SALES_THRESHOLD,
    DEFAULT_HOT_TURNOVER_DAYS,
    DEFAULT_NORMAL_TURNOVER_DAYS,
    OUTPUT_DIR,
    ROOT,
    generate_files,
    import_products_from_excel,
    list_generation_history,
    list_products,
    positive_int,
    read_generation_record,
    save_upload,
)


app = FastAPI(title="京东补货单生成器")
app.mount("/static", StaticFiles(directory=ROOT / "static"), name="static")


@app.get("/")
def home() -> FileResponse:
    return FileResponse(ROOT / "static" / "index.html")


@app.get("/products")
def products_page() -> FileResponse:
    return FileResponse(ROOT / "static" / "products.html")


@app.get("/history")
def history_page() -> FileResponse:
    return FileResponse(ROOT / "static" / "history.html")


@app.post("/api/generate")
async def generate(
    inventory: UploadFile = File(...),
    run_date: str = Form(default_factory=lambda: date.today().isoformat()),
    hot_turnover_days: str = Form(default=str(DEFAULT_HOT_TURNOVER_DAYS)),
    normal_turnover_days: str = Form(default=str(DEFAULT_NORMAL_TURNOVER_DAYS)),
    b_turnover_days: str = Form(default=str(DEFAULT_B_TURNOVER_DAYS)),
    hot_sales_threshold: str = Form(default=str(DEFAULT_HOT_SALES_THRESHOLD)),
):
    if not inventory.filename or not inventory.filename.lower().endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="请上传 .xlsx 库存文件")

    try:
        parsed_date = date.fromisoformat(run_date)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="日期格式应为 YYYY-MM-DD") from exc

    content = await inventory.read()
    upload_path = save_upload(inventory.filename, content)

    try:
        return generate_files(
            upload_path,
            parsed_date,
            hot_turnover_days=positive_int(hot_turnover_days, DEFAULT_HOT_TURNOVER_DAYS),
            normal_turnover_days=positive_int(normal_turnover_days, DEFAULT_NORMAL_TURNOVER_DAYS),
            b_turnover_days=positive_int(b_turnover_days, DEFAULT_B_TURNOVER_DAYS),
            hot_sales_threshold=positive_int(hot_sales_threshold, DEFAULT_HOT_SALES_THRESHOLD),
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/products")
def products():
    return list_products()


@app.post("/api/products/import")
async def import_products(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="请上传 .xlsx 商品表")
    upload_path = save_upload(file.filename, await file.read())
    try:
        return import_products_from_excel(upload_path)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/history")
def history():
    return {"records": list_generation_history()}


@app.get("/api/history/{run_id}")
def history_detail(run_id: str):
    try:
        return read_generation_record(run_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="历史记录不存在") from exc


@app.get("/download/{run_id}/{filename}")
def download(run_id: str, filename: str) -> FileResponse:
    file_path = (OUTPUT_DIR / run_id / filename).resolve()
    output_root = OUTPUT_DIR.resolve()
    if output_root not in file_path.parents or not file_path.exists():
        raise HTTPException(status_code=404, detail="文件不存在")
    return FileResponse(file_path, filename=filename)
