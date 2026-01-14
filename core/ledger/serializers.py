from rest_framework import serializers
from django.contrib.auth.models import User, Group, Permission
from django.contrib.contenttypes.models import ContentType
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Company, Invoice, Payment, LedgerEntry

# --- Existing Serializers ---

class CompanySerializer(serializers.ModelSerializer):
    outstanding_balance = serializers.DecimalField(max_digits=19, decimal_places=2, read_only=True)
    total_debit = serializers.DecimalField(max_digits=19, decimal_places=2, read_only=True)
    total_credit = serializers.DecimalField(max_digits=19, decimal_places=2, read_only=True)
    
    class Meta:
        model = Company
        fields = '__all__'

class InvoiceSerializer(serializers.ModelSerializer):
    company_name = serializers.ReadOnlyField(source='company.name')

    class Meta:
        model = Invoice
        fields = '__all__'

class PaymentSerializer(serializers.ModelSerializer):
    company_name = serializers.ReadOnlyField(source='company.name')

    class Meta:
        model = Payment
        fields = '__all__'

class LedgerEntrySerializer(serializers.ModelSerializer):
    invoice = InvoiceSerializer(read_only=True)
    payment = PaymentSerializer(read_only=True)
    
    class Meta:
        model = LedgerEntry
        fields = '__all__'

class LedgerEntryWithBalanceSerializer(LedgerEntrySerializer):
    running_balance = serializers.DecimalField(max_digits=19, decimal_places=2, read_only=True)

class CompanyLedgerSummarySerializer(serializers.Serializer):
    company = CompanySerializer()
    opening_balance = serializers.DecimalField(max_digits=19, decimal_places=2)
    total_debit = serializers.DecimalField(max_digits=19, decimal_places=2)
    total_credit = serializers.DecimalField(max_digits=19, decimal_places=2)
    closing_balance = serializers.DecimalField(max_digits=19, decimal_places=2)
    outstanding_balance = serializers.DecimalField(max_digits=19, decimal_places=2)

# --- RBAC Serializers ---

class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ['id', 'name', 'codename', 'content_type']

class RoleSerializer(serializers.ModelSerializer):
    permissions = PermissionSerializer(many=True, read_only=True)
    permission_ids = serializers.ListField(
        child=serializers.IntegerField(), write_only=True, required=False
    )

    class Meta:
        model = Group
        fields = ['id', 'name', 'permissions', 'permission_ids']

    def create(self, validated_data):
        permission_ids = validated_data.pop('permission_ids', [])
        role = Group.objects.create(**validated_data)
        role.permissions.set(permission_ids)
        return role

    def update(self, instance, validated_data):
        permission_ids = validated_data.pop('permission_ids', None)
        instance.name = validated_data.get('name', instance.name)
        instance.save()
        if permission_ids is not None:
            instance.permissions.set(permission_ids)
        return instance

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    roles = serializers.SerializerMethodField()
    role_ids = serializers.ListField(
        child=serializers.IntegerField(), write_only=True, required=False
    )
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'password', 'roles', 'role_ids', 'permissions', 'is_active', 'is_staff']

    def get_roles(self, obj):
        return RoleSerializer(obj.groups.all(), many=True).data
    
    def get_permissions(self, obj):
        perms = set()
        for p in obj.user_permissions.all():
            perms.add(p.codename)
        for group in obj.groups.all():
            for p in group.permissions.all():
                perms.add(p.codename)
        return list(perms)

    def create(self, validated_data):
        role_ids = validated_data.pop('role_ids', [])
        password = validated_data.pop('password', None)
        
        user = User.objects.create(**validated_data)
        if password:
            user.set_password(password)
        else:
             user.set_unusable_password()
             
        user.save()
        user.groups.set(role_ids)
        return user

    def update(self, instance, validated_data):
        role_ids = validated_data.pop('role_ids', None)
        password = validated_data.pop('password', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
            
        if password:
            instance.set_password(password)
            
        instance.save()
        
        if role_ids is not None:
            instance.groups.set(role_ids)
            
        return instance

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        token['username'] = user.username
        token['is_staff'] = user.is_staff
        token['is_superuser'] = user.is_superuser
        perms = set()
        for group in user.groups.all():
            for p in group.permissions.all():
                perms.add(p.codename)
        for p in user.user_permissions.all():
            perms.add(p.codename)
        token['permissions'] = list(perms)
        
        return token
