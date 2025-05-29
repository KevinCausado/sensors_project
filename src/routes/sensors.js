import express from 'express';
import { Sensor, Organization } from '../models/index.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const sensors = await Sensor.findAll({
      include: [{
        model: Organization,
        attributes: ['name']
      }]
    });
    res.json(sensors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const sensor = await Sensor.findByPk(req.params.id, {
      include: [{
        model: Organization,
        attributes: ['name']
      }]
    });
    if (!sensor) {
      return res.status(404).json({ message: 'Sensor no encontrado' });
    }
    res.json(sensor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const sensor = await Sensor.create(req.body);
    const sensorWithOrg = await Sensor.findByPk(sensor.id, {
      include: [{
        model: Organization,
        attributes: ['name']
      }]
    });
    res.status(201).json(sensorWithOrg);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const sensor = await Sensor.findByPk(req.params.id);
    if (!sensor) {
      return res.status(404).json({ message: 'Sensor no encontrado' });
    }
    
    await sensor.update(req.body);
    
    const updatedSensor = await Sensor.findByPk(sensor.id, {
      include: [{
        model: Organization,
        attributes: ['name']
      }]
    });
    
    res.json(updatedSensor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const sensor = await Sensor.findByPk(req.params.id);
    if (!sensor) {
      return res.status(404).json({ message: 'Sensor no encontrado' });
    }
    
    await sensor.destroy();
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;