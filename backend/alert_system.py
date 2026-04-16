"""
============================================================================
Sistema de Monitoreo de Calidad del Aire - Xalapa, Veracruz
============================================================================

ARCHIVO: alert_system.py
PROPÓSITO: Sistema de alertas y evaluación de calidad del aire

FUNCIONALIDADES:
    - Evaluación de niveles de contaminantes mediante un esquema híbrido
      basado en los breakpoints del AQI de la EPA de EE.UU. y los criterios
      de PM2.5/PM10 alineados con la NOM-025-SSA1-2021 (México)
    - Generación de alertas según nivel de riesgo
    - Envío de notificaciones por email a suscriptores
    - Cálculo del Índice de Calidad del Aire (AQI)
    - Generación de reportes diarios

NIVELES DE ALERTA:
    - Bueno: Sin riesgo
    - Moderado: Personas sensibles deben tener precaución
    - Insalubre (grupos sensibles): Evitar actividades al aire libre
    - Insalubre: Todos deben limitar exposición
    - Muy Insalubre: Permanecer en interiores
    - Peligroso: Emergencia sanitaria

AUTOR: Kevin Morales
VERSIÓN: 2.1.0
============================================================================
"""

from datetime import datetime, timedelta
import json
from typing import List, Dict, Optional
from enum import Enum
import logging
from email_service import EmailService
from sqlalchemy.orm import Session
import models

logger = logging.getLogger(__name__)

class AlertLevel(Enum):
    GOOD = "bueno"
    MODERATE = "moderado" 
    UNHEALTHY_SENSITIVE = "insalubre_sensibles"
    UNHEALTHY = "insalubre"
    VERY_UNHEALTHY = "muy_insalubre"
    HAZARDOUS = "peligroso"

