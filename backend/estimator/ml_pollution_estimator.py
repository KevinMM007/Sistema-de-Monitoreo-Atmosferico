"""
============================================================================
Sistema de Monitoreo de Calidad del Aire - Xalapa, Veracruz
============================================================================

ARCHIVO: estimator/ml_pollution_estimator.py
PROPÓSITO: Estimador de contaminación usando modelos estadísticos

FUNCIONALIDADES:
    - Predice niveles de contaminantes basándose en patrones históricos
    - Considera variables temporales (hora, día de semana, mes)
    - Considera condiciones meteorológicas
    - Aplica factores de ajuste por zona geográfica

MODELOS DISPONIBLES (JSON):
    - pm25_model.json
    - pm10_model.json
    - no2_model.json
    - o3_model.json
    - co_model.json

UBICACIÓN DE MODELOS:
    - backend/models/

AUTOR: Kevin Morales
VERSIÓN: 2.1.0
============================================================================
"""

import numpy as np
import pandas as pd
import os
import json
from datetime import datetime, timedelta

class MLPollutionEstimator:
    def __init__(self):
        self.models = {}
        self.scalers = {}
        self.model_path = 'models/'
        self.statistics = {}
        
        # Cargar modelos si existen
        self.load_models()
    
    def prepare_features(self, data):
        """Prepara características para el modelo"""
        features = {}
        
        # Características temporales
        if 'timestamp' in data:
            if isinstance(data['timestamp'], str):
                dt = datetime.fromisoformat(data['timestamp'].replace('Z', '+00:00'))
            else:
                dt = data['timestamp']
            
            features['hour'] = dt.hour
            features['day_of_week'] = dt.weekday()
            features['month'] = dt.month
            features['is_weekend'] = dt.weekday() >= 5
            features['is_rush_hour'] = dt.hour in [7, 8, 9, 17, 18, 19]
        
        # Características meteorológicas
        features['temperature'] = data.get('temperature', 20)
        features['humidity'] = data.get('humidity', 60)
        features['wind_speed'] = data.get('wind_speed', 10)
        
        # Características de tráfico
        features['congestion_level'] = data.get('congestion_level', 30)
        
        return features
    
    def predict(self, input_data):
        """Predice niveles de contaminación usando modelos estadísticos"""
        predictions = {}
        
        # Preparar características
        features = self.prepare_features(input_data)
        
        # Predecir para cada contaminante
        for pollutant in ['pm25', 'pm10', 'no2', 'o3', 'co']:
            try:
                if pollutant in self.statistics:
                    # Usar modelo estadístico
                    base_value = self.statistics[pollutant]['mean']
                    
                    # Ajustes basados en características
                    hour_adjustment = (features.get('hour', 12) - 12) * 0.5
                    weekend_adjustment = -2 if features.get('is_weekend', False) else 0
                    rush_hour_adjustment = 3 if features.get('is_rush_hour', False) else 0
                    congestion_adjustment = (features.get('congestion_level', 30) - 30) * 0.1
                    
                    # Calcular predicción
                    prediction = base_value + hour_adjustment + weekend_adjustment + rush_hour_adjustment + congestion_adjustment
                    
                    # Aplicar límites razonables
                    prediction = max(0, prediction)
                    
                    # Límites máximos por contaminante
                    max_limits = {
                        'pm25': 200,
                        'pm10': 300,
                        'no2': 150,
                        'o3': 150,
                        'co': 10
                    }
                    
                    prediction = min(prediction, max_limits.get(pollutant, 500))
                    predictions[pollutant] = float(prediction)
                    
                else:
                    # Fallback a estimación básica
                    predictions[pollutant] = self._basic_estimation(pollutant, input_data)
                    
            except Exception as e:
                print(f"Error prediciendo {pollutant}: {str(e)}")
                predictions[pollutant] = self._basic_estimation(pollutant, input_data)
        
        return predictions
    
    def predict_future(self, hours_ahead=24):
        """Predice niveles futuros de contaminación"""
        predictions = []
        current_time = datetime.now()
        
        for hour in range(hours_ahead):
            future_time = current_time + timedelta(hours=hour)
            
            # Crear datos de entrada para predicción
            input_data = {
                'timestamp': future_time.isoformat(),
                'temperature': 20 + 5 * np.sin(2 * np.pi * future_time.hour / 24) if 'numpy' in globals() else 20,
                'humidity': 60 + 20 * np.cos(2 * np.pi * future_time.hour / 24) if 'numpy' in globals() else 60,
                'wind_speed': 10,
                'congestion_level': self._estimate_traffic(future_time)
            }
            
            prediction = self.predict(input_data)
            prediction['timestamp'] = future_time.isoformat()
            prediction['confidence'] = self._calculate_confidence(input_data)
            
            predictions.append(prediction)
        
        return predictions
    
    def _basic_estimation(self, pollutant, input_data):
        """Estimación básica cuando no hay modelo entrenado"""
        base_values = {
            'pm25': 25,
            'pm10': 50,
            'no2': 40,
            'o3': 60,
            'co': 1.0
        }
        
        value = base_values.get(pollutant, 50)
        
        # Ajustar por tráfico
        congestion = input_data.get('congestion_level', 30) / 100
        traffic_factors = {
            'pm25': 1 + (congestion * 0.35),
            'pm10': 1 + (congestion * 0.25),
            'no2': 1 + (congestion * 0.45),
            'o3': 1 - (congestion * 0.15),
            'co': 1 + (congestion * 0.40)
        }
        
        return value * traffic_factors.get(pollutant, 1.0)
    
    def _estimate_traffic(self, timestamp):
        """Estima nivel de tráfico basado en hora del día"""
        hour = timestamp.hour
        day = timestamp.weekday()
        
        # Menos tráfico en fin de semana
        if day >= 5:
            base_traffic = 20
        else:
            base_traffic = 30
        
        # Horas pico
        if hour in [7, 8, 9, 17, 18, 19]:
            return base_traffic + 40
        elif hour in [10, 11, 12, 13, 14, 15, 16]:
            return base_traffic + 20
        else:
            return base_traffic
    
    def _calculate_confidence(self, input_data):
        """Calcula nivel de confianza de la predicción"""
        confidence = 0.8  # Mayor confianza con modelos estadísticos
        
        if 'temperature' in input_data and 'humidity' in input_data:
            confidence += 0.1
        if 'congestion_level' in input_data:
            confidence += 0.1
            
        return min(confidence, 1.0)
    
    def load_models(self):
        """Carga modelos y estadísticas"""
        try:
            # Cargar metadatos si existen
            metadata_file = os.path.join(self.model_path, 'metadata.json')
            if os.path.exists(metadata_file):
                with open(metadata_file, 'r') as f:
                    metadata = json.load(f)
                
                # Cargar estadísticas si están disponibles
                if 'statistics' in metadata:
                    self.statistics = metadata['statistics']
                    print(f"Modelos estadísticos cargados: {list(self.statistics.keys())}")
                    self.models = {pollutant: 'statistical_model' for pollutant in self.statistics.keys()}
                    return True
            
            # Intentar cargar modelos individuales JSON
            for pollutant in ['pm25', 'pm10', 'no2', 'o3', 'co']:
                model_file = os.path.join(self.model_path, f'{pollutant}_model.json')
                if os.path.exists(model_file):
                    with open(model_file, 'r') as f:
                        model_data = json.load(f)
                    
                    if 'statistics' in model_data:
                        self.statistics[pollutant] = model_data['statistics']
                        self.models[pollutant] = 'statistical_model'
            
            if self.statistics:
                print(f"Modelos cargados: {list(self.statistics.keys())}")
                return True
            else:
                print("No se encontraron modelos entrenados")
                return False
                
        except Exception as e:
            print(f"Error cargando modelos: {str(e)}")
            return False
    
    def get_model_metrics(self):
        """Obtiene métricas de los modelos entrenados"""
        if not self.statistics:
            return {}
        
        metrics = {}
        for pollutant, stats in self.statistics.items():
            metrics[pollutant] = {
                'mean': stats['mean'],
                'min': stats['min'],
                'max': stats['max'],
                'data_points': stats['count'],
                'model_type': 'statistical'
            }
        
        return metrics
