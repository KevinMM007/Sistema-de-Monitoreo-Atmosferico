"""
Servicio de envío de correos electrónicos para notificaciones de calidad del aire
"""
import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from typing import Dict, List
import logging
from dotenv import load_dotenv

# Cargar variables de entorno del archivo .env
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
        
        # Verificar configuración
        if not self.username or not self.password:
            logger.warning("⚠️ Email no configurado. Revisa las variables EMAIL_HOST_USER y EMAIL_HOST_PASSWORD en .env")
            self.configured = False
        else:
            self.configured = True
            logger.info(f"✓ Servicio de email configurado: {self.username}")
    
    def send_alert_email(self, to_email: str, alert_data: Dict) -> bool:
        """
        Envía un correo de alerta de calidad del aire
        
        Args:
            to_email: Correo del destinatario
            alert_data: Datos de la alerta con niveles de contaminación
            
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
            html_content = self._create_html_email(alert_data)
            
            # Crear contenido texto plano
            text_content = self._create_text_email(alert_data)
            
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
    
    def _create_text_email(self, alert_data: Dict) -> str:
        """Crea versión de texto plano del correo"""
        overall_level = alert_data.get('overall_level')
        level = (overall_level.value if overall_level else 'desconocido').upper()
        timestamp = alert_data.get('timestamp', datetime.now().isoformat())
        aqi = alert_data.get('aqi', {}).get('overall', 'N/A')
        
        recommendations = alert_data.get('recommendations', {})
        
        text = f"""
SISTEMA DE MONITOREO DE CALIDAD DEL AIRE - XALAPA, VERACRUZ

Nivel de Calidad del Aire: {level}
Índice AQI: {aqi}
Fecha y Hora: {timestamp}

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
        
        text += f"""

---
Para más información, visita el dashboard: http://localhost:5173

Para desactivar estas notificaciones, ingresa al sistema y desuscríbete.
"""
        
        return text
    
    def _create_html_email(self, alert_data: Dict) -> str:
        """Crea versión HTML del correo con estilos"""
        overall_level = alert_data.get('overall_level')
        level = overall_level.value if overall_level else 'desconocido'
        timestamp = datetime.fromisoformat(alert_data.get('timestamp', datetime.now().isoformat()))
        aqi = alert_data.get('aqi', {}).get('overall', 'N/A')
        
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
        <img src="https://via.placeholder.com/80" alt="REVIVE Logo" style="width: 80px; height: 80px; border-radius: 50%; margin-bottom: 10px;">
        <h1 style="margin: 0; font-size: 24px;">Sistema de Calidad del Aire</h1>
        <p style="margin: 5px 0 0 0; font-size: 14px;">Xalapa, Veracruz</p>
    </div>
    
    <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <div style="text-align: center; padding: 20px; background: {color}; color: white; border-radius: 10px; margin-bottom: 20px;">
            <div style="font-size: 48px; margin-bottom: 10px;">{icon}</div>
            <h2 style="margin: 0; font-size: 28px;">{level.upper().replace('_', ' ')}</h2>
            <p style="margin: 10px 0 0 0; font-size: 14px;">{timestamp.strftime('%d/%m/%Y %H:%M')}</p>
        </div>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 10px 0; font-size: 20px; color: {color};">Índice de Calidad del Aire (AQI)</h3>
            <div style="font-size: 36px; font-weight: bold; color: {color}; text-align: center;">{aqi if isinstance(aqi, (int, float)) else 'N/A'}</div>
        </div>
        
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
            <a href="http://localhost:5173" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Ver Dashboard Completo</a>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #6b7280;">
            <p>Este es un correo automático del Sistema de Monitoreo de Calidad del Aire de Xalapa.</p>
            <p>Para desactivar estas notificaciones, accede al sistema y desuscríbete.</p>
        </div>
    </div>
</body>
</html>
"""
        
        return html
    
    def send_welcome_email(self, to_email: str) -> bool:
        """Envía un correo de bienvenida al suscribirse"""
        if not self.configured:
            logger.warning("No se puede enviar correo de bienvenida - servicio no configurado")
            return False

        try:
            msg = MIMEMultipart()
            msg['Subject'] = '¡Bienvenido al Sistema de Calidad del Aire de Xalapa!'
            msg['From'] = self.from_email
            msg['To'] = to_email

            body = """
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
                        <a href="http://localhost:5173" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Ver Dashboard</a>
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

            with smtplib.SMTP(self.host, self.port) as server:
                if self.use_tls:
                    server.starttls()
                server.login(self.username, self.password)
                server.send_message(msg)

            logger.info(f"✓ Correo de bienvenida enviado a {to_email}")
            return True

        except Exception as e:
            logger.error(f"✗ Error enviando correo de bienvenida: {str(e)}")
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
