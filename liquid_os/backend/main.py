"""
Liquid OS - Backend Server
Феноменальная интерактивная система с реальным временем
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import asyncio
import json
import random
import time
from datetime import datetime
import uvicorn

app = FastAPI(title="Liquid OS API", version="1.0.0")

# CORS для фронтенда
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключение статических файлов (опционально)
# app.mount("/static", StaticFiles(directory="frontend"), name="static")

# ==================== МОДЕЛИ ДАННЫХ ====================

class User(BaseModel):
    id: str
    name: str
    avatar: str
    status: str = "online"
    last_seen: datetime = None
    
    class Config:
        arbitrary_types_allowed = True

class Message(BaseModel):
    id: str
    user_id: str
    content: str
    timestamp: datetime = None
    type: str = "text"
    reactions: List[str] = []
    
    class Config:
        arbitrary_types_allowed = True

class AppData(BaseModel):
    id: str
    name: str
    icon: str
    data: Dict[str, Any]
    last_updated: datetime = None
    
    class Config:
        arbitrary_types_allowed = True

class Notification(BaseModel):
    id: str
    title: str
    message: str
    type: str
    timestamp: datetime = None
    read: bool = False
    
    class Config:
        arbitrary_types_allowed = True

# ==================== БАЗА ДАННЫХ (In-Memory для скорости) ====================

class Database:
    def __init__(self):
        self.users: Dict[str, User] = {}
        self.messages: Dict[str, List[Message]] = {}  # chat_id -> messages
        self.apps: Dict[str, AppData] = {}
        self.notifications: Dict[str, List[Notification]] = {}
        self.active_connections: List[WebSocket] = []
        
        # Инициализация демо-данных
        self._init_demo_data()
    
    def _init_demo_data(self):
        # Демо пользователи
        for i in range(5):
            user_id = f"user_{i}"
            self.users[user_id] = User(
                id=user_id,
                name=f"User {i+1}",
                avatar=f"https://api.dicebear.com/7.x/avataaars/svg?seed={i}",
                status=random.choice(["online", "away", "busy"])
            )
        
        # Демо приложения
        app_templates = [
            {"id": "chat", "name": "Messages", "icon": "💬"},
            {"id": "music", "name": "Music", "icon": "🎵"},
            {"id": "photos", "name": "Photos", "icon": "📸"},
            {"id": "weather", "name": "Weather", "icon": "🌤️"},
            {"id": "notes", "name": "Notes", "icon": "📝"},
            {"id": "calendar", "name": "Calendar", "icon": "📅"},
            {"id": "tasks", "name": "Tasks", "icon": "✅"},
            {"id": "files", "name": "Files", "icon": "📁"},
        ]
        
        for template in app_templates:
            self.apps[template["id"]] = AppData(
                id=template["id"],
                name=template["name"],
                icon=template["icon"],
                data=self._generate_app_data(template["id"]),
                last_updated=datetime.now()
            )
    
    def _generate_app_data(self, app_id: str) -> Dict[str, Any]:
        """Генерация демо-данных для приложений"""
        if app_id == "chat":
            return {
                "chats": [
                    {"id": "chat_1", "name": "Alice", "last_message": "Hey! How are you?", "unread": 2},
                    {"id": "chat_2", "name": "Bob", "last_message": "See you tomorrow!", "unread": 0},
                ],
                "messages": []
            }
        elif app_id == "music":
            return {
                "playing": None,
                "playlist": [
                    {"id": "1", "title": "Midnight City", "artist": "M83", "duration": 243},
                    {"id": "2", "title": "Starboy", "artist": "The Weeknd", "duration": 230},
                    {"id": "3", "title": "Blinding Lights", "artist": "The Weeknd", "duration": 200},
                ],
                "recent": []
            }
        elif app_id == "weather":
            return {
                "current": {"temp": 22, "condition": "Sunny", "humidity": 65},
                "forecast": [
                    {"day": "Mon", "temp": 23, "condition": "Sunny"},
                    {"day": "Tue", "temp": 21, "condition": "Cloudy"},
                    {"day": "Wed", "temp": 19, "condition": "Rain"},
                ]
            }
        elif app_id == "notes":
            return {
                "notes": [
                    {"id": "1", "title": "Ideas", "content": "Build something amazing...", "created": datetime.now()},
                    {"id": "2", "title": "Shopping List", "content": "Milk, Eggs, Bread", "created": datetime.now()},
                ]
            }
        elif app_id == "tasks":
            return {
                "tasks": [
                    {"id": "1", "title": "Complete project", "done": False, "priority": "high"},
                    {"id": "2", "title": "Review code", "done": True, "priority": "medium"},
                    {"id": "3", "title": "Write documentation", "done": False, "priority": "low"},
                ]
            }
        else:
            return {}

db = Database()

# ==================== WEBSOCKET МЕНЕДЖЕР ====================

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        await self.broadcast({"type": "user_joined", "count": len(self.active_connections)})

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass

    async def send_personal(self, message: dict, websocket: WebSocket):
        await websocket.send_json(message)

manager = ConnectionManager()

# ==================== API ENDPOINTS ====================

@app.get("/")
async def root():
    return {"message": "Liquid OS API is running!", "version": "1.0.0"}

@app.get("/api/users")
async def get_users():
    return list(db.users.values())

@app.get("/api/apps")
async def get_apps():
    return list(db.apps.values())

@app.get("/api/app/{app_id}")
async def get_app(app_id: str):
    if app_id not in db.apps:
        raise HTTPException(status_code=404, detail="App not found")
    return db.apps[app_id]

@app.post("/api/app/{app_id}/update")
async def update_app(app_id: str, data: Dict[str, Any]):
    if app_id not in db.apps:
        raise HTTPException(status_code=404, detail="App not found")
    
    db.apps[app_id].data.update(data)
    db.apps[app_id].last_updated = datetime.now()
    
    await manager.broadcast({
        "type": "app_updated",
        "app_id": app_id,
        "data": data
    })
    
    return db.apps[app_id]

@app.get("/api/notifications")
async def get_notifications():
    return []

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Обработка входящих сообщений
            if message.get("type") == "interaction":
                await manager.broadcast({
                    "type": "interaction",
                    "client_id": client_id,
                    "action": message.get("action"),
                    "timestamp": datetime.now().isoformat()
                })
            
            elif message.get("type") == "app_action":
                app_id = message.get("app_id")
                action = message.get("action")
                
                if app_id in db.apps:
                    # Обновление данных приложения
                    if action == "toggle_task":
                        task_id = message.get("task_id")
                        for task in db.apps[app_id].data.get("tasks", []):
                            if task["id"] == task_id:
                                task["done"] = not task["done"]
                                break
                    
                    await manager.broadcast({
                        "type": "app_state_change",
                        "app_id": app_id,
                        "data": db.apps[app_id].data
                    })
            
            elif message.get("type") == "ping":
                await manager.send_personal({
                    "type": "pong",
                    "timestamp": datetime.now().isoformat()
                }, websocket)
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        await manager.broadcast({"type": "user_left", "client_id": client_id})

# ==================== ФОНОВЫЕ ЗАДАЧИ ====================

async def background_tasks():
    """Фоновые задачи для живой системы"""
    while True:
        await asyncio.sleep(5)
        
        # Случайные уведомления
        if random.random() < 0.3:
            notification_types = ["message", "reminder", "update", "achievement"]
            notif = Notification(
                id=f"notif_{int(time.time())}",
                title=random.choice(["New Message", "Reminder", "Update Available", "Achievement Unlocked"]),
                message=random.choice(["You have a new message!", "Time to take a break", "New version ready", "Great job!"]),
                type=random.choice(notification_types),
                timestamp=datetime.now()
            )
            
            await manager.broadcast({
                "type": "new_notification",
                "notification": notif.dict()
            })
        
        # Обновление погоды
        if "weather" in db.apps:
            weather_data = db.apps["weather"].data
            weather_data["current"]["temp"] = 20 + random.randint(-3, 3)
            await manager.broadcast({
                "type": "app_updated",
                "app_id": "weather",
                "data": {"current": weather_data["current"]}
            })

# ==================== ЗАПУСК ====================

if __name__ == "__main__":
    # Запуск фоновых задач
    loop = asyncio.new_event_loop()
    loop.create_task(background_tasks())
    
    uvicorn.run(app, host="0.0.0.0", port=8000)
