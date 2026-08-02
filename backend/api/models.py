from django.db import models

class UserPreference(models.Model):
    # For now, we can use a simple CharField for user ID or session ID
    user_id = models.CharField(max_length=255, unique=True)
    preferences = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Preferences for {self.user_id}"
