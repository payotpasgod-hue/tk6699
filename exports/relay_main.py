import os
import httpx
from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse

app = FastAPI(title="OroPlay Relay", version="2.0.0")

UPSTREAM = os.getenv("UPSTREAM_API_BASE", "https://bs.sxvwlkohlv.com/api/v2").rstrip("/")
APP_CALLBACK_BASE = os.getenv("APP_CALLBACK_BASE", "https://0ca3629e-36b3-432f-94e1-e30e40ad07b9-00-2hgl3w95jkn57.janeway.replit.dev").rstrip("/")
TIMEOUT = float(os.getenv("PROXY_TIMEOUT", "60"))


@app.get("/")
async def root():
    return {"ok": True, "service": "oroplay-relay", "upstream": UPSTREAM}


@app.get("/health")
async def health():
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as c:
            r = await c.get(f"{UPSTREAM}/status")
        return {"ok": r.status_code == 200, "code": r.status_code}
    except Exception as e:
        return JSONResponse(status_code=500, content={"ok": False, "error": str(e)})


@app.api_route("/api/v2/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy(path: str, request: Request):
    body = await request.body()
    headers = {}
    for k in ("authorization", "content-type", "accept"):
        if k in request.headers:
            headers[k] = request.headers[k]

    url = f"{UPSTREAM}/{path}"
    qs = request.url.query
    if qs:
        url = f"{url}?{qs}"

    async with httpx.AsyncClient(timeout=TIMEOUT, follow_redirects=False) as c:
        r = await c.request(method=request.method, url=url, content=body if body else None, headers=headers)

    ct = r.headers.get("content-type", "application/json").split(";")[0]
    return Response(content=r.content, status_code=r.status_code, media_type=ct)


async def _forward_callback(request: Request, target: str) -> Response:
    body = await request.body()
    headers = {"Content-Type": request.headers.get("content-type", "application/json")}
    if "authorization" in request.headers:
        headers["Authorization"] = request.headers["authorization"]

    url = f"{APP_CALLBACK_BASE}/api{target}"

    async with httpx.AsyncClient(timeout=TIMEOUT, follow_redirects=False) as c:
        r = await c.post(url, content=body, headers=headers)

    ct = r.headers.get("content-type", "application/json").split(";")[0]
    return Response(content=r.content, status_code=r.status_code, media_type=ct)


@app.post("/api/balance")
async def cb_balance(request: Request):
    return await _forward_callback(request, "/balance")


@app.post("/api/transaction")
async def cb_transaction(request: Request):
    return await _forward_callback(request, "/transaction")


@app.post("/api/batch-transactions")
async def cb_batch(request: Request):
    return await _forward_callback(request, "/batch-transactions")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("relay_main:app", host="0.0.0.0", port=9000, reload=False)
