from django.contrib import admin

from .models import LinqConversationState, LinqMessage, PriceTrackerItem, WatchlistItem


@admin.register(LinqMessage)
class LinqMessageAdmin(admin.ModelAdmin):
	list_display = ('from_number', 'is_processed', 'created_at', 'text_preview')
	list_filter = ('is_processed', 'created_at')
	search_fields = ('from_number', 'text')
	readonly_fields = ('created_at',)

	@admin.display(description='Message')
	def text_preview(self, obj):
		return obj.text[:80]


@admin.register(PriceTrackerItem)
class PriceTrackerItemAdmin(admin.ModelAdmin):
	list_display = ('owner_number', 'product_name', 'created_at')
	search_fields = ('owner_number', 'product_name')
	readonly_fields = ('created_at',)


@admin.register(WatchlistItem)
class WatchlistItemAdmin(admin.ModelAdmin):
	list_display = ('owner_number', 'product_id', 'product_name', 'price', 'merchant', 'last_updated')
	search_fields = ('owner_number', 'product_id', 'product_name', 'brand', 'merchant')
	readonly_fields = ('created_at', 'last_updated')


@admin.register(LinqConversationState)
class LinqConversationStateAdmin(admin.ModelAdmin):
	list_display = ('owner_number', 'pending_product', 'updated_at')
	search_fields = ('owner_number', 'pending_product')
	readonly_fields = ('updated_at',)
