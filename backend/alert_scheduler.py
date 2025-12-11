"""
============================================================================
Sistema de Monitoreo de Calidad del Aire - Xalapa, Veracruz
============================================================================

ARCHIVO: alert_scheduler.py
PROPÓSITO: Programador de verificaciones automáticas de calidad del aire

FUNCIONAMIENTO:
    - Ejecuta verificaciones cada 30 minutos (configurable)
    - Obtiene datos frescos de Open-Meteo
    - Evalúa si PM2.5 supera umbral de alerta (35.4 µg/m³)
    - Envía notificaciones por email a suscriptores
    - Previene spam con intervalo mínimo de 1 hora entre alertas

NOTA: Corre en un thread separado para no bloquear el servidor.

AUTOR: Kevin Morales
VERSIÓN: 2.1.0
============================================================================
"""

import asyncio
import threading
from datetime import datetime, timedelta
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class AlertScheduler:
    """
    Scheduler para verificación automática de calidad del aire.
    Ejecuta verificaciones cada X minutos y envía alertas si los niveles
    de contaminación superan los umbrales establecidos.
    """

    def __init__(self, interval_minutes: int = 30):
        self.interval_minutes = interval_minutes
        self.is_running = False
        self._stop_event = threading.Event()
        self._thread: Optional[threading.Thread] = None
        self.last_check: Optional[datetime] = None
        self.last_alert_sent: Optional[datetime] = None
        self.checks_count = 0
        self.alerts_sent_count = 0

        # Umbral para enviar alertas (PM2.5 > 35.4 = Insalubre para grupos sensibles)
        self.pm25_alert_threshold = 35.4

        # Mínimo tiempo entre alertas (evitar spam)
        self.min_alert_interval = timedelta(hours=1)

        logger.info(f"📅 AlertScheduler inicializado - Intervalo: {interval_minutes} minutos")

    def start(self, app_context: dict):
        """Inicia el scheduler en un thread separado."""
        if self.is_running:
            logger.warning("⚠️ Scheduler ya está corriendo")
            return

        self.app_context = app_context
        self._stop_event.clear()
        self.is_running = True

        self._thread = threading.Thread(target=self._run_loop, daemon=True)
        self._thread.start()

        logger.info("✅ AlertScheduler iniciado en background")
        print("\n" + "="*60)
        print("📅 SCHEDULER DE ALERTAS INICIADO")
        print(f"   Intervalo: cada {self.interval_minutes} minutos")
        print(f"   Umbral PM2.5: {self.pm25_alert_threshold} µg/m³")
        print(f"   Mínimo entre alertas: {self.min_alert_interval}")
        print("="*60 + "\n")

    def stop(self):
        """Detiene el scheduler."""
        if not self.is_running:
            return
        self._stop_event.set()
        self.is_running = False
        if self._thread:
            self._thread.join(timeout=5)
        logger.info("🛑 AlertScheduler detenido")

    def _run_loop(self):
        """Loop principal del scheduler (ejecuta en thread separado)."""
        logger.info("⏳ Esperando 60 segundos antes de la primera verificación...")

        if self._stop_event.wait(60):
            return

        while not self._stop_event.is_set():
            try:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                loop.run_until_complete(self._check_and_alert())
                loop.close()
            except Exception as e:
                logger.error(f"❌ Error en ciclo del scheduler: {str(e)}")
                import traceback
                traceback.print_exc()

            self._stop_event.wait(self.interval_minutes * 60)

    async def _check_and_alert(self):
        """Verifica la calidad del aire y envía alertas si es necesario."""
        self.checks_count += 1
        self.last_check = datetime.now()

        print("\n" + "="*60)
        print(f"🔍 VERIFICACIÓN AUTOMÁTICA #{self.checks_count}")
        print(f"   Hora: {self.last_check.strftime('%Y-%m-%d %H:%M:%S')}")
        print("="*60)

        try:
            openmeteo_collector = self.app_context.get('openmeteo_collector')
            if not openmeteo_collector:
                logger.error("❌ openmeteo_collector no disponible")
                return

            print("📡 Consultando Open-Meteo...")
            air_data = await openmeteo_collector.get_air_quality_data()

            if not air_data or len(air_data) == 0:
                print("⚠️ No se obtuvieron datos de calidad del aire")
                return

            latest = air_data[-1]
            pm25 = latest.get('pm25', 0)
            pm10 = latest.get('pm10', 0)

            print(f"📊 Datos obtenidos:")
            print(f"   PM2.5: {pm25:.2f} µg/m³ (umbral: {self.pm25_alert_threshold})")
            print(f"   PM10: {pm10:.2f} µg/m³")

            if pm25 > self.pm25_alert_threshold:
                print(f"\n🚨 PM2.5 SUPERA EL UMBRAL ({pm25:.2f} > {self.pm25_alert_threshold})")

                if self.last_alert_sent:
                    time_since_last = datetime.now() - self.last_alert_sent
                    if time_since_last < self.min_alert_interval:
                        remaining = self.min_alert_interval - time_since_last
                        print(f"⏳ Rate limit activo - Próxima alerta permitida en: {remaining}")
                        return

                await self._send_alerts(latest)
            else:
                print(f"✅ Niveles dentro de lo aceptable - No se envían alertas")

        except Exception as e:
            logger.error(f"❌ Error en verificación: {str(e)}")
            import traceback
            traceback.print_exc()

        print("="*60 + "\n")

    async def _send_alerts(self, air_data: dict):
        """Envía alertas a todos los suscriptores activos."""
        alert_system = self.app_context.get('alert_system')
        get_db = self.app_context.get('get_db')

        if not alert_system or not get_db:
            logger.error("❌ alert_system o get_db no disponible")
            return

        try:
            db = next(get_db())
        except Exception as e:
            logger.error(f"❌ Error obteniendo sesión de BD: {str(e)}")
            return

        try:
            pollutant_data = {
                'pm25': air_data.get('pm25', 0),
                'pm10': air_data.get('pm10', 0),
                'no2': air_data.get('no2', 0),
                'o3': air_data.get('o3', 0),
                'co': air_data.get('co', 0)
            }

            print(f"\n📧 ENVIANDO ALERTAS A SUSCRIPTORES...")
            print(f"   Suscriptores activos: {len(alert_system.subscribers)}")

            if len(alert_system.subscribers) == 0:
                print("   ⚠️ No hay suscriptores activos")
                return

            evaluation = alert_system.evaluate_air_quality(
                pollutant_data,
                send_notifications=True,
                db=db
            )

            self.last_alert_sent = datetime.now()
            self.alerts_sent_count += 1

            level = evaluation.get('overall_level')
            level_str = level.value if hasattr(level, 'value') else str(level)

            print(f"   ✅ Alertas procesadas")
            print(f"   Nivel: {level_str}")
            print(f"   Total alertas enviadas históricas: {self.alerts_sent_count}")

        except Exception as e:
            logger.error(f"❌ Error enviando alertas: {str(e)}")
            import traceback
            traceback.print_exc()
        finally:
            db.close()

    def get_status(self) -> dict:
        """Obtiene el estado actual del scheduler."""
        return {
            'is_running': self.is_running,
            'interval_minutes': self.interval_minutes,
            'pm25_threshold': self.pm25_alert_threshold,
            'last_check': self.last_check.isoformat() if self.last_check else None,
            'last_alert_sent': self.last_alert_sent.isoformat() if self.last_alert_sent else None,
            'checks_count': self.checks_count,
            'alerts_sent_count': self.alerts_sent_count,
            'next_check_in_minutes': self.interval_minutes if self.is_running else None
        }


# Instancia global del scheduler
alert_scheduler = AlertScheduler(interval_minutes=30)
