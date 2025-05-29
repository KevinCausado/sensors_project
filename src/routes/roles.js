import express from 'express';
import { Role, User } from '../models/index.js';

const router = express.Router();

// Get all roles
router.get('/', async (req, res) => {
  try {
    const roles = await Role.findAll({
      include: [{
        model: User,
        attributes: ['id'],
        required: false
      }],
      attributes: {
        include: [
          [
            Role.sequelize.literal(
              '(SELECT COUNT(*) FROM "Users" WHERE "Users"."roleId" = "Role"."id")'
            ),
            'userCount'
          ]
        ]
      }
    });
    res.json(roles);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get role by ID
router.get('/:id', async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.id, {
      include: [{
        model: User,
        attributes: ['id', 'firstName', 'lastName', 'email']
      }]
    });
    if (!role) {
      return res.status(404).json({ message: 'Rol no encontrado' });
    }
    res.json(role);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new role
router.post('/', async (req, res) => {
  try {
    const role = await Role.create(req.body);
    res.status(201).json(role);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update role
router.put('/:id', async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.id);
    if (!role) {
      return res.status(404).json({ message: 'Rol no encontrado' });
    }
    await role.update(req.body);
    res.json(role);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete role
router.delete('/:id', async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.id);
    if (!role) {
      return res.status(404).json({ message: 'Rol no encontrado' });
    }
    await role.destroy();
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;