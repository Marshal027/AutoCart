from django.db import models
from django.db.models import Q


class LinqMessage(models.Model):
    text = models.TextField()
    from_number = models.CharField(max_length=50, blank=True)
    chat_id = models.CharField(max_length=200, blank=True)
    provider_message_id = models.CharField(max_length=200, blank=True, null=True, unique=True)
    reply_text = models.TextField(blank=True)
    reply_sent = models.BooleanField(default=False)
    is_valid_list = models.BooleanField(default=False)
    is_processed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Message from {self.from_number or 'unknown'} - {self.text[:30]}"


class PriceTrackerItem(models.Model):
    owner_number = models.CharField(max_length=50)
    product_id = models.CharField(max_length=255, blank=True, null=True)
    product_name = models.CharField(max_length=255)
    brand = models.CharField(max_length=255, blank=True)
    variant = models.CharField(max_length=255, blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    merchant = models.CharField(max_length=255, blank=True)
    availability = models.CharField(max_length=255, blank=True)
    image_url = models.URLField(blank=True)
    product_url = models.URLField(blank=True)
    source_mcp = models.CharField(max_length=255, blank=True)
    price_change = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    last_updated = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["owner_number", "product_id"],
                name="unique_price_tracker_product_per_owner",
                condition=Q(product_id__isnull=False),
            ),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.owner_number}: {self.product_name}"


class WatchlistItem(models.Model):
    owner_number = models.CharField(max_length=50)
    product_id = models.CharField(max_length=255)
    product_name = models.CharField(max_length=255)
    brand = models.CharField(max_length=255, blank=True)
    variant = models.CharField(max_length=255, blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    merchant = models.CharField(max_length=255, blank=True)
    availability = models.CharField(max_length=255, blank=True)
    image_url = models.URLField(blank=True)
    product_url = models.URLField(blank=True)
    source = models.CharField(max_length=255, blank=True)
    price_change = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    last_updated = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["owner_number", "product_id"],
                name="unique_watchlist_product_per_owner",
            ),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.owner_number}: {self.product_name}"


class LinqConversationState(models.Model):
    owner_number = models.CharField(max_length=50, unique=True)
    pending_product = models.CharField(max_length=255, blank=True)
    confirmation_step = models.PositiveSmallIntegerField(default=0)
    stage = models.CharField(max_length=40, default="idle")
    category = models.CharField(max_length=40, blank=True)
    questions = models.JSONField(default=list)
    answers = models.JSONField(default=list)
    candidate = models.JSONField(default=dict)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.owner_number}: {self.pending_product or 'no pending product'}"
