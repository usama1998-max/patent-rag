import os
from django.db.models.signals import post_delete, pre_delete
from django.dispatch import receiver
from .models import UploadedFile
import logging

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


@receiver(pre_delete, sender=UploadedFile)
def remove_media_file(sender, instance, **kwargs):
     if instance.file:  
        instance.file.delete(save=False)  # Deletes from S3