class AlertSystem:
    def __init__(self):
        # Umbrales basados en el esquema híbrido del sistema:
        # - PM2.5 y PM10 alineados con NOM-025-SSA1-2021 (México) y
        #   extendidos a 6 niveles con los breakpoints del AQI de la EPA.
        # - NO2, O3 y CO basados en los breakpoints del AQI de la EPA
        #   (EE.UU.) y las guías de calidad del aire de la OMS (2021),
        #   dado que la NOM-025 solo regula material particulado.
        self.thresholds = {
            'pm25': {
                'good': (0, 12),
                'moderate': (12.1, 45),
                'unhealthy_sensitive': (45.1, 97.4),
                'unhealthy': (97.5, 150.4),
                'very_unhealthy': (150.5, 250.4),
                'hazardous': (250.5, float('inf'))
            },
            'pm10': {
                'good': (0, 50),
                'moderate': (50.1, 75),
                'unhealthy_sensitive': (75.1, 155),
                'unhealthy': (155.1, 254),
                'very_unhealthy': (254.1, 354),
                'hazardous': (354.1, float('inf'))
            },
            'no2': {
                'good': (0, 53),
                'moderate': (53.1, 100),
                'unhealthy_sensitive': (100.1, 188),
                'unhealthy': (188.1, 677),
                'very_unhealthy': (677.1, 1221),
                'hazardous': (1221.1, float('inf'))
            },
            'o3': {
                'good': (0, 50),
                'moderate': (50.1, 100),
                'unhealthy_sensitive': (100.1, 168),
                'unhealthy': (168.1, 208),
                'very_unhealthy': (208.1, 748),
                'hazardous': (748.1, float('inf'))
            },
            'co': {
                'good': (0, 4.4),
                'moderate': (4.5, 9.4),
                'unhealthy_sensitive': (9.5, 12.4),
                'unhealthy': (12.5, 15.4),
                'very_unhealthy': (15.5, 30.4),
                'hazardous': (30.5, float('inf'))
            }
        }
        
        self.recommendations = {
            AlertLevel.GOOD: {
                'general': 'La calidad del aire es satisfactoria. Ideal para actividades al aire libre.',
                'sensitive': 'Sin restricciones para grupos sensibles.',
                'activities': ['Todas las actividades al aire libre son seguras']
            },
            AlertLevel.MODERATE: {
                'general': 'La calidad del aire es aceptable. Algunas personas sensibles pueden experimentar síntomas.',
                'sensitive': 'Personas con enfermedades respiratorias deben limitar esfuerzos prolongados al aire libre.',
                'activities': ['Reducir actividades intensas al aire libre', 'Mantener ventanas cerradas si es sensible']
            },
            AlertLevel.UNHEALTHY_SENSITIVE: {
                'general': 'Grupos sensibles pueden experimentar efectos en la salud.',
                'sensitive': 'Niños, adultos mayores y personas con enfermedades deben evitar esfuerzos al aire libre.',
                'activities': ['Evitar ejercicio intenso al aire libre', 'Usar mascarilla si debe salir', 'Mantener ventanas cerradas']
            },
            AlertLevel.UNHEALTHY: {
                'general': 'Todos pueden experimentar efectos en la salud.',
                'sensitive': 'Evitar toda actividad al aire libre.',
                'activities': ['Cancelar actividades al aire libre', 'Usar mascarilla N95', 'Permanecer en interiores']
            },
            AlertLevel.VERY_UNHEALTHY: {
                'general': 'Advertencia sanitaria: todos pueden experimentar efectos graves.',
                'sensitive': 'Permanecer en interiores con aire filtrado.',
                'activities': ['No salir de casa', 'Usar purificadores de aire', 'Sellar ventanas y puertas']
            },
            AlertLevel.HAZARDOUS: {
                'general': 'EMERGENCIA SANITARIA: Condiciones peligrosas para toda la población.',
                'sensitive': 'Buscar atención médica si experimenta síntomas.',
                'activities': ['Emergencia: permanecer en interiores', 'Usar mascarilla N95 incluso en interiores', 'Considerar evacuación']
            }
        }
        
        self.alert_history = []
        self.subscribers = []
        
        # Inicializar servicio de email
        self.email_service = EmailService()
        
        # Track last notification time to avoid spam
        self.last_notification_time = {}
        self.min_notification_interval = timedelta(hours=1)  # Mínimo 1 hora entre notificaciones
    
    def evaluate_air_quality(self, pollutant_data: Dict[str, float], send_notifications: bool = True, db: Optional[Session] = None) -> Dict:
        """Evalúa la calidad del aire y genera alertas si es necesario"""
        alerts = []
        worst_level = AlertLevel.GOOD
        
        for pollutant, value in pollutant_data.items():
            if pollutant not in self.thresholds:
                continue
                
            level = self._get_alert_level(pollutant, value)
            
            if level != AlertLevel.GOOD:
                alert = {
                    'pollutant': pollutant,
                    'value': value,
                    'level': level,
                    'timestamp': datetime.now().isoformat()
                }
                alerts.append(alert)
                
                # Actualizar el peor nivel
                if self._compare_levels(level, worst_level) > 0:
                    worst_level = level
        
        # Generar resumen de evaluación
        evaluation = {
            'timestamp': datetime.now().isoformat(),
            'overall_level': worst_level,
            'alerts': alerts,
            'recommendations': self.recommendations[worst_level],
            'aqi': self._calculate_aqi(pollutant_data)
        }
        
        # Si hay alertas significativas, notificar
        if send_notifications and worst_level not in [AlertLevel.GOOD, AlertLevel.MODERATE]:
            self._send_notifications(evaluation, db)
        
        # Guardar en historial
        self.alert_history.append(evaluation)
        
        return evaluation
    
    def _get_alert_level(self, pollutant: str, value: float) -> AlertLevel:
        """Determina el nivel de alerta para un contaminante específico"""
        thresholds = self.thresholds[pollutant]
        
        for level_name, (min_val, max_val) in thresholds.items():
            if min_val <= value <= max_val:
                return AlertLevel[level_name.upper()]
        
        return AlertLevel.GOOD
    
    def _compare_levels(self, level1: AlertLevel, level2: AlertLevel) -> int:
        """Compara dos niveles de alerta"""
        level_order = [
            AlertLevel.GOOD,
            AlertLevel.MODERATE,
            AlertLevel.UNHEALTHY_SENSITIVE,
            AlertLevel.UNHEALTHY,
            AlertLevel.VERY_UNHEALTHY,
            AlertLevel.HAZARDOUS
        ]
        
        return level_order.index(level1) - level_order.index(level2)
    
    def _calculate_aqi(self, pollutant_data: Dict[str, float]) -> Dict[str, float]:
        """Calcula el Índice de Calidad del Aire (AQI) para cada contaminante"""
        aqi_breakpoints = {
            'pm25': [
                (0, 12, 0, 50),
                (12.1, 35.4, 51, 100),
                (35.5, 55.4, 101, 150),
                (55.5, 150.4, 151, 200),
                (150.5, 250.4, 201, 300),
                (250.5, 500.4, 301, 500)
            ],
            'pm10': [
                (0, 54, 0, 50),
                (55, 154, 51, 100),
                (155, 254, 101, 150),
                (255, 354, 151, 200),
                (355, 424, 201, 300),
                (425, 604, 301, 500)
            ]
        }
        
        aqi_values = {}
        
        for pollutant, value in pollutant_data.items():
            if pollutant not in aqi_breakpoints:
                continue
                
            # Encontrar el rango correspondiente
            for c_low, c_high, i_low, i_high in aqi_breakpoints[pollutant]:
                if c_low <= value <= c_high:
                    # Fórmula AQI
                    aqi = ((i_high - i_low) / (c_high - c_low)) * (value - c_low) + i_low
                    aqi_values[pollutant] = round(aqi, 1)
                    break
        
        # AQI general es el máximo
        if aqi_values:
            aqi_values['overall'] = max(aqi_values.values())
        
        return aqi_values
    
    def _send_notifications(self, evaluation: Dict, db: Optional[Session] = None):
        """
        Envía notificaciones por correo electrónico a los suscriptores
        Incluye rate limiting para evitar spam usando la base de datos
        """
        if not self.subscribers:
            logger.info("No hay suscriptores para notificar")
            return
        
        current_time = datetime.now()
        overall_level = evaluation['overall_level']  # Mantener como enum AlertLevel
        
        # VERIFICACIÓN GLOBAL DE RATE LIMITING (EN MEMORIA)
        last_time = self.last_notification_time.get(overall_level)
        if last_time and (current_time - last_time) < self.min_notification_interval:
            time_since_last = current_time - last_time
            logger.info(f"⏭️ Omitiendo notificaciones - última alerta de nivel '{overall_level.value}' enviada hace {time_since_last}")
            logger.info(f"⏰ Próxima notificación permitida en: {self.min_notification_interval - time_since_last}")
            return
        
        level = overall_level.value  # Ahora sí convertir a string para logs
        
        # Log en consola
        logger.info(f"\n⚠️ ENVIANDO ALERTAS DE CALIDAD DEL AIRE - {level.upper()}")
        logger.info(f"Hora: {evaluation['timestamp']}")
        logger.info(f"AQI General: {evaluation['aqi'].get('overall', 'N/A')}")
        logger.info(f"Suscriptores: {len(self.subscribers)}")
        
        # Enviar correos
        sent_count = 0
        failed_count = 0
        skipped_count = 0
        
        for email in self.subscribers:
            try:
                # Si tenemos acceso a la DB, verificar rate limiting por suscriptor
                if db:
                    subscription = db.query(models.AlertSubscription).filter(
                        models.AlertSubscription.email == email,
                        models.AlertSubscription.is_active == True
                    ).first()
                    
                    if subscription and subscription.last_notification_sent:
                        time_since_last = current_time - subscription.last_notification_sent
                        if time_since_last < self.min_notification_interval:
                            logger.info(f"Omitiendo {email} - última notificación hace {time_since_last}")
                            skipped_count += 1
                            continue
                
                # Enviar correo
                success = self.email_service.send_alert_email(email, evaluation)
                if success:
                    sent_count += 1
                    
                    # Actualizar en base de datos
                    if db:
                        subscription = db.query(models.AlertSubscription).filter(
                            models.AlertSubscription.email == email
                        ).first()
                        
                        if subscription:
                            subscription.last_notification_sent = current_time
                            subscription.notification_count += 1
                            db.commit()
                else:
                    failed_count += 1
            except Exception as e:
                logger.error(f"Error enviando correo a {email}: {str(e)}")
                failed_count += 1
        
        # Actualizar último tiempo de notificación en memoria usando el enum como key
        self.last_notification_time[overall_level] = current_time
        
        logger.info(f"✓ Notificaciones enviadas: {sent_count}")
        if skipped_count > 0:
            logger.info(f"⏭️ Omitidas (rate limit): {skipped_count}")
        if failed_count > 0:
            logger.warning(f"✗ Notificaciones fallidas: {failed_count}")
    
    def get_historical_alerts(self, hours: int = 24) -> List[Dict]:
        """Obtiene alertas históricas de las últimas horas especificadas"""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        
        return [
            alert for alert in self.alert_history
            if datetime.fromisoformat(alert['timestamp']) > cutoff_time
        ]
    
    def generate_daily_report(self) -> Dict:
        """Genera un reporte diario de calidad del aire"""
        alerts_24h = self.get_historical_alerts(24)
        
        if not alerts_24h:
            return {
                'message': 'No hay datos suficientes para generar el reporte',
                'timestamp': datetime.now().isoformat()
            }
        
        # Análisis estadístico
        level_counts = {}
        pollutant_stats = {}
        
        for alert in alerts_24h:
            # Contar niveles
            level = alert['overall_level'].value
            level_counts[level] = level_counts.get(level, 0) + 1
            
            # Estadísticas por contaminante
            for pollutant_alert in alert['alerts']:
                pollutant = pollutant_alert['pollutant']
                value = pollutant_alert['value']
                
                if pollutant not in pollutant_stats:
                    pollutant_stats[pollutant] = []
                pollutant_stats[pollutant].append(value)
        
        # Calcular promedios y máximos
        summary_stats = {}
        for pollutant, values in pollutant_stats.items():
            summary_stats[pollutant] = {
                'average': sum(values) / len(values),
                'maximum': max(values),
                'minimum': min(values)
            }
        
        report = {
            'timestamp': datetime.now().isoformat(),
            'period': '24 hours',
            'total_alerts': len(alerts_24h),
            'level_distribution': level_counts,
            'pollutant_statistics': summary_stats,
            'worst_hour': self._find_worst_hour(alerts_24h),
            'recommendations': self._generate_daily_recommendations(level_counts)
        }
        
        return report
    
    def _find_worst_hour(self, alerts: List[Dict]) -> Dict:
        """Encuentra la hora con peor calidad del aire"""
        worst_alert = None
        worst_aqi = 0
        
        for alert in alerts:
            current_aqi = alert['aqi'].get('overall', 0)
            if current_aqi > worst_aqi:
                worst_aqi = current_aqi
                worst_alert = alert
        
        return {
            'timestamp': worst_alert['timestamp'] if worst_alert else None,
            'aqi': worst_aqi,
            'level': worst_alert['overall_level'].value if worst_alert else None
        }
    
    def _generate_daily_recommendations(self, level_counts: Dict) -> List[str]:
        """Genera recomendaciones basadas en el análisis diario"""
        recommendations = []
        
        total_alerts = sum(level_counts.values())
        if total_alerts == 0:
            return ["Sin datos suficientes para recomendaciones"]
        
        # Calcular porcentaje de tiempo en cada nivel
        for level, count in level_counts.items():
            percentage = (count / total_alerts) * 100
            
            if level in ['muy_insalubre', 'peligroso'] and percentage > 10:
                recommendations.append(
                    f"⚠️ CRÍTICO: {percentage:.1f}% del tiempo en nivel {level}. "
                    "Se recomienda evitar actividades al aire libre."
                )
            elif level == 'insalubre' and percentage > 25:
                recommendations.append(
                    f"Precaución: {percentage:.1f}% del tiempo en nivel insalubre. "
                    "Limitar exposición al aire libre."
                )
        
        if not recommendations:
            recommendations.append("La calidad del aire se ha mantenido en niveles aceptables.")
        
        return recommendations
    
    def subscribe_email(self, email: str) -> bool:
        """Suscribe un email para recibir alertas"""
        if email not in self.subscribers:
            self.subscribers.append(email)
            logger.info(f"✓ Suscripción agregada: {email}")
            return True
        return False
    
    def unsubscribe_email(self, email: str) -> bool:
        """Desuscribe un email de las alertas"""
        if email in self.subscribers:
            self.subscribers.remove(email)
            logger.info(f"✓ Suscripción removida: {email}")
            return True
        return False
    
    def get_subscribers(self) -> List[str]:
        """Obtiene la lista de suscriptores"""
        return self.subscribers.copy()
