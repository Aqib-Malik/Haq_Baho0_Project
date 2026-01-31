from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import DjangoModelPermissions, IsAuthenticated
from .permissions import CustomDjangoModelPermissions
from django.db.models import Sum
from datetime import datetime
from decimal import Decimal

from .serializers import (
    CompanySerializer, InvoiceSerializer, PaymentSerializer,
    LedgerEntrySerializer, LedgerEntryWithBalanceSerializer,
    CompanyLedgerSummarySerializer,
    UserSerializer, RoleSerializer, PermissionSerializer,
    TaxSerializer, InventoryItemSerializer, QuotationSerializer,
    QuotationListSerializer, QuotationDetailSerializer, QuotationItemSerializer,
    UnitSerializer, LocationSerializer, BatchSerializer, StockTransactionSerializer, ProjectSerializer
)
from django.contrib.auth.models import User, Group, Permission
from .models import (
    Company, Invoice, Payment, LedgerEntry, Tax, 
    InventoryItem, Quotation, QuotationItem,
    Unit, Location, Batch, StockTransaction, Project
)
from .export_utils import export_ledger_pdf, export_ledger_excel


class AuditMixin:
    """Mixin to automatically set created_by and updated_by fields"""
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


class CompanyViewSet(AuditMixin, viewsets.ModelViewSet):
    """ViewSet for Company CRUD operations"""
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    permission_classes = [IsAuthenticated, CustomDjangoModelPermissions]
    pagination_class = None

    def list(self, request, *args, **kwargs):
        # Optional: further restrict list if needed, but permissions handle access
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def search(self, request):
        query = request.query_params.get('q', '')
        if query:
            companies = Company.objects.filter(name__icontains=query)
            serializer = self.get_serializer(companies, many=True)
            return Response(serializer.data)
        return Response([])


class ProjectViewSet(AuditMixin, viewsets.ModelViewSet):
    """ViewSet for Project/WorkOrder CRUD operations"""
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated, CustomDjangoModelPermissions]
    
    def get_queryset(self):
        queryset = Project.objects.all()
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        client_id = self.request.query_params.get('client', None)
        if client_id:
            queryset = queryset.filter(client_id=client_id)
            
        return queryset


class InvoiceViewSet(AuditMixin, viewsets.ModelViewSet):
    queryset = Invoice.objects.all()
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated, CustomDjangoModelPermissions]

    def get_queryset(self):
        queryset = Invoice.objects.all()
        company_id = self.request.query_params.get('company', None)
        if company_id:
            queryset = queryset.filter(company_id=company_id)
        return queryset


class PaymentViewSet(AuditMixin, viewsets.ModelViewSet):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated, CustomDjangoModelPermissions]

    def get_queryset(self):
        queryset = Payment.objects.all()
        company_id = self.request.query_params.get('company', None)
        if company_id:
            queryset = queryset.filter(company_id=company_id)
        return queryset


class LedgerViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = LedgerEntry.objects.all()
    serializer_class = LedgerEntrySerializer
    permission_classes = [IsAuthenticated, CustomDjangoModelPermissions] # ReadOnly, so basically just need to be logged in

    @action(detail=False, methods=['get'])
    def company_ledger(self, request):
        # We could enforce view_ledgerentry permission here manually if desired
        company_id = request.query_params.get('company', None)
        start_date = request.query_params.get('start_date', None)
        end_date = request.query_params.get('end_date', None)

        if not company_id:
            return Response({'error': 'company parameter is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            company = Company.objects.get(pk=company_id)
        except Company.DoesNotExist:
            return Response({'error': 'Company not found'}, status=status.HTTP_404_NOT_FOUND)

        entries = LedgerEntry.objects.filter(company=company).order_by('transaction_date', 'created_at')

        if start_date:
            try:
                start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
                entries = entries.filter(transaction_date__gte=start_date_obj)
            except ValueError:
                return Response({'error': 'Invalid start_date format. Use YYYY-MM-DD'}, status=status.HTTP_400_BAD_REQUEST)

        if end_date:
            try:
                end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
                entries = entries.filter(transaction_date__lte=end_date_obj)
            except ValueError:
                return Response({'error': 'Invalid end_date format. Use YYYY-MM-DD'}, status=status.HTTP_400_BAD_REQUEST)

        opening_balance = Decimal('0.00')
        if start_date:
            try:
                start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
                opening_entries = LedgerEntry.objects.filter(company=company, transaction_date__lt=start_date_obj)
                opening_debit = opening_entries.filter(transaction_type='debit').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
                opening_credit = opening_entries.filter(transaction_type='credit').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
                opening_balance = opening_debit - opening_credit
            except ValueError:
                pass
        else:
            all_entries = LedgerEntry.objects.filter(company=company).order_by('transaction_date', 'created_at')
            if entries.exists():
                first_entry_date = entries.first().transaction_date
                opening_entries = all_entries.filter(transaction_date__lt=first_entry_date)
                opening_debit = opening_entries.filter(transaction_type='debit').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
                opening_credit = opening_entries.filter(transaction_type='credit').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
                opening_balance = opening_debit - opening_credit

        running_balance = opening_balance
        entries_with_balance = []

        for entry in entries:
            if entry.transaction_type == 'debit':
                running_balance += entry.amount
            else:
                running_balance -= entry.amount

            entry_data = LedgerEntryWithBalanceSerializer(entry).data
            entry_data['running_balance'] = running_balance
            entries_with_balance.append(entry_data)

        total_debit = entries.filter(transaction_type='debit').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        total_credit = entries.filter(transaction_type='credit').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        closing_balance = opening_balance + total_debit - total_credit

        company_serializer = CompanySerializer(company)
        response_data = {
            'company': company_serializer.data,
            'opening_balance': str(opening_balance),
            'total_debit': str(total_debit),
            'total_credit': str(total_credit),
            'closing_balance': str(closing_balance),
            'entries': entries_with_balance,
            'outstanding_balance': str(closing_balance)
        }

        return Response(response_data)

    @action(detail=False, methods=['get'])
    def export_pdf(self, request):
        company_id = request.query_params.get('company', None)
        start_date = request.query_params.get('start_date', None)
        end_date = request.query_params.get('end_date', None)

        if not company_id:
            return Response({'error': 'company parameter is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            company = Company.objects.get(pk=company_id)
        except Company.DoesNotExist:
            return Response({'error': 'Company not found'}, status=status.HTTP_404_NOT_FOUND)

        try:
            return export_ledger_pdf(company, start_date, end_date)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def export_excel(self, request):
        company_id = request.query_params.get('company', None)
        start_date = request.query_params.get('start_date', None)
        end_date = request.query_params.get('end_date', None)

        if not company_id:
            return Response({'error': 'company parameter is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            company = Company.objects.get(pk=company_id)
        except Company.DoesNotExist:
            return Response({'error': 'Company not found'}, status=status.HTTP_404_NOT_FOUND)

        try:
            return export_ledger_excel(company, start_date, end_date)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def outstanding_balance(self, request):
        company_id = request.query_params.get('company', None)
        if company_id:
            try:
                company = Company.objects.get(pk=company_id)
                return Response({
                    'company': CompanySerializer(company).data,
                    'outstanding_balance': str(company.outstanding_balance)
                })
            except Company.DoesNotExist:
                return Response({'error': 'Company not found'}, status=status.HTTP_404_NOT_FOUND)
        else:
            companies = Company.objects.all()
            result = []
            for company in companies:
                result.append({
                    'company': CompanySerializer(company).data,
                    'outstanding_balance': str(company.outstanding_balance)
                })
            return Response(result)

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('id')
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, CustomDjangoModelPermissions] # User management usually has its own checks or is admin-only. Let's keep strict checks.
    # Actually, for UserViewSet, we probably want IsAdminUser or custom permissions, but let's stick to IsAuthenticated for now as we have RBAC on top.

class RoleViewSet(viewsets.ModelViewSet):
    queryset = Group.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [IsAuthenticated, CustomDjangoModelPermissions]

class PermissionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Permission.objects.all()
    serializer_class = PermissionSerializer
    permission_classes = [IsAuthenticated, CustomDjangoModelPermissions]
    pagination_class = None


# --- Quotation Module ViewSets ---

class TaxViewSet(AuditMixin, viewsets.ModelViewSet):
    """ViewSet for Tax CRUD operations"""
    queryset = Tax.objects.all()
    serializer_class = TaxSerializer
    permission_classes = [IsAuthenticated, CustomDjangoModelPermissions]
    pagination_class = None
    
    def get_queryset(self):
        queryset = Tax.objects.all()
        # Filter active taxes by default
        active_only = self.request.query_params.get('active_only', 'true')
        if active_only.lower() == 'true':
            queryset = queryset.filter(is_active=True)
        return queryset
    
    @action(detail=False, methods=['get'])
    def default(self, request):
        """Get the default tax"""
        try:
            default_tax = Tax.objects.get(is_default=True, is_active=True)
            serializer = self.get_serializer(default_tax)
            return Response(serializer.data)
        except Tax.DoesNotExist:
            return Response({'error': 'No default tax found'}, status=status.HTTP_404_NOT_FOUND)


class InventoryItemViewSet(AuditMixin, viewsets.ModelViewSet):
    """ViewSet for InventoryItem CRUD operations"""
    queryset = InventoryItem.objects.all()
    serializer_class = InventoryItemSerializer
    permission_classes = [IsAuthenticated, CustomDjangoModelPermissions]
    
    def get_queryset(self):
        queryset = InventoryItem.objects.all()
        
        # Filter by category
        category = self.request.query_params.get('category', None)
        if category:
            queryset = queryset.filter(category=category)
        
        # Search by name
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(name__icontains=search)
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def categories(self, request):
        """Get list of unique categories"""
        categories = InventoryItem.objects.values_list('category', flat=True).distinct()
        categories = [cat for cat in categories if cat]  # Filter out None/empty
        return Response(categories)


class UnitViewSet(AuditMixin, viewsets.ModelViewSet):
    """ViewSet for Unit CRUD operations"""
    queryset = Unit.objects.all()
    serializer_class = UnitSerializer
    permission_classes = [IsAuthenticated, CustomDjangoModelPermissions]
    
    def get_queryset(self):
        queryset = Unit.objects.all()
        # Ensure base units are loaded if needed
        return queryset


class LocationViewSet(AuditMixin, viewsets.ModelViewSet):
    """ViewSet for Location CRUD operations"""
    queryset = Location.objects.all()
    serializer_class = LocationSerializer
    permission_classes = [IsAuthenticated, CustomDjangoModelPermissions]


class BatchViewSet(AuditMixin, viewsets.ModelViewSet):
    """ViewSet for Batch CRUD operations"""
    queryset = Batch.objects.all()
    serializer_class = BatchSerializer
    permission_classes = [IsAuthenticated, CustomDjangoModelPermissions]
    
    def get_queryset(self):
        queryset = Batch.objects.all()
        item_id = self.request.query_params.get('item', None)
        if item_id:
            queryset = queryset.filter(item_id=item_id)
        return queryset


class StockTransactionViewSet(AuditMixin, viewsets.ModelViewSet):
    """ViewSet for StockTransaction CRUD operations"""
    queryset = StockTransaction.objects.all()
    serializer_class = StockTransactionSerializer
    permission_classes = [IsAuthenticated, CustomDjangoModelPermissions]

    def get_queryset(self):
        queryset = StockTransaction.objects.all()
        item_id = self.request.query_params.get('item', None)
        if item_id:
            queryset = queryset.filter(item_id=item_id)
            
        transaction_type = self.request.query_params.get('type', None)
        if transaction_type:
            queryset = queryset.filter(transaction_type=transaction_type)
            
        return queryset



class QuotationViewSet(AuditMixin, viewsets.ModelViewSet):
    """ViewSet for Quotation CRUD operations"""
    queryset = Quotation.objects.all()
    permission_classes = [IsAuthenticated, CustomDjangoModelPermissions]
    
    def get_serializer_class(self):
        if self.action == 'list':
            return QuotationListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return QuotationDetailSerializer
        return QuotationSerializer
    
    def get_queryset(self):
        queryset = Quotation.objects.all()
        
        # Filter by company
        company_id = self.request.query_params.get('company', None)
        if company_id:
            queryset = queryset.filter(company_id=company_id)
        
        # Filter by status
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date', None)
        if start_date:
            try:
                start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
                queryset = queryset.filter(quotation_date__gte=start_date_obj)
            except ValueError:
                pass
        
        end_date = self.request.query_params.get('end_date', None)
        if end_date:
            try:
                end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
                queryset = queryset.filter(quotation_date__lte=end_date_obj)
            except ValueError:
                pass
        
        return queryset
    
    @action(detail=True, methods=['get'])
    def generate_pdf(self, request, pk=None):
        """Generate PDF for a quotation"""
        quotation = self.get_object()
        
        try:
            from .quotation_pdf import generate_quotation_pdf
            return generate_quotation_pdf(quotation)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def change_status(self, request, pk=None):
        """Change quotation status"""
        quotation = self.get_object()
        new_status = request.data.get('status')
        
        if new_status not in dict(Quotation.STATUS_CHOICES):
            return Response(
                {'error': 'Invalid status'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        quotation.status = new_status
        quotation.save()
        
        serializer = self.get_serializer(quotation)
        return Response(serializer.data)


class QuotationItemViewSet(AuditMixin, viewsets.ModelViewSet):
    """ViewSet for QuotationItem CRUD operations"""
    queryset = QuotationItem.objects.all()
    serializer_class = QuotationItemSerializer
    permission_classes = [IsAuthenticated, CustomDjangoModelPermissions]
    
    def get_queryset(self):
        queryset = QuotationItem.objects.all()
        
        # Filter by quotation
        quotation_id = self.request.query_params.get('quotation', None)
        if quotation_id:
            queryset = queryset.filter(quotation_id=quotation_id)
        
        return queryset

