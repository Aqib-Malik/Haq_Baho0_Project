from django.db import models
from django.contrib.auth.models import User


class SoftDeleteManager(models.Manager):
    """Manager that excludes soft-deleted records by default"""
    def get_queryset(self):
        return super().get_queryset().filter(deleted=False)


class SoftDeleteMixin(models.Model):
    """
    Abstract mixin that adds audit fields and soft delete functionality.
    
    Fields:
        - created_at: Timestamp when record was created
        - created_by: User who created the record
        - updated_at: Timestamp when record was last updated
        - updated_by: User who last updated the record
        - deleted: Soft delete flag
    
    Usage:
        - objects: Default manager (excludes soft-deleted records)
        - all_objects: Manager that includes soft-deleted records
        - delete(): Soft delete (sets deleted=True)
        - permdelete(): Permanent delete (actually removes from DB)
        - restore(): Restore soft-deleted record
    """
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        User, 
        related_name='+', 
        blank=True, 
        null=True, 
        on_delete=models.SET_NULL,
        help_text="User who created this record"
    )
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        User, 
        related_name='+', 
        blank=True, 
        null=True, 
        on_delete=models.SET_NULL,
        help_text="User who last updated this record"
    )
    deleted = models.BooleanField(default=False, db_index=True)

    # Default manager excludes soft-deleted records
    objects = SoftDeleteManager()
    # Manager to access all records including soft-deleted
    all_objects = models.Manager()

    class Meta:
        abstract = True
    
    def delete(self, using=None, keep_parents=False):
        """Soft delete: mark as deleted instead of removing from database"""
        self.deleted = True
        self.save(using=using)
        
    def permdelete(self, using=None, keep_parents=False):
        """Permanently delete: actually remove from database"""
        return super().delete(using=using, keep_parents=keep_parents)
    
    def restore(self):
        """Restore a soft-deleted record"""
        self.deleted = False
        self.save()
