import User from './User.js';
import Organization from './Organization.js';
import Sensor from './Sensor.js';
import Alert from './Alert.js';
import Role from './Role.js';
import Parameter from './Parameter.js';

// Define relationships
Organization.hasMany(User);
User.belongsTo(Organization);

Organization.hasMany(Sensor);
Sensor.belongsTo(Organization);

Sensor.hasMany(Alert);
Alert.belongsTo(Sensor);

Role.hasMany(User);
User.belongsTo(Role);

export {
  User,
  Organization,
  Sensor,
  Alert,
  Role,
  Parameter
};