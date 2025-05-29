import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Organization = sequelize.define('Organization', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  address: {
    type: DataTypes.STRING
  },
  contactEmail: {
    type: DataTypes.STRING,
    validate: {
      isEmail: true
    }
  },
  contactPhone: {
    type: DataTypes.STRING
  }
});

export default Organization;