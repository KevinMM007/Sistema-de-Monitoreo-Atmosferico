"""
Rate Limiter para el Sistema de Monitoreo de Calidad del Aire
=============================================================
Implementa limitación de tasa de solicitudes para prevenir abuso de la API.

Configuración:
- Rate limit general: 100 requests/minuto por IP
- Rate limit para suscripciones: 5 requests/minuto por IP
- Rate limit para endpoints costosos: 30 requests/minuto por IP
"""

import time
from collections import defaultdict
from functools import wraps
from fastapi import Request, HTTPException

# Almacenamiento en memoria para los contadores de rate limiting
# En producción, considera usar Redis para persistencia entre reinicio
_rate_limit_storage = defaultdict(lambda: {"count": 0, "window_start": time.time()})

# Configuración de límites
RATE_LIMITS = {
    "default": {"requests": 100, "window_seconds": 60},
    "strict": {"requests": 5, "window_seconds": 60},      # Para suscripciones
    "moderate": {"requests": 30, "window_seconds": 60},   # Para endpoints costosos
}


def get_client_ip(request: Request) -> str:
    """
    Obtiene la IP del cliente, considerando proxies reversos.
    """
    # Intentar obtener IP real si está detrás de un proxy
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        # Tomar la primera IP (la del cliente original)
        return forwarded.split(",")[0].strip()
    
    # Intentar X-Real-IP
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    
    # Fallback a la IP directa
    return request.client.host if request.client else "unknown"


def check_rate_limit(
    request: Request,
    limit_type: str = "default",
    identifier: str = None
) -> dict:
    """
    Verifica si una solicitud excede el rate limit.
    
    Args:
        request: Objeto Request de FastAPI
        limit_type: Tipo de límite a aplicar ("default", "strict", "moderate")
        identifier: Identificador personalizado (por defecto usa IP)
    
    Returns:
        dict con información del límite:
        - allowed: bool - Si la solicitud está permitida
        - remaining: int - Solicitudes restantes en la ventana
        - reset_in: int - Segundos hasta que se reinicie la ventana
        - limit: int - Límite total de la ventana
    
    Raises:
        HTTPException: Si se excede el rate limit
    """
    # Obtener configuración del límite
    config = RATE_LIMITS.get(limit_type, RATE_LIMITS["default"])
    max_requests = config["requests"]
    window_seconds = config["window_seconds"]
    
    # Generar clave única (IP + endpoint)
    client_ip = get_client_ip(request)
    key = identifier or f"{client_ip}:{request.url.path}:{limit_type}"
    
    current_time = time.time()
    
    # Obtener o crear entrada para esta clave
    entry = _rate_limit_storage[key]
    
    # Verificar si la ventana ha expirado
    if current_time - entry["window_start"] >= window_seconds:
        # Reiniciar ventana
        entry["count"] = 0
        entry["window_start"] = current_time
    
    # Calcular tiempo restante en la ventana
    time_remaining = window_seconds - (current_time - entry["window_start"])
    remaining = max(0, max_requests - entry["count"] - 1)
    
    # Verificar límite
    if entry["count"] >= max_requests:
        return {
            "allowed": False,
            "remaining": 0,
            "reset_in": int(time_remaining),
            "limit": max_requests
        }
    
    # Incrementar contador
    entry["count"] += 1
    
    return {
        "allowed": True,
        "remaining": remaining,
        "reset_in": int(time_remaining),
        "limit": max_requests
    }


def rate_limit(limit_type: str = "default"):
    """
    Decorador para aplicar rate limiting a endpoints.
    
    Uso:
        @app.get("/api/endpoint")
        @rate_limit("strict")
        async def my_endpoint(request: Request):
            ...
    
    Args:
        limit_type: Tipo de límite ("default", "strict", "moderate")
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Buscar el objeto Request en los argumentos
            request = kwargs.get("request")
            if not request:
                for arg in args:
                    if isinstance(arg, Request):
                        request = arg
                        break
            
            if request:
                result = check_rate_limit(request, limit_type)
                
                if not result["allowed"]:
                    raise HTTPException(
                        status_code=429,
                        detail={
                            "error": "Rate limit exceeded",
                            "message": f"Demasiadas solicitudes. Por favor espera {result['reset_in']} segundos.",
                            "retry_after": result["reset_in"],
                            "limit": result["limit"]
                        },
                        headers={
                            "Retry-After": str(result["reset_in"]),
                            "X-RateLimit-Limit": str(result["limit"]),
                            "X-RateLimit-Remaining": str(result["remaining"]),
                            "X-RateLimit-Reset": str(result["reset_in"])
                        }
                    )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator


def rate_limit_middleware_check(request: Request, limit_type: str = "default"):
    """
    Función auxiliar para verificar rate limit dentro de un endpoint.
    Útil cuando necesitas lógica condicional.
    
    Uso:
        @app.post("/api/endpoint")
        async def my_endpoint(request: Request):
            rate_limit_middleware_check(request, "strict")
            # ... resto del código
    """
    result = check_rate_limit(request, limit_type)
    
    if not result["allowed"]:
        raise HTTPException(
            status_code=429,
            detail={
                "error": "Rate limit exceeded",
                "message": f"Demasiadas solicitudes. Por favor espera {result['reset_in']} segundos.",
                "retry_after": result["reset_in"],
                "limit": result["limit"]
            },
            headers={
                "Retry-After": str(result["reset_in"]),
                "X-RateLimit-Limit": str(result["limit"]),
                "X-RateLimit-Remaining": str(result["remaining"]),
                "X-RateLimit-Reset": str(result["reset_in"])
            }
        )
    
    return result


def cleanup_expired_entries(max_age_seconds: int = 3600):
    """
    Limpia entradas expiradas del almacenamiento de rate limiting.
    Llamar periódicamente para evitar memory leaks.
    
    Args:
        max_age_seconds: Máxima antigüedad en segundos (default: 1 hora)
    """
    current_time = time.time()
    keys_to_delete = []
    
    for key, entry in _rate_limit_storage.items():
        if current_time - entry["window_start"] > max_age_seconds:
            keys_to_delete.append(key)
    
    for key in keys_to_delete:
        del _rate_limit_storage[key]
    
    return len(keys_to_delete)


def get_rate_limit_stats():
    """
    Obtiene estadísticas del rate limiter para monitoreo.
    """
    return {
        "active_entries": len(_rate_limit_storage),
        "limits_config": RATE_LIMITS
    }
