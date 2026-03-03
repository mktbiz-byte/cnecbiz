"""카카오 AI 챗봇 스킬 서버 (FastAPI)"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from routers import kakao_skill, health
from config.settings import get_settings

app = FastAPI(
    title="CNEC Kakao Chatbot Skill Server",
    description="크넥 카카오톡 AI 챗봇 스킬 서버",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(kakao_skill.router)


if __name__ == "__main__":
    import uvicorn

    settings = get_settings()
    uvicorn.run("main:app", host=settings.host, port=settings.port, reload=True)
