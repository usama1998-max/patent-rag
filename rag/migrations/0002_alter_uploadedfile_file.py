# Generated by Django 5.1.5 on 2025-03-10 15:09

import storages.backends.s3
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('rag', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='uploadedfile',
            name='file',
            field=models.FileField(storage=storages.backends.s3.S3Storage(), upload_to=''),
        ),
    ]
