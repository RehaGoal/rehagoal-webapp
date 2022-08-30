from django.contrib.auth.models import User
user=User.objects.create_user('testuser', password='e2e_test-rehagoal')
user.is_superuser=False
user.is_staff=False
user.save()