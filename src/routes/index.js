import express from 'express';
import authRoutes from './auth.js';
import userRoutes from './users.js';
import sensorRoutes from './sensors.js';
import alertRoutes from './alerts.js';
import organizationRoutes from './organizations.js';
import roleRoutes from './roles.js';
import parameterRoutes from './parameters.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/sensors', sensorRoutes);
router.use('/alerts', alertRoutes);
router.use('/organizations', organizationRoutes);
router.use('/roles', roleRoutes);
router.use('/parameters', parameterRoutes);

export default router;