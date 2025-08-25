# Documentación de Payload MQTT

## Estructura del Payload Original

Los datos llegan desde los sensores con la siguiente estructura:

[
  {    
    "SequenceNumber": 301,
    "TotalLength": 88,
    "SourceAddress": null,
    "TempHumi": { "Range": 0, "Status": 0, "Event": 0, "SenVal": 45000 },
    "Accelerometer": {
      "X-Axis": { "SenEvent": 1, "OAVelocity": 3.5, "Peak": 4.95, "RMS": 3.5, "Kurtosis": 3.0, "CrestFactor": 1.41, "Skewness": 0.1, "Deviation": 0.08, "Peak-to-Peak Displacement": 0.9 },
      "Y-Axis": { "SenEvent": 1, "OAVelocity": 2.1, "Peak": 2.97, "RMS": 2.1, "Kurtosis": 3.1, "CrestFactor": 1.41, "Skewness": -0.05, "Deviation": 0.06, "Peak-to-Peak Displacement": 0.6 },
      "Z-Axis": { "SenEvent": 1, "OAVelocity": 2.8, "Peak": 3.96, "RMS": 2.8, "Kurtosis": 3.2, "CrestFactor": 1.41, "Skewness": 0.08, "Deviation": 0.07, "Peak-to-Peak Displacement": 0.7 },
      "LogIndex": 28001,
      "Time": 1722427000
    },
    "Device": { "Events": 0, "PowerSrc": 1, "BatteryVolt": 98, "Time": 1722427001 }
  }
  
  {    
    "SequenceNumber": 302,
    "TotalLength": 88,
    "SourceAddress": null,
    "TempHumi": { "Range": 0, "Status": 0, "Event": 0, "SenVal": 48000 },
    "Accelerometer": {
      "X-Axis": { "SenEvent": 1, "OAVelocity": 3.8, "Peak": 5.37, "RMS": 3.8, "Kurtosis": 3.0, "CrestFactor": 1.41, "Skewness": 0.1, "Deviation": 0.09, "Peak-to-Peak Displacement": 1.0 },
      "Y-Axis": { "SenEvent": 1, "OAVelocity": 6.5, "Peak": 9.19, "RMS": 6.5, "Kurtosis": 3.5, "CrestFactor": 1.45, "Skewness": 0.2, "Deviation": 0.15, "Peak-to-Peak Displacement": 1.8 },
      "Z-Axis": { "SenEvent": 1, "OAVelocity": 4.1, "Peak": 5.80, "RMS": 4.1, "Kurtosis": 3.1, "CrestFactor": 1.41, "Skewness": 0.0, "Deviation": 0.1, "Peak-to-Peak Displacement": 1.1 },
      "LogIndex": 28002,
      "Time": 1722427060
    },
    "Device": { "Events": 0, "PowerSrc": 1, "BatteryVolt": 97, "Time": 1722427061 }
  }

  {    
    "SequenceNumber": 303,
    "TotalLength": 88,
    "SourceAddress": null,
    "TempHumi": { "Range": 0, "Status": 0, "Event": 0, "SenVal": 52000 },
    "Accelerometer": {
      "X-Axis": { "SenEvent": 1, "OAVelocity": 4.2, "Peak": 5.94, "RMS": 4.2, "Kurtosis": 3.2, "CrestFactor": 1.41, "Skewness": 0.1, "Deviation": 0.11, "Peak-to-Peak Displacement": 1.2 },
      "Y-Axis": { "SenEvent": 1, "OAVelocity": 5.1, "Peak": 7.21, "RMS": 5.1, "Kurtosis": 3.3, "CrestFactor": 1.42, "Skewness": 0.15, "Deviation": 0.13, "Peak-to-Peak Displacement": 1.4 },
      "Z-Axis": { "SenEvent": 1, "OAVelocity": 10.5, "Peak": 14.85, "RMS": 10.5, "Kurtosis": 4.1, "CrestFactor": 1.55, "Skewness": 0.4, "Deviation": 0.3, "Peak-to-Peak Displacement": 3.0 },
      "LogIndex": 28003,
      "Time": 1722427120
    },
    "Device": { "Events": 0, "PowerSrc": 1, "BatteryVolt": 96, "Time": 1722427121 }
  }

  {    
    "SequenceNumber": 304,
    "TotalLength": 88,
    "SourceAddress": null,
    "TempHumi": { "Range": 0, "Status": 0, "Event": 0, "SenVal": 58000 },
    "Accelerometer": {
      "X-Axis": { "SenEvent": 1, "OAVelocity": 15.0, "Peak": 21.21, "RMS": 15.0, "Kurtosis": 5.2, "CrestFactor": 1.8, "Skewness": 0.9, "Deviation": 0.8, "Peak-to-Peak Displacement": 5.0 },
      "Y-Axis": { "SenEvent": 1, "OAVelocity": 8.2, "Peak": 11.60, "RMS": 8.2, "Kurtosis": 3.8, "CrestFactor": 1.48, "Skewness": 0.3, "Deviation": 0.2, "Peak-to-Peak Displacement": 2.4 },
      "Z-Axis": { "SenEvent": 1, "OAVelocity": 9.5, "Peak": 13.43, "RMS": 9.5, "Kurtosis": 4.0, "CrestFactor": 1.5, "Skewness": 0.4, "Deviation": 0.25, "Peak-to-Peak Displacement": 2.8 },
      "LogIndex": 28004,
      "Time": 1722427180
    },
    "Device": { "Events": 0, "PowerSrc": 1, "BatteryVolt": 95, "Time": 1722427181 }
  }
]

## Factores de Conversión Aplicados

El sistema aplica los siguientes factores de conversión durante el procesamiento en `payload.service.js`:

### Datos de Vibración (Accelerometer)
- **OAVelocity**: Se divide por 100 para convertir a mm/s
- **Peak**: Se divide por 100 o 1000 según el valor (condicional)
- **RMS**: Se divide por 100 o 1000 según el valor (condicional)
- **Kurtosis**: Se divide por 100
- **CrestFactor**: Se divide por 100
- **Skewness**: Se divide por 100
- **Deviation**: Se divide por 100

### Datos de Temperatura (TempHumi)
- **SenVal**: Se divide por 1000 para convertir a °C

## Ejemplo de Valores Convertidos

Después de aplicar los factores de conversión, los valores típicos serían:

```json
{
  "vibration": {
    "oavelocity": 0.035,     // 3.5 / 100 = 0.035 mm/s
    "peak": 0.0495,          // 4.95 / 100 = 0.0495 mm/s
    "rms": 0.035,            // 3.5 / 100 = 0.035 mm/s
    "kurtosis": 0.03,        // 3.0 / 100 = 0.03
    "crestfactor": 0.0141,   // 1.41 / 100 = 0.0141
    "skewness": 0.001,       // 0.1 / 100 = 0.001
    "deviation": 0.0008      // 0.08 / 100 = 0.0008
  },
  "temperature": {
    "value": 45.0            // 45000 / 1000 = 45.0 °C
  }
}
```

## Análisis con Umbrales ISO 10816

Los valores convertidos se analizan contra los umbrales estándar de la norma ISO 10816:

- **Normal**: ≤ 2.3 mm/s
- **Alerta**: ≤ 4.5 mm/s
- **Precaución**: ≤ 9.0 mm/s
- **Peligro**: > 9.0 mm/s

En el ejemplo anterior, un valor de 0.035 mm/s se clasificaría como "Normal".
