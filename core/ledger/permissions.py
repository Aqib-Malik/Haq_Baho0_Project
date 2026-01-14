from rest_framework.permissions import DjangoModelPermissions

class CustomDjangoModelPermissions(DjangoModelPermissions):
    """
    Extends DjangoModelPermissions to enforce 'view' permissions on GET requests.
    By default, DjangoModelPermissions only checks add/change/delete for unsafe methods.
    """
    def __init__(self):
        super().__init__()
        self.perms_map['GET'] = ['%(app_label)s.view_%(model_name)s']
