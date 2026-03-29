
#!/usr/bin/env python3
"""OroPlay Relay Proxy for Ubuntu 22.04+ / Python 3.10+"""

import os
import logging
from typing import Dict

import httpx
from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("oroplay-relay")

app = FastAPI(title="OroPlay Relay", version="2.0.0")

UPSTREAM: str = os.getenv("UPSTREAM_API_BASE", "https://bs.sxvwlkohlv.com/api/v2").rstrip("/")
APP_CALLBACK_BASE: str = os.getenv(
    "APP_CALLBACK_BASE",
    "https://0ca3629e-36b3-432f-94e1-e30e40ad07b9-00-2hgl3w95jkn57.janeway.replit.dev",
).rstrip("/")
TIMEOUT: float = float(os.getenv("PROXY_TIMEOUT", "60"))
PORT: int = int(os.getenv("RELAY_PORT", "9000"))


log.info("OroPlay Relay configured")
log.info("  Upstream : %s", UPSTREAM)
log.info("  Callback : %s", APP_CALLBACK_BASE)
log.info("  Port     : %d", PORT)


@app.get("/")
async def root() -> Dict:
    return {"ok": True, "service": "oroplay-relay", "upstream": UPSTREAM}

@app.get("/health")
async def health() -> Response:
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as c:
            r = await c.get(f"{UPSTREAM}/status")
        return JSONResponse(content={"ok": r.status_code == 200, "code": r.status_code})
    except Exception as e:
        log.error("Health check failed: %s", e)
        return JSONResponse(status_code=500, content={"ok": False, "error": str(e)})


@app.api_route("/api/v2/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy(path: str, request: Request) -> Response:
    body: bytes = await request.body()
    headers: Dict[str, str] = {}
    for k in ("authorization", "content-type", "accept"):
        if k in request.headers:
            headers[k] = request.headers[k]

    url: str = f"{UPSTREAM}/{path}"
    qs: str = request.url.query or ""
    if qs:
        url = f"{url}?{qs}"

    log.info("PROXY %s %s", request.method, url)

    async with httpx.AsyncClient(timeout=TIMEOUT, follow_redirects=False) as c:
        r = await c.request(
            method=request.method,
            url=url,
            content=body if body else None,
            headers=headers,
        )

    ct: str = r.headers.get("content-type", "application/json").split(";")[0]
    log.info("PROXY response %d (%d bytes)", r.status_code, len(r.content))
    return Response(content=r.content, status_code=r.status_code, media_type=ct)


async def _forward_callback(request: Request, target: str) -> Response:
    body: bytes = await request.body()
    headers: Dict[str, str] = {
        "Content-Type": request.headers.get("content-type", "application/json"),
    }
    if "authorization" in request.headers:
        headers["Authorization"] = request.headers["authorization"]

    url: str = f"{APP_CALLBACK_BASE}/api{target}"
    log.info("CALLBACK -> %s (%d bytes)", url, len(body))

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT, follow_redirects=False) as c:
            r = await c.post(url, content=body, headers=headers)
        ct: str = r.headers.get("content-type", "application/json").split(";")[0]
        log.info("CALLBACK response %d", r.status_code)
        return Response(content=r.content, status_code=r.status_code, media_type=ct)
    except Exception as e:
        log.error("CALLBACK failed: %s", e)
        return JSONResponse(
            status_code=502,
            content={"success": False, "error": f"Callback forward failed: {e}"},
        )


@app.post("/api/balance")
async def cb_balance(request: Request) -> Response:
    return await _forward_callback(request, "/balance")


@app.post("/api/transaction")
async def cb_transaction(request: Request) -> Response:
    return await _forward_callback(request, "/transaction")


@app.post("/api/batch-transactions")
async def cb_batch(request: Request) -> Response:
    return await _forward_callback(request, "/batch-transactions")


if __name__ == "__main__":
    import uvicorn
    import pathlib

    filename = pathlib.Path(__file__).stem
    uvicorn.run(
        f"{filename}:app",
        host="0.0.0.0",
        port=PORT,
        reload=False,
        log_level="info",
    )
