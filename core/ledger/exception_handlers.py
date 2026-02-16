"""Custom DRF exception handler to always return JSON (including 500) with error details."""
import traceback
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status


def custom_exception_handler(exc, context):
    """Return JSON with detail and traceback for any unhandled exception."""
    response = exception_handler(exc, context)
    if response is not None:
        return response
    # Any other exception (e.g. 500) – return JSON so API clients get machine-readable error
    return Response(
        {
            'detail': str(exc),
            'traceback': traceback.format_exc(),
        },
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
