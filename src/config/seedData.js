import bcrypt from 'bcryptjs';

export const seedData = async (models) => {
  const { Organization, User, Sensor, Alert, Role, Parameter } = models;

  try {
    // Crear roles por defecto
    const roles = await Promise.all([
      Role.create({
        name: 'super-admin',
        description: 'Acceso completo al sistema',
        permissions: {
          users: ['ver', 'crear', 'editar', 'eliminar'],
          sensors: ['ver', 'crear', 'editar', 'eliminar'],
          alerts: ['ver', 'resolver'],
          organizations: ['ver', 'crear', 'editar', 'eliminar'],
          roles: ['ver', 'crear', 'editar', 'eliminar']
        }
      }),
      Role.create({
        name: 'admin',
        description: 'Administrador de organización',
        permissions: {
          users: ['ver', 'crear', 'editar'],
          sensors: ['ver', 'crear', 'editar'],
          alerts: ['ver', 'resolver'],
          organizations: ['ver']
        }
      }),
      Role.create({
        name: 'technician',
        description: 'Técnico de mantenimiento',
        permissions: {
          sensors: ['ver', 'editar'],
          alerts: ['ver', 'resolver']
        }
      }),
      Role.create({
        name: 'viewer',
        description: 'Usuario con acceso de solo lectura',
        permissions: {
          sensors: ['ver'],
          alerts: ['ver']
        }
      })
    ]);

    // Crear organización por defecto
    const organization = await Organization.create({
      name: 'Organización Principal',
      address: 'Calle Principal 123',
      contactEmail: 'contacto@organizacion.com',
      contactPhone: '+1234567890'
    });

  // Crear usuario super admin
        const adminPasswordRaw = 'admin123';
        console.log('SEED: Contraseña RAW enviada al modelo:', adminPasswordRaw); // Loguea el texto plano

        const createdUser = await User.create({
            firstName: 'Admin',
            lastName: 'Sistema',
            email: 'admin@sistema.com',
            password: adminPasswordRaw, // ¡Pasa el texto plano aquí!
            role: 'super-admin',
            organizationId: organization.id,
            roleId: roles[0].id 
        });

        // Leer de la DB para verificar (ESTO AHORA DEBE MOSTRAR EL HASH CORRECTO)
        const userFromDbAfterCreate = await User.findOne({ where: { email: 'admin@sistema.com' } });
        if (userFromDbAfterCreate) {
            console.log('SEED: HASH del usuario admin@sistema.com LEÍDO INMEDIATAMENTE DESPUÉS DE GUARDAR:', userFromDbAfterCreate.password);
        } else {
            console.log('SEED: Error - Usuario admin@sistema.com no encontrado después de la creación.');
        }

    console.log('Datos iniciales cargados correctamente');

    // Crear sensores de ejemplo
    const sensor1 = await Sensor.create({
      name: 'Sensor Temperatura 1',
      type: 'temperature',
      status: 'active',
      location: 'Sala Principal',
      unit: '°C',
      organizationId: organization.id,
      value: 25.5,
      thresholds: {
        min: 18,
        max: 28,
        criticalMin: 15,
        criticalMax: 30
      }
    });

    const sensor2 = await Sensor.create({
      name: 'Sensor Humedad 1',
      type: 'humidity',
      status: 'active',
      location: 'Sala Principal',
      unit: '%',
      organizationId: organization.id,
      value: 45,
      thresholds: {
        min: 30,
        max: 60,
        criticalMin: 25,
        criticalMax: 70
      }
    });

    // Crear algunas alertas de ejemplo
    await Alert.create({
      title: 'Temperatura Alta',
      message: 'La temperatura ha superado el umbral máximo',
      type: 'threshold',
      priority: 'high',
      status: 'active',
      sensorId: sensor1.id,
      value: 29,
      threshold: 28
    });

    await Alert.create({
      title: 'Humedad Baja',
      message: 'La humedad está por debajo del umbral mínimo',
      type: 'threshold',
      priority: 'medium',
      status: 'resolved',
      sensorId: sensor2.id,
      value: 28,
      threshold: 30,
      resolvedAt: new Date()
    });

    // Crear parámetros de ejemplo
    await Promise.all([
      Parameter.create({
        name: 'Intervalo de Lectura',
        key: 'reading_interval',
        value: '300',
        type: 'number',
        unit: 'segundos',
        category: 'sensors',
        description: 'Intervalo de tiempo entre lecturas de sensores'
      }),
      Parameter.create({
        name: 'Retención de Datos',
        key: 'data_retention',
        value: '90',
        type: 'number',
        unit: 'días',
        category: 'system',
        description: 'Tiempo de retención de datos históricos'
      }),
      Parameter.create({
        name: 'Umbral de Alerta Global',
        key: 'global_alert_threshold',
        value: '80',
        type: 'number',
        unit: '%',
        category: 'alerts',
        description: 'Umbral global para generación de alertas'
      }),
      Parameter.create({
        name: 'Grados Celsius',
        key: 'celsius',
        value: '°C',
        type: 'text',
        category: 'units',
        description: 'Unidad de temperatura en grados Celsius'
      }),
      Parameter.create({
        name: 'Porcentaje',
        key: 'percentage',
        value: '%',
        type: 'text',
        category: 'units',
        description: 'Unidad en porcentaje'
      }),
      Parameter.create({
        name: 'Kilopascales',
        key: 'kpa',
        value: 'kPa',
        type: 'text',
        category: 'units',
        description: 'Unidad de presión en kilopascales'
      }),
      Parameter.create({
        name: 'Kilowatts',
        key: 'kw',
        value: 'kW',
        type: 'text',
        category: 'units',
        description: 'Unidad de potencia en kilowatts'
      }),
      Parameter.create({
        name: 'Índice de Calidad del Aire',
        key: 'aqi',
        value: 'AQI',
        type: 'text',
        category: 'units',
        description: 'Índice de calidad del aire'
      })
    ]);

    console.log('Datos iniciales cargados correctamente');
  } catch (error) {
    console.error('Error al cargar datos iniciales:', error);
    throw error;
  }
};