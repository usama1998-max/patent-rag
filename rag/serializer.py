from rest_framework import serializers
from .models import UploadedFile, Project
from django.core.exceptions import ObjectDoesNotExist

class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ['project_name', 'unique_id', 'created_at']


class UploadedFileSerializer(serializers.ModelSerializer):
    file = serializers.FileField(required=True)
    # project_id = ProjectSerializer(required=False)

    class Meta:
        model = UploadedFile
        fields = ["unique_id", "file", "uploaded_at", "project_id"]

    def validate_file(self, value):
        if not value.name.endswith((".txt")):
            raise serializers.ValidationError("Only TXT files are allowed.")
        return value




class ChatConsumerSerializer(serializers.Serializer):
    unique_id = serializers.UUIDField()
    chat_history = serializers.ListSerializer(child=serializers.DictField(),  required=False)
    user_prompt = serializers.CharField(max_length=None,
                                        required=False,
                                        allow_blank=True)
    model = serializers.CharField(max_length=50, required=True)

    def validate(self, data):
        """Ensure at least one of `chat_history` or `user_prompt` is provided."""
        if not data.get("chat_history") and not data.get("user_prompt"):
            raise serializers.ValidationError("Either chat_history or user_prompt must be provided.")
        return data

class UniqueIdSerializer(serializers.Serializer):
    unique_id = serializers.UUIDField()

    def validate(self, data):
        """Ensure at least one of `chat_history` or `user_prompt` is provided."""
        if not data.get("unique_id"):
            raise serializers.ValidationError("unique_id must be provided.")
        return data

