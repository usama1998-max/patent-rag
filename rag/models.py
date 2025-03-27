import uuid
from django.db import models
from storages.backends.s3boto3 import S3Boto3Storage

class Project(models.Model):
    project_name = models.CharField(max_length=100)
    unique_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    instruction = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.project_name

# Create your models here.
class UploadedFile(models.Model):
    unique_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    file = models.FileField(storage=S3Boto3Storage())
    uploaded_at = models.DateTimeField(auto_now_add=True)
    project_id = models.ForeignKey(Project, to_field='unique_id', related_name="project", on_delete=models.CASCADE)

    def __str__(self):
        return self.file.name
