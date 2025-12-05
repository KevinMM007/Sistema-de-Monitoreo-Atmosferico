"""
Constantes compartidas para tests del Sistema de Monitoreo de Calidad del Aire.
"""

# ============================================================================
# CONSTANTES PARA TESTS DE EMAIL
# ============================================================================

VALID_EMAILS = [
    "usuario@gmail.com",
    "test.user@empresa.com",
    "correo@hotmail.com",
    "test_123@yahoo.com.mx",
]

INVALID_EMAILS = [
    "correo-sin-arroba.com",
    "@sinusuario.com",
    "espacios en blanco@mail.com",
    "sinpunto@mailcom",
    "",
]

TEMP_EMAILS = [
    "test@tempmail.com",
    "user@guerrillamail.com",
    "temp@10minutemail.com",
    "fake@mailinator.com",
]

# ============================================================================
# CONSTANTES GEOGRÁFICAS
# ============================================================================

# Coordenadas de Xalapa para tests
XALAPA_COORDS = {
    "latitude": 19.5438,
    "longitude": -96.9102
}

# Zonas de Xalapa
XALAPA_ZONES = ["Centro", "Norte", "Sur", "Este", "Oeste"]

# ============================================================================
# CONSTANTES DE CALIDAD DEL AIRE
# ============================================================================

# Umbrales de PM2.5 (µg/m³) según EPA
PM25_THRESHOLDS = {
    "good": 12.0,
    "moderate": 35.4,
    "unhealthy_sensitive": 55.4,
    "unhealthy": 150.4,
    "very_unhealthy": 250.4,
    "hazardous": 500.0
}

# Valores de prueba típicos
TEST_POLLUTANT_VALUES = {
    "pm25": 15.0,
    "pm10": 25.0,
    "no2": 18.0,
    "o3": 45.0,
    "co": 0.4
}
