from django.conf import settings
import asyncio
import json
import logging
from django.core.exceptions import ValidationError, ObjectDoesNotExist
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
import google.generativeai as genai
import openai
import anthropic
from together import Together
# from .redis_client import redis_cloud
from . import serializer
from .models import UploadedFile, Project

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

genai.configure(api_key=settings.GEMINI_API_KEY)

gemini_client_flash = genai.GenerativeModel(settings.GEMINI_RAG_MODEL_FLASH)
gemini_client_pro = genai.GenerativeModel(settings.GEMINI_RAG_MODEL_PRO)

together_client = openai.OpenAI(
  api_key=settings.TOGETHER_API_KEY,
  base_url=settings.TOGETHER_API_BASE_URL,
)

openai.api_key = settings.OPENAI_API_KEY

alibaba_client = openai.OpenAI(
    api_key=settings.ALIBABA_API_KEY,
    base_url=settings.ALIBABA_BASE_URL,
)

claude_client = anthropic.Anthropic(
    api_key=settings.CLAUDE_API_KEY,
)

class ChatConsumer(AsyncWebsocketConsumer):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.default_prompt = """"""

    def get_file_url(self, unique_id):
        try:
            return UploadedFile.objects.get(unique_id=unique_id).file.url
        except ObjectDoesNotExist:
            logger.error(f"Object {unique_id} does not exist!")
            return None
        except Exception as e:
            logger.error(str(e))
            return None

    def get_project_instruction(self, unique_id):
        try:
            return Project.objects.get(unique_id=unique_id).instruction
        except ObjectDoesNotExist:
            logger.error(f"Object {unique_id} does not exist!")
            return None
        except Exception as e:
            logger.error(str(e))
            return None

    def system_prompt(self, query: str, context: str = "", chat_history: str = "", default_prompt: str = "") -> str:
        return f"""
        {default_prompt}

        You can use the following context to answer the question if relevant:
        {context}
        
        {chat_history}
        USER: {query}
        """

    async def together_lama_service(self, prompt: str):
        try:
            response = together_client.chat.completions.create(
                max_tokens=2040,
                model=settings.TOGETHER_LAMA_RAG_MODEL,
                messages=[{"role": "user", "content": prompt}],
                stream=True
            )

            for chunk in response:
                await asyncio.sleep(0.05)
                await self.send(json.dumps({"status": "streaming", "message": chunk.choices[0].delta.content}))

            await self.send(json.dumps({"status": "completed", "message": " <EOS>"}))
        except Exception as e:
            logger.error(str(e))
            await self.send(json.dumps({"status": 500, "error": "Something went wrong!"}))
            return

    async def together_deepseek_service(self, prompt: str):
        try:
            response = together_client.chat.completions.create(
                max_tokens=2040,
                temperature=0.3,
                model=settings.TOGETHER_DEEPSEEK_RAG_MODEL,
                messages=[{"role": "user", "content": prompt}],
                stream=True
            )

            for chunk in response:
                await asyncio.sleep(0.05)
                if len(chunk.choices) > 0:
                    await self.send(json.dumps({"status": "streaming", "message": chunk.choices[0].delta.content}))

            await self.send(json.dumps({"status": "completed", "message": " <EOS>"}))
        except Exception as e:
            logger.error(str(e))
            await self.send(json.dumps({"status": 500, "error": "Something went wrong!"}))
            return

    # async def gemini_service_flash(self, prompt: str):
    #     try:
    #         response_stream = gemini_client_flash.generate_content(prompt, stream=True)

    #         for chunk in response_stream:
    #             if chunk.text:
    #                 await asyncio.sleep(0.03)
    #                 await self.send(json.dumps({"status": "streaming", "message": chunk.text}))

    #         await self.send(json.dumps({"status": "completed", "message": ""}))
        
    #     except genai.types.GenerationError as e:  
            
    #         logger.error(str(e))
    #         await self.send(json.dumps({"status": 500, "error": "Gemini Generation Error!"}))
    #         return
        
    #     except genai.types.RateLimitError as e:  
            
    #         logger.error(str(e))
    #         await self.send(json.dumps({"status": 500, "error": "Gemini Rate Limit Exceeded!"}))
    #         return

    #     except genai.types.APIError as e:
    #         logger.error(str(e))
    #         await self.send(json.dumps({"status": 500, "error": "Gemini API Error!"}))
    #         return  
            
    #     except Exception as e:  
    #         logger.error(str(e))
    #         await self.send(json.dumps({"status": 500, "error": "Something went wrong with Gemini!"}))
    #         return


    async def gemini_service_pro(self, prompt: str):
        
        try:
            response_stream = gemini_client_pro.generate_content(prompt, stream=True, generation_config={"temperature": 0.3})

            for chunk in response_stream:
                if chunk.text:
                    await asyncio.sleep(0.03)
                    await self.send(json.dumps({"status": "streaming", "message": chunk.text}))

            await self.send(json.dumps({"status": "completed", "message": " <EOS>"}))
        
        except genai.types.GenerationError as e:  
            
            logger.error(str(e))
            await self.send(json.dumps({"status": 500, "error": "Gemini Generation Error!"}))
            return
        
        except genai.types.RateLimitError as e:  
            
            logger.error(str(e))
            await self.send(json.dumps({"status": 500, "error": "Gemini Rate Limit Exceeded!"}))
            return

        except genai.types.APIError as e:
            logger.error(str(e))
            await self.send(json.dumps({"status": 500, "error": "Gemini API Error!"}))
            return  
            
        except Exception as e:  
            logger.error(str(e))
            await self.send(json.dumps({"status": 500, "error": "Something went wrong with Gemini!"}))
            return

    async def openai_service(self, prompt: str):
        try:
            response = openai.chat.completions.create(
                model=settings.OPENAI_RAG_MODEL,
                # temperature=0.2,
                messages=[{"role": "user", "content": prompt}],
                stream=True
            )

            for chunk in response:
                if chunk.choices[0].delta.content is not None:
                    await asyncio.sleep(0.05)
                    await self.send(json.dumps({"status": "streaming", "message": chunk.choices[0].delta.content}))

            await self.send(json.dumps({"status": "completed", "message": " <EOS>"}))
        except Exception as e:
            logger.error(str(e))
            await self.send(json.dumps({"status": 500, "error": "Something went wrong!"}))
            return

    async def alibaba_service(self, prompt: str):
        try:
            response = alibaba_client.chat.completions.create(
                max_tokens=2040,
                temperature=0.2,
                model=settings.ALIBABA_RAG_MODEL,
                messages=[{"role": "user", "content": prompt}],
                stream=True
            )

            for chunk in response:
                if chunk.choices[0].delta.content is not None:
                    await asyncio.sleep(0.05)
                    await self.send(json.dumps({"status": "streaming", "message": chunk.choices[0].delta.content}))

            await self.send(json.dumps({"status": "completed", "message": " <EOS>"}))
        except Exception as e:
            logger.error(str(e))
            await self.send(json.dumps({"status": 500, "error": "Something went wrong!"}))
            return

    async def claude_service(self, prompt: str):
        try:
            with claude_client.messages.stream(
                    max_tokens=2040,
                    temperature=0.3,
                    messages=[{"role": "user", "content": prompt}],
                    model=settings.CLAUDE_RAG_MODEL,
            ) as stream:
                for text in stream.text_stream:
                    if self.stop_streaming is True:
                        await self.send(json.dumps({"status": "completed", "message": ""}))
                        break
                    else:
                        await asyncio.sleep(0.05)
                        await self.send(json.dumps({"status": "streaming", "message": text}))

            await self.send(json.dumps({"status": "completed", "message": " <EOS>"}))
        except anthropic.APIError as e:
            logger.error(f"API Error: {e}")
            await self.send(json.dumps({"status": 500, "error": "Anthropic API Error!"}))
            return

        except anthropic.AuthenticationError as e:
            logger.error(f"Authentication Error: {e}")
            await self.send(json.dumps({"status": 500, "error": "Anthropic Authentication Error!"}))
            return

        except anthropic.PermissionError as e:
            logger.error(f"Permission Error: {e}")
            await self.send(json.dumps({"status": 500, "error": "Anthropic Permisson Denied!"}))
            return

        except anthropic.RateLimitError as e:
            logger.error(f"Rate Limit Exceeded: {e}")
            await self.send(json.dumps({"status": 500, "error": "Anthropic Rate Limit Exceeded!"}))
            return
        
        except anthropic.InternalServerError as e:
            logger.error(f"Server Error: {e}")
            await self.send(json.dumps({"status": 500, "error": "Anthropic Internal Server Error!"}))
            return
        
        except Exception as e:
            logger.error(f"Unexpected Error: {e}")
            await self.send(json.dumps({"status": 500, "error": "Something went wrong with Claude!"}))
            return

    async def run_model(self, key, prompt: str):
        model_functions = {
            "gemini-2.5-pro": self.gemini_service_pro,
            # "gemini-2.0-flash-001": self.gemini_service_flash,
            "lama-405": self.together_lama_service,
            "deepseek-R1": self.together_deepseek_service,
            "o3-mini": self.openai_service,
            "claude-sonnet3": self.claude_service,
            "qwen-plus": self.alibaba_service
        }

        func = model_functions.get(key)
        if func:
            await func(prompt=prompt)  # Call the function with the parameter
        else:
            print("Invalid key:", key)

    async def connect(self):
        await self.accept()
        logger.info("WS: Connected to chat...")
        self.stop_streaming = False

        # self.room_name = self.scope['url_route']['kwargs']['room_name']
        # self.room_group_name = 'chat_%s' % self.room_name
        # print(self.scope)

    async def disconnect(self, close_code):
        logger.info("WS: Disconnected to chat...")
        self.stop_streaming = True
        # self.room_group_name = 'chat_%s' % self.room_name
        # print(self.scope)
        # print(close_code)

    async def receive(self, text_data=None, bytes_data=None):
        try:
            data = serializer.ChatConsumerSerializer(data=json.loads(text_data))

            if data.is_valid():
                instruction = await database_sync_to_async(self.get_project_instruction)(data.data['unique_id'])

                chat_format = ""
                for chat in data.data['chat_history']:
                    if chat['role'] == "user":
                        chat_format += f"USER: {chat['content']}\n"

                    if chat['role'] == "bot":
                        chat_format += f"AI: {chat['content']}\n"

                context = settings.REDIS_CLOUD.get(data.data['unique_id'])
                # print(context)

                prompt = self.system_prompt(data.data['user_prompt'], context, chat_format, instruction)

                await self.send(json.dumps({"status": "ready", "message": "<SOS> "}))
                await self.run_model(data.data['model'], prompt)

            else:
                logger.error(data.errors)

                if 'user_prompt' in data.errors:
                    response = {
                        "status": 500,
                        "error": data.errors
                    }
                else:
                    response = {
                        "status": 400,
                        "error": data.errors
                    }

                await self.send(text_data=json.dumps(response))
                return
        
        except ValidationError as ve:
            logger.error(str(ve))
            await self.send(json.dumps({"status": 500, "error": "Something went wrong!"}))
            return

        except Exception as e:
            logger.error(str(e))
            await self.send(json.dumps({"status": 500, "error": "Something went wrong!"}))
            return