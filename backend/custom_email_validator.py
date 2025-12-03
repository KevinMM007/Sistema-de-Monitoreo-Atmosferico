"""
Validador de Email Profesional
==============================
Validación robusta de direcciones de correo electrónico siguiendo RFC 5321/5322.

Características:
- Validación de formato básico
- Verificación de dominios bloqueados (temporales/desechables)
- Validación de longitud según estándares
- Normalización de email
"""

import re
from typing import Tuple, Optional

# Dominios de email temporales/desechables comunes (para bloquear)
DISPOSABLE_DOMAINS = {
    '10minutemail.com', 'tempmail.com', 'guerrillamail.com', 'mailinator.com',
    'throwaway.email', 'temp-mail.org', 'fakeinbox.com', 'sharklasers.com',
    'guerrillamailblock.com', 'spam4.me', 'grr.la', 'dispostable.com',
    'mailnesia.com', 'trashmail.com', 'getairmail.com', 'maildrop.cc',
    'yopmail.com', 'mohmal.com', 'tempail.com', 'emailondeck.com',
    'getnada.com', 'mintemail.com', 'dropmail.me', 'mytemp.email'
}

# Dominios de email comunes válidos (para referencia/sugerencia)
COMMON_VALID_DOMAINS = {
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com',
    'protonmail.com', 'live.com', 'msn.com', 'mail.com', 'aol.com',
    'zoho.com', 'gmx.com', 'ymail.com', 'pm.me', 'tutanota.com'
}

# Regex mejorado siguiendo RFC 5321 (más estricto pero práctico)
# Este patrón valida la mayoría de emails válidos sin ser demasiado permisivo
EMAIL_REGEX = re.compile(
    r'^(?!.*\.\.)'                          # No dobles puntos consecutivos
    r'[a-zA-Z0-9]'                          # Debe empezar con alfanumérico
    r'[a-zA-Z0-9.!#$%&\'*+/=?^_`{|}~-]{0,62}'  # Caracteres válidos en local part
    r'[a-zA-Z0-9]?'                         # Puede terminar con alfanumérico
    r'@'                                    # Arroba obligatorio
    r'[a-zA-Z0-9]'                          # Dominio empieza con alfanumérico
    r'(?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?'   # Resto del primer label
    r'(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*'  # Subdominos
    r'\.[a-zA-Z]{2,}$'                      # TLD (mínimo 2 caracteres)
)

