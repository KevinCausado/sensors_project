import express from 'express';
import { Organization, User, Sensor } from '../models/index.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const organizations = await Organization.findAll({
      include: [
        {
          model: User,
          attributes: ['id'],
          required: false
        },
        {
          model: Sensor,
          attributes: ['id'],
          required: false
        }
      ],
      attributes: {
        include: [
          [
            Organization.sequelize.literal(
              '(SELECT COUNT(*) FROM "Users" WHERE "Users"."organizationId" = "Organization"."id")'
            ),
            'userCount'
          ],
          [
            Organization.sequelize.literal(
              '(SELECT COUNT(*) FROM "Sensors" WHERE "Sensors"."organizationId" = "Organization"."id")'
            ),
            'sensorCount'
          ]
        ]
      }
    });
    res.json(organizations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const organization = await Organization.findByPk(req.params.id, {
      include: [
        {
          model: User,
          attributes: { exclude: ['password'] }
        },
        {
          model: Sensor
        }
      ]
    });
    if (!organization) {
      return res.status(404).json({ message: 'Organización no encontrada' });
    }
    res.json(organization);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const organization = await Organization.create(req.body);
    res.status(201).json(organization);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const organization = await Organization.findByPk(req.params.id);
    if (!organization) {
      return res.status(404).json({ message: 'Organización no encontrada' });
    }
    
    await organization.update(req.body);
    res.json(organization);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const organization = await Organization.findByPk(req.params.id);
    if (!organization) {
      return res.status(404).json({ message: 'Organización no encontrada' });
    }
    
    await organization.destroy();
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;