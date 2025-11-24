"""
Sistema de Monitoreo Automático de Calidad del Aire
Este script verifica periódicamente la calidad del aire y envía alertas por correo
SOLO cuando los niveles sean preocupantes (Moderado o peor)
"""

import asyncio
import time
from datetime import datetime, timedelta
from typing import Dict, Optional
import logging

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class AirQualityMonitor:
    """Monitor automático de calidad del aire con alertas por correo"""
    
    def __init__(self):
        """Inicializa el monitor"""
        self.last_alert_time: Optional[datetime] = None
        self.last_alert_level: Optional[str] = None
        self.alert_cooldown_minutes = 60  # No enviar alertas más seguido que cada hora
        
        # Importar aquí para evitar errores de importación circular
        from alert_system import AlertSystem
        from data_collectors.air_quality_collector import OpenMeteoCollector
        from database import SessionLocal
        
        self.alert_system = AlertSystem()
        self.air_quality_collector = OpenMeteoCollector()
        self.SessionLocal = SessionLocal
        
        logger.info("✓ Monitor de calidad del aire inicializado")
    
    def should_send_alert(self, current_level: str) -> bool:
        """
        Determina si se debe enviar una alerta basado en:
        - Nivel de contaminación actual
        - Tiempo desde la última alerta
        - Cambio en el nivel de alerta
        """
        # Solo enviar alertas para niveles preocupantes
        alertable_levels = ['moderado', 'insalubre_sensibles', 'insalubre', 'muy_insalubre', 'peligroso']
        
        if current_level not in alertable_levels:
            logger.info(f"Nivel '{current_level}' no requiere alerta")
            return False
        
        # Si nunca se ha enviado alerta, enviar ahora
        if self.last_alert_time is None:
            logger.info(f"Primera alerta - Enviando para nivel '{current_level}'")
            return True
        
        # Verificar cooldown
        time_since_last_alert = datetime.now() - self.last_alert_time
        if time_since_last_alert < timedelta(minutes=self.alert_cooldown_minutes):
            minutes_left = self.alert_cooldown_minutes - (time_since_last_alert.total_seconds() / 60)
            logger.info(f"En cooldown - Faltan {minutes_left:.1f} minutos para poder enviar otra alerta")
            return False
        
        # Si el nivel empeoró, enviar alerta inmediatamente
        level_priority = {
            'moderado': 1,
            'insalubre_sensibles': 2,
            'insalubre': 3,
            'muy_insalubre': 4,
            'peligroso': 5
        }
        
        current_priority = level_priority.get(current_level, 0)
        last_priority = level_priority.get(self.last_alert_level, 0)
        
        if current_priority > last_priority:
            logger.info(f"Nivel empeoró de '{self.last_alert_level}' a '{current_level}' - Enviando alerta")
            return True
        
        # Si pasó el cooldown y el nivel sigue siendo preocupante, enviar alerta de recordatorio
        logger.info(f"Cooldown terminado - Enviando alerta de recordatorio para nivel '{current_level}'")
        return True
    
    async def check_and_alert(self):
        """Verifica la calidad del aire y envía alertas si es necesario"""
        try:
            logger.info("=" * 80)
            logger.info("🔍 Verificando calidad del aire...")
            
            # Obtener datos actuales de calidad del aire
            air_quality_data = await self.air_quality_collector.get_air_quality_data()
            
            if not air_quality_data or len(air_quality_data) == 0:
                logger.warning("⚠️ No se pudieron obtener datos de calidad del aire")
                return
            
            # Usar el primer conjunto de datos
            reading = air_quality_data[0]
            
            # Preparar datos para evaluar
            pollutant_data = {
                'pm25': reading.get('pm25', 0),
                'pm10': reading.get('pm10', 0),
                'no2': reading.get('no2', 0),
                'o3': reading.get('o3', 0),
                'co': reading.get('co', 0)
            }
            
            logger.info(f"📊 Niveles actuales:")
            logger.info(f"   PM2.5: {pollutant_data['pm25']:.2f} µg/m³")
            logger.info(f"   PM10:  {pollutant_data['pm10']:.2f} µg/m³")
            logger.info(f"   NO2:   {pollutant_data['no2']:.2f} µg/m³")
            logger.info(f"   O3:    {pollutant_data['o3']:.2f} µg/m³")
            logger.info(f"   CO:    {pollutant_data['co']:.3f} mg/m³")
            
            # Evaluar calidad del aire
            evaluation = self.alert_system.evaluate_air_quality(pollutant_data)
            current_level = evaluation.get('overall_level', {}).get('value', 'desconocido')
            
            logger.info(f"🎯 Nivel de calidad: {current_level.upper()}")
            
            # Determinar si se debe enviar alerta
            if self.should_send_alert(current_level):
                logger.info("📧 Enviando alertas por correo...")
                
                # Obtener suscriptores activos de la base de datos
                db = self.SessionLocal()
                try:
                    from models import AlertSubscription
                    
                    subscribers = db.query(AlertSubscription).filter(
                        AlertSubscription.is_active == True
                    ).all()
                    
                    if not subscribers:
                        logger.warning("⚠️ No hay suscriptores activos")
                    else:
                        logger.info(f"👥 Enviando a {len(subscribers)} suscriptor(es)...")
                        
                        # Enviar notificaciones
                        success_count = self.alert_system.send_notifications(evaluation)
                        
                        if success_count > 0:
                            logger.info(f"✅ Alertas enviadas exitosamente a {success_count} usuario(s)")
                            
                            # Actualizar estadísticas en la base de datos
                            for sub in subscribers:
                                sub.notification_count += 1
                                sub.last_notification_sent = datetime.utcnow()
                            
                            db.commit()
                            
                            # Actualizar control de alertas
                            self.last_alert_time = datetime.now()
                            self.last_alert_level = current_level
                        else:
                            logger.error("❌ No se pudieron enviar las alertas")
                
                finally:
                    db.close()
            else:
                logger.info("✓ No es necesario enviar alertas en este momento")
            
            logger.info("=" * 80)
            logger.info("")
            
        except Exception as e:
            logger.error(f"❌ Error en check_and_alert: {str(e)}")
            import traceback
            traceback.print_exc()
    
    async def run_continuous(self, check_interval_minutes: int = 60):
        """
        Ejecuta el monitor de forma continua
        
        Args:
            check_interval_minutes: Minutos entre cada verificación (por defecto 60)
        """
        logger.info("=" * 80)
        logger.info("🚀 MONITOR DE CALIDAD DEL AIRE - INICIANDO")
        logger.info("=" * 80)
        logger.info(f"⏱️  Intervalo de verificación: {check_interval_minutes} minutos")
        logger.info(f"⏱️  Cooldown entre alertas: {self.alert_cooldown_minutes} minutos")
        logger.info(f"📧 Sistema de correos: {'Configurado' if self.alert_system.email_service.configured else 'NO configurado'}")
        logger.info("=" * 80)
        logger.info("")
        
        while True:
            try:
                await self.check_and_alert()
                
                # Esperar hasta la próxima verificación
                logger.info(f"⏸️  Esperando {check_interval_minutes} minutos hasta la próxima verificación...")
                logger.info(f"⏰ Próxima verificación: {(datetime.now() + timedelta(minutes=check_interval_minutes)).strftime('%H:%M:%S')}")
                logger.info("")
                
                await asyncio.sleep(check_interval_minutes * 60)
                
            except KeyboardInterrupt:
                logger.info("\n👋 Monitor detenido por el usuario")
                break
            except Exception as e:
                logger.error(f"❌ Error inesperado: {str(e)}")
                logger.info("⏸️  Esperando 5 minutos antes de reintentar...")
                await asyncio.sleep(300)  # Esperar 5 minutos antes de reintentar

async def main():
    """Función principal"""
    monitor = AirQualityMonitor()
    
    # Ejecutar verificación inmediata
    logger.info("🧪 Ejecutando verificación inicial...")
    await monitor.check_and_alert()
    
    # Continuar con monitoreo automático
    await monitor.run_continuous(check_interval_minutes=60)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("\n👋 Programa terminado")
