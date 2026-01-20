from django.contrib import admin
from .models import (
    Company, Invoice, Payment, LedgerEntry, Tax, 
    InventoryItem, Quotation, QuotationItem,
    Unit, Location, Batch, StockTransaction
)


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'phone', 'contact_person', 'outstanding_balance', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('name', 'email', 'phone', 'contact_person')
    readonly_fields = ('created_at', 'updated_at', 'total_debit', 'total_credit', 'outstanding_balance')
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'email', 'phone', 'contact_person')
        }),
        ('Address', {
            'fields': ('address',)
        }),
        ('Tax Information', {
            'fields': ('gstin',)
        }),
        ('Financial Summary', {
            'fields': ('total_debit', 'total_credit', 'outstanding_balance'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ('invoice_number', 'company', 'invoice_date', 'amount', 'reference', 'created_at')
    list_filter = ('invoice_date', 'created_at')
    search_fields = ('invoice_number', 'company__name', 'reference', 'description')
    date_hierarchy = 'invoice_date'
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Invoice Information', {
            'fields': ('company', 'invoice_number', 'invoice_date', 'amount')
        }),
        ('Details', {
            'fields': ('description', 'reference')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('payment_number', 'company', 'payment_date', 'amount', 'payment_mode', 'reference', 'created_at')
    list_filter = ('payment_date', 'payment_mode', 'created_at')
    search_fields = ('payment_number', 'company__name', 'reference', 'description')
    date_hierarchy = 'payment_date'
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Payment Information', {
            'fields': ('company', 'payment_number', 'payment_date', 'amount', 'payment_mode')
        }),
        ('Details', {
            'fields': ('description', 'reference')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(LedgerEntry)
class LedgerEntryAdmin(admin.ModelAdmin):
    list_display = ('transaction_number', 'company', 'transaction_type', 'transaction_date', 'amount', 'created_at')
    list_filter = ('transaction_type', 'transaction_date', 'created_at')
    search_fields = ('transaction_number', 'company__name', 'description', 'reference')
    date_hierarchy = 'transaction_date'
    readonly_fields = ('created_at',)
    fieldsets = (
        ('Transaction Information', {
            'fields': ('company', 'transaction_type', 'transaction_number', 'transaction_date', 'amount')
        }),
        ('Details', {
            'fields': ('description', 'reference', 'payment_mode')
        }),
        ('Related Records', {
            'fields': ('invoice', 'payment'),
            'classes': ('collapse',)
        }),
        ('Timestamp', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )


# --- Quotation Module Admin ---

@admin.register(Tax)
class TaxAdmin(admin.ModelAdmin):
    list_display = ('name', 'rate', 'is_active', 'is_default', 'created_at')
    list_filter = ('is_active', 'is_default')
    search_fields = ('name', 'description')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Tax Information', {
            'fields': ('name', 'rate', 'description')
        }),
        ('Settings', {
            'fields': ('is_active', 'is_default')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(InventoryItem)
class InventoryItemAdmin(admin.ModelAdmin):
    list_display = ('name', 'unit_price', 'unit', 'base_unit', 'category', 'stock_quantity', 'min_stock_level', 'sku')
    list_filter = ('category', 'created_at', 'base_unit')
    search_fields = ('name', 'description', 'sku', 'category')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Item Information', {
            'fields': ('name', 'description', 'sku', 'category')
        }),
        ('Pricing & Stock', {
            'fields': ('unit_price', 'unit', 'stock_quantity')
        }),
        ('Inventory Settings', {
            'fields': ('base_unit', 'min_stock_level', 'reorder_level', 'default_location', 'batch_tracking')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Unit)
class UnitAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'base_unit', 'conversion_factor', 'created_at')
    search_fields = ('name', 'code')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'parent', 'created_at')
    search_fields = ('name', 'code')
    list_filter = ('parent',)
    readonly_fields = ('created_at', 'updated_at')


@admin.register(Batch)
class BatchAdmin(admin.ModelAdmin):
    list_display = ('batch_number', 'item', 'manufacturing_date', 'expiry_date', 'created_at')
    list_filter = ('item', 'expiry_date')
    search_fields = ('batch_number', 'item__name')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(StockTransaction)
class StockTransactionAdmin(admin.ModelAdmin):
    list_display = ('transaction_date', 'transaction_type', 'item', 'quantity', 'unit', 'batch', 'location', 'created_at')
    list_filter = ('transaction_type', 'transaction_date', 'item', 'location')
    search_fields = ('reference_number', 'item__name', 'batch__batch_number')
    readonly_fields = ('base_quantity', 'created_at', 'updated_at')
    autocomplete_fields = ['item', 'unit', 'batch', 'location']
    
    fieldsets = (
        ('Transaction Info', {
            'fields': ('transaction_date', 'transaction_type', 'reference_number')
        }),
        ('Item Details', {
            'fields': ('item', 'quantity', 'unit', 'base_quantity')
        }),
        ('Tracking', {
            'fields': ('batch', 'location', 'notes')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


class QuotationItemInline(admin.TabularInline):
    model = QuotationItem
    extra = 1
    fields = ('item_name', 'description', 'quantity', 'unit_price', 'unit', 'subtotal', 'machine_cost')
    readonly_fields = ('subtotal',)


@admin.register(Quotation)
class QuotationAdmin(admin.ModelAdmin):
    list_display = ('quotation_number', 'company', 'quotation_date', 'total_amount', 'status', 'created_at')
    list_filter = ('status', 'quotation_date', 'created_at')
    search_fields = ('quotation_number', 'company__name', 'notes')
    date_hierarchy = 'quotation_date'
    readonly_fields = ('quotation_number', 'subtotal', 'tax_amount', 'discount_amount', 'total_amount', 'created_at', 'updated_at')
    inlines = [QuotationItemInline]
    fieldsets = (
        ('Quotation Information', {
            'fields': ('quotation_number', 'company', 'quotation_date', 'valid_until', 'status')
        }),
        ('Tax & Discount', {
            'fields': ('tax', 'discount_type', 'discount_value')
        }),
        ('Calculated Totals', {
            'fields': ('subtotal', 'tax_amount', 'discount_amount', 'total_amount'),
            'classes': ('collapse',)
        }),
        ('Notes', {
            'fields': ('notes',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        obj.calculate_totals()
        obj.save()


@admin.register(QuotationItem)
class QuotationItemAdmin(admin.ModelAdmin):
    list_display = ('quotation', 'item_name', 'quantity', 'unit_price', 'unit', 'subtotal')
    list_filter = ('quotation__quotation_date', 'created_at')
    search_fields = ('item_name', 'description', 'quotation__quotation_number')
    readonly_fields = ('subtotal', 'created_at', 'updated_at')
    fieldsets = (
        ('Quotation', {
            'fields': ('quotation', 'inventory_item')
        }),
        ('Item Details', {
            'fields': ('item_name', 'description', 'quantity', 'unit_price', 'unit', 'machine_cost')
        }),
        ('Calculated', {
            'fields': ('subtotal',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

