from django.conf import settings
from django.shortcuts import render
from django.core.exceptions import ValidationError, ObjectDoesNotExist, FieldDoesNotExist
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.decorators import parser_classes
from django.core.files.storage import default_storage
# from .redis_client import redis_cloud
from . import serializer
from .models import UploadedFile, Project
import logging
import tiktoken
import json
import boto3
# from .backup import AWSBackup

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

boto3.set_stream_logger('boto3', logging.DEBUG)

def estimate_token_count(text) -> int:
    if text is None:
        return 0

    encoding = tiktoken.get_encoding("cl100k_base")  # Change model name if needed
    return len(encoding.encode(text))


def home(request):
    return render(request, 'index.html')


# @api_view(['GET'])
# def get_bucket_list(request):
#     bucket = aws.get_bucket_list()
#     return Response({'message': bucket}, status=status.HTTP_200_OK)


@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
def add_document(request):
    try:
        file_serializer = serializer.UploadedFileSerializer(data=request.data)

        if file_serializer.is_valid():
            file_serializer.save()
            return Response({'message': 'Document added successfully'}, status=status.HTTP_200_OK)

        if 'file' in file_serializer.errors:
            logger.error(file_serializer.errors.get('file')[0])
            return Response({'error': file_serializer.errors.get('file')[0]}, status=status.HTTP_400_BAD_REQUEST)

        elif 'error' in file_serializer.errors:
            logger.error(file_serializer.errors.get('error')[0])
            return Response({'error': file_serializer.errors.get('file')[0]}, status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response({'error': file_serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        logger.error(str(e))
        return Response({'error': 'Something went wrong!'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['DELETE'])
def remove_document_with_uuid(request):
    try:
        obj = UploadedFile.objects.get(unique_id=request.data['unique_id'])
        obj.delete()
        return Response({'message': 'Document removed successfully'}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def get_documents(request, project_id=None):
    try:
        files = serializer.UploadedFile.objects.filter(project_id=project_id)
        files_serializer = serializer.UploadedFileSerializer(files, many=True).data

        file_names = list(map(lambda x: {
            "file": x["file"].split("/")[-1],
            "unique_id": x["unique_id"],  
            "uploaded_at": x["uploaded_at"], 
            "project_id": x['project_id']
            }, files_serializer))

        return Response({'message': file_names}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['DELETE'])
def remove_all_documents(request):
    try:
        data = json.loads(request.body)
        UploadedFile.objects.filter(project_id=data['project_id']).delete()
        settings.REDIS_CLOUD.set(data['project_id'], "")
        return Response({'message': 'All documents removed successfully'}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def set_redis(request):
    try:
        chat_serializer = serializer.UniqueIdSerializer(data=request.data)
        if chat_serializer.is_valid():
            files = UploadedFile.objects.filter(project_id=chat_serializer.data['unique_id'])

            corpus = ""

            for file in files:
                print(f"Reading: {file.file.name}")  # This should print the S3 key
                try:
                    with file.file.open(mode="r") as f:
                        corpus += f"""<FILE>FILENAME: {file.file.name.split('/')[-1]},\nCONTENT: {f.read()}</FILE>"""
                except Exception as e:
                    print(f"Error reading {file.file.name}: {e}")
                    return Response({'error': 'CAnnot read file!'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            settings.REDIS_CLOUD.set(chat_serializer.data['unique_id'], corpus)

            return Response({'message': 'Data saved to redis!'}, status=status.HTTP_200_OK)
        else:
            return Response({'error': chat_serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


    except FieldDoesNotExist:
        logger.error("No such file!")
        return Response({'error': 'No such file!'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    except ObjectDoesNotExist:
        logger.error("No such object!")
        return Response({'error': 'No such file!'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    except ValidationError as ve:
        logger.error(str(ve))
        return Response({'error': 'Something went wrong!'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    except Exception as e:
        logger.error(str(e))
        return Response({'error': 'Something went wrong!'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def get_redis(request, project_id):
    try:
        corpus = settings.REDIS_CLOUD.get(project_id)
        return Response({'message': corpus}, status=status.HTTP_200_OK)
    except ValidationError as ve:
        logger.error(str(ve))
        return Response({'error': 'Something went wrong!'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    except Exception as e:
        logger.error(str(e))
        return Response({'error': 'Something went wrong!'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['DELETE'])
def reset_redis(request, project_id):
    try:
        corpus = settings.REDIS_CLOUD.get(project_id)

        if corpus is None:
            return Response({'message': 'No data found'}, status=status.HTTP_200_OK)

        settings.REDIS_CLOUD.set(project_id, "")
        return Response({'message': f'redis reset for project {project_id}'}, status=status.HTTP_200_OK)
    except ValidationError as ve:
        logger.error(str(ve))
        return Response({'error': 'Something went wrong!'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    except Exception as e:
        logger.error(str(e))
        return Response({'error': 'Something went wrong!'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_projects(request):
    try:
        projects = serializer.Project.objects.all()
        projects_serializer = serializer.ProjectSerializer(projects, many=True).data

        return Response({'message': projects_serializer}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def add_project(request):
    try:
        project_serializer = serializer.ProjectSerializer(data=request.data)

        if project_serializer.is_valid():
            project_serializer.save()
            return Response({'message': 'Project added successfully'}, status=status.HTTP_200_OK)


        if 'error' in project_serializer.errors:
            logger.error(project_serializer.errors.get('error')[0])
            return Response({'error': project_serializer.errors.get('file')[0]}, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        logger.error(str(e))
        return Response({'error': 'Something went wrong!'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def set_instruction(request):
    try:
        project_id = request.data['project_id']
        instruction = request.data['instruction']
        project = Project.objects.get(unique_id=project_id)
        project.instruction = instruction
        project.save()
        return Response({'message': 'Instruction saved successfully'}, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(str(e))
        return Response({'error': 'Something went wrong!'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_instruction(request, project_id):
    try:
        project = Project.objects.get(unique_id=project_id)
        instruction_count = estimate_token_count(project.instruction)
        return Response({'message': project.instruction, 'token': instruction_count}, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(str(e))
        return Response({'error': 'Something went wrong!'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def get_instruction_count(request, project_id):
    try:
        project = Project.objects.get(unique_id=project_id)
        instruction_count = estimate_token_count(project.instruction)
        return Response({'message': instruction_count}, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(str(e))
        return Response({'error': 'Something went wrong!'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def get_knowledge_capacity(request, project_id):

    try:
        total_size = 128_000 # tokens
        corpus = settings.REDIS_CLOUD.get(project_id)
        project = Project.objects.get(unique_id=project_id)

        if corpus is None:
            return Response({'message': 0.0}, status=status.HTTP_200_OK)

        used_tokens = estimate_token_count(corpus)
        instruction_count = estimate_token_count(project.instruction)
        capacity_used = (used_tokens / total_size) * 100
        total = instruction_count + used_tokens

        return Response({'message': round(capacity_used, 2), 
                         'tokens': total, 
                         'instruction': instruction_count,
                         'knowledge': used_tokens}, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(str(e))
        return Response({'error': 'Something went wrong!'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def get_total_tokens(request):
    try:
        data = json.loads(request.body)
        total_size = 128_000 # tokens
        print("PROJECT ID: ", data['project_id'])
        corpus = settings.REDIS_CLOUD.get(data['project_id'])

        if corpus is None:
            return Response({'message': 0.0}, status=status.HTTP_200_OK)

        project = Project.objects.get(unique_id=data['project_id'])

        chat = " ".join([f"{chat['role']}: {chat['content']}\n" for chat in data['chats']])
        print(chat, end="\n\n")

        instruction_tokens = estimate_token_count(project.instruction)  
        print("INST: ", instruction_tokens)  
        chat_history_tokens = estimate_token_count(chat)
        print("CHT: ", chat_history_tokens)
        used_tokens = estimate_token_count(corpus)
        print("USED TOK: ", used_tokens)
        total = instruction_tokens + chat_history_tokens + used_tokens
        return Response({'message': total}, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(str(e))
        return Response({'error': 'Something went wrong!'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
