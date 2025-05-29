import express from 'express';
import { Parameter } from '../models/index.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const parameters = await Parameter.findAll();
    res.json(parameters);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const parameter = await Parameter.findByPk(req.params.id);
    if (!parameter) {
      return res.status(404).json({ message: 'Parámetro no encontrado' });
    }
    res.json(parameter);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const parameter = await Parameter.create(req.body);
    res.status(201).json(parameter);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const parameter = await Parameter.findByPk(req.params.id);
    if (!parameter) {
      return res.status(404).json({ message: 'Parámetro no encontrado' });
    }
    await parameter.update(req.body);
    res.json(parameter);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const parameter = await Parameter.findByPk(req.params.id);
    if (!parameter) {
      return res.status(404).json({ message: 'Parámetro no encontrado' });
    }
    await parameter.destroy();
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;