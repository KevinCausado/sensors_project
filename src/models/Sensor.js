import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Sensor = sequelize.define('Sensor', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('temperature', 'humidity', 'pressure', 'level', 'power', 'air-quality'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'maintenance', 'error'),
    defaultValue: 'inactive'
  },
  location: {
    type: DataTypes.STRING
  },
  unit: {
    type: DataTypes.STRING,
    allowNull: false
  },
  lastReading: {
    type: DataTypes.DATE
  },
  value: {
    type: DataTypes.FLOAT
  },
  thresholds: {
    type: DataTypes.JSONB,
    defaultValue: {
      min: 0,
      max: 100,
      criticalMin: 0,
      criticalMax: 100
    }
  }
});

export default Sensor;