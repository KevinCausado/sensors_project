import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Alert = sequelize.define('Alert', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('threshold', 'connectivity', 'anomaly'),
    allowNull: false
  },
  priority: {
    type: DataTypes.ENUM('high', 'medium', 'low'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('active', 'resolved'),
    defaultValue: 'active'
  },
  value: {
    type: DataTypes.FLOAT
  },
  threshold: {
    type: DataTypes.FLOAT
  },
  resolvedAt: {
    type: DataTypes.DATE
  }
});

export default Alert;