# Regex simple para validación básica rápida
SIMPLE_EMAIL_REGEX = re.compile(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')


class EmailValidationResult:
    """Resultado de validación de email con detalles."""
    
    def __init__(
        self, 
        is_valid: bool, 
        email: str = None,
        normalized_email: str = None,
        error_code: str = None,
        error_message: str = None,
        suggestions: list = None
    ):
        self.is_valid = is_valid
        self.email = email
        self.normalized_email = normalized_email or email
        self.error_code = error_code
        self.error_message = error_message
        self.suggestions = suggestions or []
    
    def to_dict(self) -> dict:
        return {
            "is_valid": self.is_valid,
            "email": self.email,
            "normalized_email": self.normalized_email,
            "error_code": self.error_code,
            "error_message": self.error_message,
            "suggestions": self.suggestions
        }


def normalize_email(email: str) -> str:
    """
    Normaliza un email para almacenamiento consistente.
    - Convierte a minúsculas
    - Elimina espacios
    - Maneja alias de Gmail (elimina puntos y +alias)
    """
    if not email:
        return email
    
    # Limpiar y convertir a minúsculas
    email = email.strip().lower()
    
    # Separar local part y dominio
    if '@' not in email:
        return email
    
    local, domain = email.rsplit('@', 1)
    
    # Normalización específica para Gmail
    if domain in ('gmail.com', 'googlemail.com'):
        # Eliminar puntos (Gmail los ignora)
        local = local.replace('.', '')
        # Eliminar alias con + 
        if '+' in local:
            local = local.split('+')[0]
        # Normalizar googlemail.com a gmail.com
        domain = 'gmail.com'
    
    return f"{local}@{domain}"


def validate_email(email: str, strict: bool = True, allow_disposable: bool = False) -> EmailValidationResult:
    """
    Valida una dirección de email de forma completa.
    
    Args:
        email: Dirección de email a validar
        strict: Si True, usa regex estricto RFC-compliant. Si False, usa simple.
        allow_disposable: Si True, permite dominios de email temporales.
    
    Returns:
        EmailValidationResult con detalles de la validación
    """
    # Validación nula
    if not email:
        return EmailValidationResult(
            is_valid=False,
            email=email,
            error_code="EMPTY_EMAIL",
            error_message="El email es requerido"
        )
    
    # Limpiar espacios
    email = email.strip()
    
    # Validación de longitud (RFC 5321: máximo 254 caracteres)
    if len(email) > 254:
        return EmailValidationResult(
            is_valid=False,
            email=email,
            error_code="EMAIL_TOO_LONG",
            error_message=f"El email es demasiado largo ({len(email)} caracteres, máximo 254)"
        )
    
    # Validación básica de formato (tiene @)
    if '@' not in email:
        return EmailValidationResult(
            is_valid=False,
            email=email,
            error_code="MISSING_AT",
            error_message="El email debe contener @"
        )
    
    # Separar local part y dominio
    local, domain = email.rsplit('@', 1)
    
    # Validar longitud del local part (RFC 5321: máximo 64 caracteres)
    if len(local) > 64:
        return EmailValidationResult(
            is_valid=False,
            email=email,
            error_code="LOCAL_PART_TOO_LONG",
            error_message=f"La parte local es demasiado larga ({len(local)} caracteres, máximo 64)"
        )
    
    # Validar longitud del dominio (RFC 5321: máximo 255 caracteres)
    if len(domain) > 255:
        return EmailValidationResult(
            is_valid=False,
            email=email,
            error_code="DOMAIN_TOO_LONG",
            error_message=f"El dominio es demasiado largo ({len(domain)} caracteres, máximo 255)"
        )
    
    # Validación de formato con regex
    regex = EMAIL_REGEX if strict else SIMPLE_EMAIL_REGEX
    if not regex.match(email):
        # Generar sugerencias si el dominio parece incorrecto
        suggestions = []
        domain_lower = domain.lower()
        
        # Detectar typos comunes
        typo_corrections = {
            'gmial.com': 'gmail.com',
            'gmai.com': 'gmail.com',
            'gnail.com': 'gmail.com',
            'gmail.co': 'gmail.com',
            'gamil.com': 'gmail.com',
            'hotmal.com': 'hotmail.com',
            'hotmai.com': 'hotmail.com',
            'hotamil.com': 'hotmail.com',
            'outlok.com': 'outlook.com',
            'outloo.com': 'outlook.com',
            'yaho.com': 'yahoo.com',
            'yahooo.com': 'yahoo.com',
        }
        
        if domain_lower in typo_corrections:
            corrected = f"{local}@{typo_corrections[domain_lower]}"
            suggestions.append(f"¿Quisiste decir {corrected}?")
        
        return EmailValidationResult(
            is_valid=False,
            email=email,
            error_code="INVALID_FORMAT",
            error_message="El formato del email no es válido",
            suggestions=suggestions
        )
    
    # Validar que no sea un dominio desechable
    if not allow_disposable and domain.lower() in DISPOSABLE_DOMAINS:
        return EmailValidationResult(
            is_valid=False,
            email=email,
            error_code="DISPOSABLE_EMAIL",
            error_message="No se permiten emails temporales o desechables. Por favor usa un email permanente."
        )
    
    # Email válido - normalizar y retornar
    normalized = normalize_email(email)
    
    return EmailValidationResult(
        is_valid=True,
        email=email,
        normalized_email=normalized
    )


def validate_email_simple(email: str) -> Tuple[bool, Optional[str]]:
    """
    Validación simple de email para uso rápido.
    
    Returns:
        Tuple[bool, Optional[str]]: (es_valido, mensaje_error)
    """
    result = validate_email(email, strict=False)
    return (result.is_valid, result.error_message)


def is_valid_email(email: str) -> bool:
    """
    Verificación booleana simple de email.
    """
    result = validate_email(email, strict=False)
    return result.is_valid


# Función de conveniencia para FastAPI
def validate_email_for_api(email: str) -> dict:
    """
    Validación de email con respuesta formateada para API.
    Lanza HTTPException si el email no es válido.
    """
    from fastapi import HTTPException
    
    result = validate_email(email, strict=True, allow_disposable=False)
    
    if not result.is_valid:
        detail = {
            "error": result.error_code,
            "message": result.error_message
        }
        if result.suggestions:
            detail["suggestions"] = result.suggestions
        
        raise HTTPException(status_code=400, detail=detail)
    
    return {
        "email": result.email,
        "normalized_email": result.normalized_email
    }
