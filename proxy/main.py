from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
import httpx
import base64
import json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MS_APP_URLS = {
    "dev":  "https://dapp.microshare.io/login",
    "prod": "https://app.microshare.io/login",
}
MS_API_URLS = {
    "dev":  "https://dapi.microshare.io",
    "prod": "https://api.microshare.io",
}


def _extract_token_from_play_session(cookie_value: str) -> str:
    """Decode PLAY_SESSION JWT and extract the access_token from the payload."""
    parts = cookie_value.split(".")
    if len(parts) < 2:
        raise ValueError("Unexpected PLAY_SESSION format")
    # Add padding if needed
    payload_b64 = parts[1] + "=" * (-len(parts[1]) % 4)
    payload = json.loads(base64.urlsafe_b64decode(payload_b64))
    token = payload.get("data", {}).get("access_token")
    if not token:
        raise ValueError("access_token not found in PLAY_SESSION payload")
    return token


@app.post("/login")
async def login(request: Request):
    body = await request.json()
    env = body.get("env", "prod")
    login_url = MS_APP_URLS.get(env, MS_APP_URLS["prod"])

    form_data = {
        "username": body["username"],
        "password": body["password"],
        "csrfToken": "x",
    }

    async with httpx.AsyncClient(follow_redirects=False) as client:
        resp = await client.post(login_url, data=form_data)

    play_session = resp.cookies.get("PLAY_SESSION")
    if not play_session:
        # Microshare rejected credentials — pass back a 401
        return Response(
            content=json.dumps({"error": "invalid_credentials", "error_description": "Login failed — check username and password"}),
            status_code=401,
            media_type="application/json",
        )

    try:
        access_token = _extract_token_from_play_session(play_session)
    except Exception as e:
        return Response(
            content=json.dumps({"error": "token_parse_error", "error_description": str(e)}),
            status_code=500,
            media_type="application/json",
        )

    return Response(
        content=json.dumps({"access_token": access_token, "token_type": "Bearer", "expires_in": 172800}),
        status_code=200,
        media_type="application/json",
    )


@app.get("/share/{rec_type:path}")
async def share(rec_type: str, request: Request):
    auth_header = request.headers.get("Authorization", "")
    env = request.headers.get("X-MS-Env", "prod")
    api_base = MS_API_URLS.get(env, MS_API_URLS["prod"])

    params = dict(request.query_params)

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{api_base}/share/{rec_type}",
            headers={"Authorization": auth_header},
            params=params,
            timeout=30.0,
        )
        return Response(
            content=resp.content,
            status_code=resp.status_code,
            media_type="application/json",
        )
