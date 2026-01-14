from django.contrib import admin
from .models import Company, Invoice, Payment, LedgerEntry


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
