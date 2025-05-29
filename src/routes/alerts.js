import express from 'express';
import { Alert, Sensor } from '../models/index.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const alerts = await Alert.findAll({
      include: [{
        model: Sensor,
        attributes: ['name']
      }]
    });
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const alert = await Alert.findByPk(req.params.id, {
      include: [{
        model: Sensor,
        attributes: ['name']
      }]
    });
    if (!alert) {
      return res.status(404).json({ message: 'Alerta no encontrada' });
    }
    res.json(alert);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const alert = await Alert.create(req.body);
    const alertWithSensor = await Alert.findByPk(alert.id, {
      include: [{
        model: Sensor,
        attributes: ['name']
      }]
    });
    res.status(201).json(alertWithSensor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id/resolve', async (req, res) => {
  try {
    const alert = await Alert.findByPk(req.params.id);
    if (!alert) {
      return res.status(404).json({ message: 'Alerta no encontrada' });
    }
    
    await alert.update({
      status: 'resolved',
      resolvedAt: new Date()
    });
    
    const updatedAlert = await Alert.findByPk(alert.id, {
      include: [{
        model: Sensor,
        attributes: ['name']
      }]
    });
    
    res.json(updatedAlert);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;