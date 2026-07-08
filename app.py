import os
from typing import List
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from langchain_ollama import ChatOllama
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
import uvicorn
import json

app = FastAPI(title="Notion 3D Chat")

class Message(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str

class ChatRequest(BaseModel):
    message: str
    history: List[Message] = []
    model: str = "gemma3:1b"

@app.get("/")
def read_root():
    return FileResponse("static/index.html")

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    try:
        # Initialize the local Ollama LLM
        llm = ChatOllama(model=request.model)

        # Build message history for LangChain
        messages = []
        
        # Add system prompt for Notion-style minimal clean assistant
        messages.append(SystemMessage(content=(
            "You are a helpful, minimalist, and clear AI assistant. "
            "Keep formatting clean, using Markdown list items, bold text, and code blocks where appropriate, similar to Notion notes. "
            "Keep responses precise, clear, and direct."
        )))

        for msg in request.history:
            if msg.role == "user":
                messages.append(HumanMessage(content=msg.content))
            elif msg.role == "assistant":
                messages.append(AIMessage(content=msg.content))

        # Add the current user prompt
        messages.append(HumanMessage(content=request.message))

        async def event_generator():
            try:
                # Stream the response chunk by chunk using astream
                async for chunk in llm.astream(messages):
                    yield f"data: {json.dumps({'text': chunk.content})}\n\n"
                yield "data: [DONE]\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"

        return StreamingResponse(event_generator(), media_type="text/event-stream")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Mount the static directory for CSS, JS and assets
# Ensure static folder is created before starting the app
if not os.path.exists("static"):
    os.makedirs("static")

app.mount("/static", StaticFiles(directory="static"), name="static")

if __name__ == "__main__":
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
