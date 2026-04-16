"""
============================================================================
Sistema de Monitoreo de Calidad del Aire - Xalapa, Veracruz
============================================================================

ARCHIVO: alert_scheduler.py
PROPÓSITO: Programador de verificaciones automáticas de calidad del aire

FUNCIONAMIENTO:
    - Ejecuta verificaciones cada 30 minutos (configurable)
    - Obtiene datos frescos de Open-Meteo
    - Evalúa los 5 contaminantes (PM2.5, PM10, NO2, O3, CO) delegando
      la clasificación de severidad a AlertSystem.evaluate_air_quality()
    - Envía notificaciones por email a suscriptores cuando el nivel
      global supera "moderado" (es decir, "insalubre_sensibles" o peor)
    - Previene spam con intervalo mínimo de 1 hora entre alertas

NOTA: Corre en un thread separado para no bloquear el servidor.

AUTOR: Kevin Morales
VERSIÓN: 2.2.0
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

        # Niveles de severidad que disparan envío de alertas.
        # La evaluación se delega a AlertSystem.evaluate_air_quality(),
        # que considera los 5 contaminantes (PM2.5, PM10, NO2, O3, CO)
        # con el esquema híbrido AQI-EPA / NOM-025-SSA1-2021.
        self.alert_levels = {
            'insalubre_sensibles',
            'insalubre',
            'muy_insalubre',
            'peligroso'
        }

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
        print(f"   Niveles que disparan alerta: {', '.join(sorted(self.alert_levels))}")
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

            # Construir el diccionario completo con los 5 contaminantes
            pollutant_data = {
                'pm25': latest.get('pm25', 0) or 0,
                'pm10': latest.get('pm10', 0) or 0,
                'no2': latest.get('no2', 0) or 0,
                'o3': latest.get('o3', 0) or 0,
                'co': latest.get('co', 0) or 0
            }

            print(f"📊 Datos obtenidos:")
            print(f"   PM2.5: {pollutant_data['pm25']:.2f} µg/m³")
            print(f"   PM10:  {pollutant_data['pm10']:.2f} µg/m³")
            print(f"   NO2:   {pollutant_data['no2']:.2f} µg/m³")
            print(f"   O3:    {pollutant_data['o3']:.2f} µg/m³")
            print(f"   CO:    {pollutant_data['co']:.3f} mg/m³")

            # Delegar la evaluación al AlertSystem (que ya conoce los 5
            # contaminantes y aplica el esquema híbrido AQI-EPA / NOM-025).
            alert_system = self.app_context.get('alert_system')
            if not alert_system:
                logger.error("❌ alert_system no disponible para evaluación previa")
                return

            preview = alert_system.evaluate_air_quality(
                pollutant_data,
                send_notifications=False,
                db=None
            )
            overall_level = preview.get('overall_level')
            level_value = overall_level.value if hasattr(overall_level, 'value') else str(overall_level)

            print(f"   Nivel global evaluado: {level_value}")

            if level_value in self.alert_levels:
                print(f"\n🚨 NIVEL '{level_value}' SUPERA EL UMBRAL DE ALERTA")

                if self.last_alert_sent:
                    time_since_last = datetime.now() - self.last_alert_sent
                    if time_since_last < self.min_alert_interval:
                        remaining = self.min_alert_interval - time_since_last
                        print(f"⏳ Rate limit activo - Próxima alerta permitida en: {remaining}")
                        return

                await self._send_alerts(latest)
            else:
                print(f"✅ Niveles dentro de lo aceptable ('{level_value}') - No se envían alertas")

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
            'alert_levels': sorted(self.alert_levels),
            'evaluated_pollutants': ['pm25', 'pm10', 'no2', 'o3', 'co'],
            'last_check': self.last_check.isoformat() if self.last_check else None,
            'last_alert_sent': self.last_alert_sent.isoformat() if self.last_alert_sent else None,
            'checks_count': self.checks_count,
            'alerts_sent_count': self.alerts_sent_count,
            'next_check_in_minutes': self.interval_minutes if self.is_running else None
        }


# Instancia global del scheduler
alert_scheduler = AlertScheduler(interval_minutes=30)
