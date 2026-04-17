"""
============================================================================
Sistema de Monitoreo de Calidad del Aire - Xalapa, Veracruz
============================================================================

ARCHIVO: email_service.py
PROPÓSITO: Servicio de envío de correos electrónicos

FUNCIONALIDADES:
    - Envío de alertas de calidad del aire
    - Correos de bienvenida a nuevos suscriptores
    - Correos de prueba para verificar configuración

CONFIGURACIÓN REQUERIDA (variables de entorno):
    - EMAIL_HOST: Servidor SMTP (default: smtp.gmail.com)
    - EMAIL_PORT: Puerto SMTP (default: 587)
    - EMAIL_HOST_USER: Usuario/email
    - EMAIL_HOST_PASSWORD: Contraseña de aplicación
    - EMAIL_FROM: Remitente

NOTA: Para Gmail, usar "Contraseñas de aplicación" en lugar
      de la contraseña normal de la cuenta.

AUTOR: Kevin Morales
VERSIÓN: 2.1.0
============================================================================
"""

import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from typing import Dict, List
import logging
from dotenv import load_dotenv

try:
    from zoneinfo import ZoneInfo  # Python 3.9+
except ImportError:  # pragma: no cover
    from backports.zoneinfo import ZoneInfo  # type: ignore

load_dotenv()

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        """Inicializa el servicio de correo con configuración del .env"""
        self.host = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
        self.port = int(os.getenv('EMAIL_PORT', '587'))
        self.username = os.getenv('EMAIL_HOST_USER', '')
        self.password = os.getenv('EMAIL_HOST_PASSWORD', '')
        self.from_email = os.getenv('EMAIL_FROM', self.username)
        self.use_tls = os.getenv('EMAIL_USE_TLS', 'True').lower() == 'true'

        # URL pública del dashboard (frontend en Vercel).
        # Se permite override por entorno para no tener que hardcodear.
        self.dashboard_url = os.getenv(
            'DASHBOARD_URL',
            'https://calidad-aire-xalapa.vercel.app'
        )

        # Zona horaria para mostrar fechas al usuario.
        # El servidor en Render corre en UTC, pero los suscriptores están
        # en Xalapa (America/Mexico_City, UTC-6).
        self.display_tz = ZoneInfo(os.getenv('DISPLAY_TIMEZONE', 'America/Mexico_City'))
        
        # Verificar configuración
        if not self.username or not self.password:
            logger.warning("⚠️ Email no configurado. Revisa las variables EMAIL_HOST_USER y EMAIL_HOST_PASSWORD en .env")
            self.configured = False
        else:
            self.configured = True
            logger.info(f"✓ Servicio de email configurado: {self.username}")
    
    def send_alert_email(self, to_email: str, alert_data: Dict, unsubscribe_token: str = None) -> bool:
        """
        Envía un correo de alerta de calidad del aire

        Args:
            to_email: Correo del destinatario
            alert_data: Datos de la alerta con niveles de contaminación
            unsubscribe_token: Token opaco del suscriptor para construir el
                link de desuscripción con un clic en el footer del email.

        Returns:
            bool: True si se envió exitosamente, False si falló
        """
        if not self.configured:
            logger.warning(f"No se puede enviar correo - servicio no configurado")
            return False

        try:
            # Crear mensaje
            msg = MIMEMultipart('alternative')
            msg['Subject'] = self._get_email_subject(alert_data)
            msg['From'] = self.from_email
            msg['To'] = to_email

            # Crear contenido HTML
            html_content = self._create_html_email(alert_data, to_email, unsubscribe_token)

            # Crear contenido texto plano
            text_content = self._create_text_email(alert_data, to_email, unsubscribe_token)
            
            # Agregar ambas partes
            part1 = MIMEText(text_content, 'plain')
            part2 = MIMEText(html_content, 'html')
            
            msg.attach(part1)
            msg.attach(part2)
            
            # Enviar correo
            with smtplib.SMTP(self.host, self.port) as server:
                if self.use_tls:
                    server.starttls()
                server.login(self.username, self.password)
                server.send_message(msg)
            
            logger.info(f"✓ Correo de alerta enviado a {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"✗ Error enviando correo a {to_email}: {str(e)}")
            return False
    
    def _build_unsubscribe_url(self, to_email: str, unsubscribe_token: str) -> str:
        """
        Construye la URL de desuscripción con un clic, que apunta a la
        página `/unsubscribe` del frontend con email y token como query
        params. El frontend consume el endpoint backend para efectuar la baja.
        """
        if not to_email or not unsubscribe_token:
            return ''
        from urllib.parse import quote
        return (
            f"{self.dashboard_url.rstrip('/')}/unsubscribe"
            f"?email={quote(to_email)}&token={quote(unsubscribe_token)}"
        )

    def _format_local_datetime(self, iso_timestamp: str) -> datetime:
        """
        Convierte un timestamp ISO (asumido UTC si no trae tzinfo) a la
        zona horaria configurada para mostrar al usuario (Xalapa).
        """
        try:
            ts = datetime.fromisoformat(iso_timestamp)
        except (TypeError, ValueError):
            ts = datetime.utcnow()

        # datetime.now() en el backend no trae tzinfo; lo interpretamos
        # como UTC (que es lo que usa Render) y convertimos a local.
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=ZoneInfo('UTC'))

        return ts.astimezone(self.display_tz)

    def _get_email_subject(self, alert_data: Dict) -> str:
        """Genera el asunto del correo basado en el nivel de alerta"""
        overall_level = alert_data.get('overall_level')
        level = overall_level.value if overall_level else 'desconocido'
        aqi = alert_data.get('aqi', {}).get('overall', 0)
        
        subjects = {
            'bueno': '✓ Calidad del Aire: Buena',
            'moderado': '⚠️ Alerta de Calidad del Aire: Moderada',
            'insalubre_sensibles': '⚠️ Alerta: Calidad del Aire Insalubre para Grupos Sensibles',
            'insalubre': '🚨 ALERTA: Calidad del Aire Insalubre',
            'muy_insalubre': '🚨 ALERTA SEVERA: Calidad del Aire Muy Insalubre',
            'peligroso': '☠️ EMERGENCIA: Calidad del Aire Peligrosa'
        }
        
        return subjects.get(level, '⚠️ Alerta de Calidad del Aire')
    
    def _create_text_email(self, alert_data: Dict, to_email: str = '', unsubscribe_token: str = None) -> str:
        """Crea versión de texto plano del correo"""
        overall_level = alert_data.get('overall_level')
        level = (overall_level.value if overall_level else 'desconocido').upper()
        local_ts = self._format_local_datetime(
            alert_data.get('timestamp', datetime.utcnow().isoformat())
        )
        aqi = alert_data.get('aqi', {}).get('overall', 'N/A')

        recommendations = alert_data.get('recommendations', {})
        pollutant_details = alert_data.get('pollutant_details', {})

        text = f"""
SISTEMA DE MONITOREO DE CALIDAD DEL AIRE - XALAPA, VERACRUZ

Nivel de Calidad del Aire: {level}
Índice AQI: {aqi}
Fecha y Hora: {local_ts.strftime('%d/%m/%Y %H:%M')} (hora local de Xalapa)

CONCENTRACIONES MEDIDAS:
"""

        # Orden fijo para que PM2.5 aparezca primero
        order = ['pm25', 'pm10', 'no2', 'o3', 'co']
        for key in order:
            detail = pollutant_details.get(key)
            if not detail:
                continue
            marker = '  ⚠️ ' if detail.get('triggered') else '     '
            value = detail.get('value', 0) or 0
            decimals = 3 if key == 'co' else 2
            text += (
                f"{marker}{detail['label']:<6}: {value:.{decimals}f} "
                f"{detail['unit']}  —  {detail['level'].value}\n"
            )

        text += f"""
(⚠️ = contaminante que disparó la alerta)

RECOMENDACIONES:

General:
{recommendations.get('general', 'No disponible')}

Grupos Sensibles:
{recommendations.get('sensitive', 'No disponible')}

Actividades Recomendadas:
"""

        activities = recommendations.get('activities', [])
        for activity in activities:
            text += f"- {activity}\n"

        unsubscribe_url = self._build_unsubscribe_url(to_email, unsubscribe_token)

        text += f"""

---
Para más información, visita el dashboard: {self.dashboard_url}
"""
        if unsubscribe_url:
            text += (
                f"\nPara desuscribirte con un clic, abre este enlace:\n"
                f"{unsubscribe_url}\n"
            )
        else:
            text += "\nPara desactivar estas notificaciones, ingresa al sistema y desuscríbete.\n"

        return text
    
    def _build_pollutant_table_html(self, pollutant_details: Dict, level_colors: Dict) -> str:
        """
        Construye el bloque HTML con la concentración medida de los 5
        contaminantes, resaltando los que dispararon la alerta.
        """
        if not pollutant_details:
            return ''

        order = ['pm25', 'pm10', 'no2', 'o3', 'co']

        rows_html = ''
        for key in order:
            detail = pollutant_details.get(key)
            if not detail:
                continue

            value = detail.get('value', 0) or 0
            decimals = 3 if key == 'co' else 2
            level_enum = detail.get('level')
            level_str = level_enum.value if hasattr(level_enum, 'value') else str(level_enum)
            row_color = level_colors.get(level_str, '#6b7280')
            triggered = detail.get('triggered', False)

            row_bg = '#fef2f2' if triggered else '#ffffff'
            label_prefix = '⚠️ ' if triggered else ''
            weight = 'bold' if triggered else 'normal'

            rows_html += f"""
                <tr style="background: {row_bg};">
                    <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-weight: {weight};">{label_prefix}{detail['label']}</td>
                    <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-family: 'Courier New', monospace; font-weight: {weight};">{value:.{decimals}f}</td>
                    <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">{detail['unit']}</td>
                    <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">
                        <span style="display: inline-block; padding: 3px 10px; background: {row_color}; color: white; border-radius: 12px; font-size: 12px;">{level_str.replace('_', ' ')}</span>
                    </td>
                </tr>
            """

        return f"""
        <div style="margin-bottom: 20px;">
            <h3 style="color: #1f2937; margin-bottom: 10px;">🧪 Concentraciones medidas</h3>
            <table style="width: 100%; border-collapse: collapse; background: white; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <thead>
                    <tr style="background: #f9fafb;">
                        <th style="padding: 10px 12px; text-align: left; font-size: 13px; color: #374151; border-bottom: 1px solid #e5e7eb;">Contaminante</th>
                        <th style="padding: 10px 12px; text-align: right; font-size: 13px; color: #374151; border-bottom: 1px solid #e5e7eb;">Valor</th>
                        <th style="padding: 10px 12px; text-align: left; font-size: 13px; color: #374151; border-bottom: 1px solid #e5e7eb;">Unidad</th>
                        <th style="padding: 10px 12px; text-align: left; font-size: 13px; color: #374151; border-bottom: 1px solid #e5e7eb;">Estado</th>
                    </tr>
                </thead>
                <tbody>{rows_html}
                </tbody>
            </table>
            <p style="margin: 8px 0 0 0; font-size: 12px; color: #6b7280;">⚠️ Filas resaltadas = contaminantes que dispararon la alerta.</p>
        </div>
        """

    def _create_html_email(self, alert_data: Dict, to_email: str = '', unsubscribe_token: str = None) -> str:
        """Crea versión HTML del correo con estilos"""
        overall_level = alert_data.get('overall_level')
        level = overall_level.value if overall_level else 'desconocido'
        timestamp = self._format_local_datetime(
            alert_data.get('timestamp', datetime.utcnow().isoformat())
        )
        aqi = alert_data.get('aqi', {}).get('overall', 'N/A')
        pollutant_details = alert_data.get('pollutant_details', {})
        unsubscribe_url = self._build_unsubscribe_url(to_email, unsubscribe_token)

        # Colores por nivel individual de cada contaminante
        level_colors = {
            'bueno': '#10b981',
            'moderado': '#f59e0b',
            'insalubre_sensibles': '#f97316',
            'insalubre': '#ef4444',
            'muy_insalubre': '#dc2626',
            'peligroso': '#7c2d12'
        }
        
        # Colores según nivel
        colors = {
            'bueno': '#10b981',
            'moderado': '#f59e0b',
            'insalubre_sensibles': '#f97316',
            'insalubre': '#ef4444',
            'muy_insalubre': '#dc2626',
            'peligroso': '#7c2d12'
        }
        
        color = colors.get(level, '#6b7280')
        
        # Iconos según nivel
        icons = {
            'bueno': '😊',
            'moderado': '😐',
            'insalubre_sensibles': '😷',
            'insalubre': '🤒',
            'muy_insalubre': '😵',
            'peligroso': '☠️'
        }
        
        icon = icons.get(level, '❓')
        
        recommendations = alert_data.get('recommendations', {})
        activities = recommendations.get('activities', [])
        
        html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <div style="width: 80px; height: 80px; background: white; border-radius: 50%; margin: 0 auto 15px auto; display: flex; align-items: center; justify-content: center;">
            <span style="font-size: 40px;">🌍</span>
        </div>
        <h1 style="margin: 0; font-size: 24px;">Sistema de Calidad del Aire</h1>
        <p style="margin: 5px 0 0 0; font-size: 14px;">Xalapa, Veracruz</p>
    </div>
    
    <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <div style="text-align: center; padding: 20px; background: {color}; color: white; border-radius: 10px; margin-bottom: 20px;">
            <div style="font-size: 48px; margin-bottom: 10px;">{icon}</div>
            <h2 style="margin: 0; font-size: 28px;">{level.upper().replace('_', ' ')}</h2>
            <p style="margin: 10px 0 0 0; font-size: 14px;">{timestamp.strftime('%d/%m/%Y %H:%M')} hrs (hora local de Xalapa)</p>
        </div>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 10px 0; font-size: 20px; color: {color};">Índice de Calidad del Aire (AQI)</h3>
            <div style="font-size: 36px; font-weight: bold; color: {color}; text-align: center;">{aqi if isinstance(aqi, (int, float)) else 'N/A'}</div>
            <p style="margin: 10px 0 0 0; text-align: center; font-size: 12px; color: #6b7280;">Escala 0–500: Bueno (0–50) · Moderado (51–100) · Insalubre para grupos sensibles (101–150) · Insalubre (151–200) · Muy insalubre (201–300) · Peligroso (301+)</p>
        </div>

        {self._build_pollutant_table_html(pollutant_details, level_colors)}

        <div style="margin-bottom: 20px;">
            <h3 style="color: #1f2937; border-bottom: 2px solid {color}; padding-bottom: 10px;">📋 Recomendaciones</h3>
            
            <div style="background: #dbeafe; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                <h4 style="margin: 0 0 10px 0; color: #1e40af;">General</h4>
                <p style="margin: 0;">{recommendations.get('general', 'No disponible')}</p>
            </div>
            
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                <h4 style="margin: 0 0 10px 0; color: #92400e;">Grupos Sensibles</h4>
                <p style="margin: 0;">{recommendations.get('sensitive', 'No disponible')}</p>
            </div>
            
            <div style="background: #d1fae5; padding: 15px; border-radius: 8px;">
                <h4 style="margin: 0 0 10px 0; color: #065f46;">Actividades Recomendadas</h4>
                <ul style="margin: 0; padding-left: 20px;">
