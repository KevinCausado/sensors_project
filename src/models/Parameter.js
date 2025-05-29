import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Parameter = sequelize.define('Parameter', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  key: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  value: {
    type: DataTypes.STRING,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('text', 'number', 'boolean'),
    allowNull: false,
    defaultValue: 'text'
  },
  unit: {
    type: DataTypes.STRING
  },
  category: {
    type: DataTypes.ENUM('system', 'sensors', 'alerts', 'units'),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  }
});

export default Parameter;