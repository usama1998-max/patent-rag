from django.urls import path, re_path
from . import views
from django.conf import settings
from django.conf.urls.static import static


urlpatterns = [
    # path('', views.home, name='index'),
    re_path(r"^(?!api/).*", views.home),

    # path('api/get-bucket/', views.get_bucket_list),

    path('api/add-document/', views.add_document),
    path('api/get-documents/<str:project_id>/', views.get_documents),
    path('api/remove-document/uuid/', views.remove_document_with_uuid),
    path('api/remove-document/all/', views.remove_all_documents),

    path('api/redis/set-file/', views.set_redis),
    path('api/redis/get-file/<str:project_id>/', views.get_redis),
    path('api/redis/reset-file/<str:project_id>/', views.reset_redis),

    path('api/knowledge-capacity/<str:project_id>/', views.get_knowledge_capacity),
    path('api/total-tokens/', views.get_total_tokens),
    path('api/instruction-tokens/<str:project_id>/', views.get_instruction_count),

    path('api/get-projects/', views.get_projects),
    path('api/add-project/', views.add_project),
    path('api/add-project-instruction/', views.set_instruction),
    path('api/get-project-instruction/<str:project_id>/', views.get_instruction),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)