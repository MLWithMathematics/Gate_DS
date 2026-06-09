import asyncio
import uuid
import json
from fastapi import WebSocket
from typing import Dict, List, Optional
import logging
from app.services.db.supabase_service import get_mcqs

logger = logging.getLogger(__name__)

class BattleRoom:
    def __init__(self, room_id: str):
        self.room_id = room_id
        self.players: Dict[str, WebSocket] = {}
        self.player_names: Dict[str, str] = {}
        self.scores: Dict[str, int] = {}
        self.status = "waiting"  # waiting, playing, finished
        self.mcqs = []
        self.current_q_index = 0
        self.task: Optional[asyncio.Task] = None

    async def broadcast(self, message: dict):
        for ws in self.players.values():
            try:
                await ws.send_json(message)
            except Exception as e:
                logger.error(f"Failed to send to a player: {e}")

class ConnectionManager:
    def __init__(self):
        self.rooms: Dict[str, BattleRoom] = {}
        self.user_to_room: Dict[str, str] = {}

    async def connect(self, websocket: WebSocket, user_id: str, user_name: str):
        await websocket.accept()
        
        # Find a waiting room
        waiting_room = None
        for room in self.rooms.values():
            if room.status == "waiting" and len(room.players) < 2:
                waiting_room = room
                break

        if not waiting_room:
            # Create new room
            room_id = str(uuid.uuid4())
            waiting_room = BattleRoom(room_id)
            self.rooms[room_id] = waiting_room
        
        waiting_room.players[user_id] = websocket
        waiting_room.player_names[user_id] = user_name
        waiting_room.scores[user_id] = 0
        self.user_to_room[user_id] = waiting_room.room_id

        await waiting_room.broadcast({
            "type": "room_state",
            "status": waiting_room.status,
            "players": waiting_room.player_names
        })

        if len(waiting_room.players) == 2:
            await self.start_game(waiting_room)

    async def disconnect(self, user_id: str):
        room_id = self.user_to_room.get(user_id)
        if room_id and room_id in self.rooms:
            room = self.rooms[room_id]
            if user_id in room.players:
                del room.players[user_id]
                del room.player_names[user_id]
                del room.scores[user_id]
            del self.user_to_room[user_id]
            
            if len(room.players) == 0:
                if room.task:
                    room.task.cancel()
                del self.rooms[room_id]
            else:
                # Other player wins by default
                room.status = "finished"
                await room.broadcast({
                    "type": "game_over",
                    "reason": "Opponent disconnected",
                    "scores": room.scores
                })
                if room.task:
                    room.task.cancel()

    async def start_game(self, room: BattleRoom):
        room.status = "playing"
        room.mcqs = await get_mcqs(limit=5) # simple random 5
        room.current_q_index = 0
        
        await room.broadcast({
            "type": "game_start",
            "players": room.player_names
        })
        
        # Start game loop
        room.task = asyncio.create_task(self.game_loop(room))

    async def game_loop(self, room: BattleRoom):
        try:
            for i, mcq in enumerate(room.mcqs):
                room.current_q_index = i
                
                # Send question
                question_payload = {
                    "type": "question",
                    "index": i + 1,
                    "total": len(room.mcqs),
                    "mcq": {
                        "id": mcq["id"],
                        "subject": mcq["subject"],
                        "topic": mcq["topic"],
                        "question": mcq["question"],
                        "options": mcq["options"]
                    },
                    "time_limit": 15
                }
                await room.broadcast(question_payload)
                
                # Wait for 15 seconds
                await asyncio.sleep(15)
                
                # Send correct answer
                await room.broadcast({
                    "type": "answer_reveal",
                    "mcq_id": mcq["id"],
                    "correct_answer": mcq["answer"],
                    "scores": room.scores
                })
                
                await asyncio.sleep(3) # pause before next question
            
            # Game over
            room.status = "finished"
            await room.broadcast({
                "type": "game_over",
                "scores": room.scores
            })
            
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Error in game loop: {e}")

    async def handle_answer(self, user_id: str, mcq_id: str, answer: str):
        room_id = self.user_to_room.get(user_id)
        if not room_id or room_id not in self.rooms:
            return
            
        room = self.rooms[room_id]
        if room.status != "playing":
            return
            
        current_mcq = room.mcqs[room.current_q_index]
        if current_mcq["id"] == mcq_id:
            if current_mcq["answer"] == answer:
                # Add score based on speed? For simplicity, just 10 points.
                room.scores[user_id] += 10
            
            # Broadcast updated scores instantly or wait? Just update scores.
            await room.broadcast({
                "type": "score_update",
                "scores": room.scores
            })

manager = ConnectionManager()
