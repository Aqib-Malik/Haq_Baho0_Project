from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from .views import (
    CompanyViewSet, InvoiceViewSet, PaymentViewSet, LedgerViewSet,
    UserViewSet, RoleViewSet, PermissionViewSet,
    TaxViewSet, InventoryItemViewSet, QuotationViewSet, QuotationItemViewSet
)
from .serializers import CustomTokenObtainPairSerializer

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

router = DefaultRouter()
router.register(r'companies', CompanyViewSet, basename='company')
router.register(r'invoices', InvoiceViewSet, basename='invoice')
router.register(r'payments', PaymentViewSet, basename='payment')
router.register(r'ledger', LedgerViewSet, basename='ledger')
router.register(r'users', UserViewSet, basename='user')
router.register(r'roles', RoleViewSet, basename='role')
router.register(r'permissions', PermissionViewSet, basename='permission')
# Quotation module routes
router.register(r'taxes', TaxViewSet, basename='tax')
router.register(r'inventory-items', InventoryItemViewSet, basename='inventory-item')
router.register(r'quotations', QuotationViewSet, basename='quotation')
router.register(r'quotation-items', QuotationItemViewSet, basename='quotation-item')

urlpatterns = [
    path('api/', include(router.urls)),
    path('api/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