"""
        
        for activity in activities:
            html += f"                    <li>{activity}</li>\n"
        
        html += f"""
                </ul>
            </div>
        </div>
        
        <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <a href="{self.dashboard_url}" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Ver Dashboard Completo</a>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #6b7280;">
            <p>Este es un correo automático del Sistema de Monitoreo de Calidad del Aire de Xalapa.</p>
            {'<p>Si ya no deseas recibir estas notificaciones, <a href="' + unsubscribe_url + '" style="color: #6b7280; text-decoration: underline;">desuscríbete con un clic</a>.</p>' if unsubscribe_url else '<p>Para desactivar estas notificaciones, accede al sistema y desuscríbete.</p>'}
        </div>
    </div>
</body>
</html>
"""
        
        return html
    
    def send_welcome_email(self, to_email: str) -> bool:
        """Envía un correo de bienvenida al suscribirse"""
        print(f"\n📧 Intentando enviar correo de bienvenida a: {to_email}")
        
        if not self.configured:
            print("  ❌ Servicio de email NO configurado")
            print(f"     EMAIL_HOST_USER: {'configurado' if self.username else 'FALTA'}")
            print(f"     EMAIL_HOST_PASSWORD: {'configurado' if self.password else 'FALTA'}")
            return False
        
        print(f"  ✅ Configuración de email encontrada")
        print(f"     Host: {self.host}:{self.port}")
        print(f"     Usuario: {self.username}")

        try:
            msg = MIMEMultipart()
            msg['Subject'] = '¡Bienvenido al Sistema de Calidad del Aire de Xalapa!'
            msg['From'] = self.from_email
            msg['To'] = to_email

            body = f"""
            <html>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
                    <h1 style="margin: 0;">¡Suscripción Exitosa!</h1>
                </div>

                <div style="padding: 20px;">
                    <p>Gracias por suscribirte al Sistema de Monitoreo de Calidad del Aire de Xalapa.</p>

                    <p>A partir de ahora recibirás notificaciones cuando:</p>
                    <ul>
                        <li>Los niveles de contaminación sean insalubres para grupos sensibles</li>
                        <li>Los niveles de contaminación sean insalubres para toda la población</li>
                        <li>Se presenten condiciones de emergencia sanitaria</li>
                    </ul>

                    <p><strong>No recibirás notificaciones</strong> cuando la calidad del aire sea buena o moderada.</p>

                    <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 0;"><strong>Nota:</strong> Las alertas se envían máximo una vez por hora para evitar saturación de correos.</p>
                    </div>

                    <div style="text-align: center; margin-top: 30px;">
                        <a href="{self.dashboard_url}" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Ver Dashboard</a>
                    </div>
                </div>

                <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
                <p style="font-size: 12px; color: #666; text-align: center;">
                    Sistema de Monitoreo de Calidad del Aire - Xalapa, Veracruz<br>
                    Para desuscribirte, accede al sistema y gestiona tus notificaciones.
                </p>
            </body>
            </html>
            """

            msg.attach(MIMEText(body, 'html'))
            
            print(f"  📤 Conectando al servidor SMTP...")

            with smtplib.SMTP(self.host, self.port) as server:
                if self.use_tls:
                    print(f"  🔐 Iniciando TLS...")
                    server.starttls()
                print(f"  🔑 Autenticando...")
                server.login(self.username, self.password)
                print(f"  📨 Enviando mensaje...")
                server.send_message(msg)

            print(f"  ✅ Correo de bienvenida enviado exitosamente a {to_email}")
            return True

        except smtplib.SMTPAuthenticationError as e:
            print(f"  ❌ ERROR DE AUTENTICACIÓN SMTP: {str(e)}")
            print(f"     Verifica que la contraseña sea una 'Contraseña de aplicación' de Google")
            return False
        except smtplib.SMTPException as e:
            print(f"  ❌ ERROR SMTP: {str(e)}")
            return False
        except Exception as e:
            print(f"  ❌ ERROR INESPERADO enviando correo: {str(e)}")
            import traceback
            traceback.print_exc()
            return False

    def send_test_email(self, to_email: str) -> bool:
        """Envía un correo de prueba para verificar configuración"""
        if not self.configured:
            logger.warning("No se puede enviar correo de prueba - servicio no configurado")
            return False

        try:
            msg = MIMEMultipart()
            msg['Subject'] = '✓ Prueba de Notificaciones - Sistema de Calidad del Aire'
            msg['From'] = self.from_email
            msg['To'] = to_email

            body = """
            <html>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
                <h2>✓ ¡Configuración Exitosa!</h2>
                <p>Este es un correo de prueba del Sistema de Monitoreo de Calidad del Aire de Xalapa.</p>
                <p>Si recibiste este correo, significa que las notificaciones están funcionando correctamente.</p>
                <p>Recibirás alertas cuando los niveles de contaminación alcancen niveles preocupantes.</p>
                <hr>
                <p style="font-size: 12px; color: #666;">Sistema de Calidad del Aire - Xalapa, Veracruz</p>
            </body>
            </html>
            """

            msg.attach(MIMEText(body, 'html'))

            with smtplib.SMTP(self.host, self.port) as server:
                if self.use_tls:
                    server.starttls()
                server.login(self.username, self.password)
                server.send_message(msg)

            logger.info(f"✓ Correo de prueba enviado a {to_email}")
            return True

        except Exception as e:
            logger.error(f"✗ Error enviando correo de prueba: {str(e)}")
            return False
