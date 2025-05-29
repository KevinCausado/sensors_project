import express from 'express';
import { User, Organization } from '../models/index.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        console.log('--- INTENTO DE LOGIN ---');
        console.log('Email recibido:', email);
        // console.log('Password recibido (desde req.body - NO LOGUEAR EN PRODUCCIÓN!):', password); // Comenta esto en producción

        const user = await User.findOne({
            where: { email },
            include: [{
                model: Organization,
                attributes: ['name']
            }]
        });

        if (!user) {
            console.log('Usuario NO encontrado en la base de datos para el email:', email);
            return res.status(401).json({ message: 'Credenciales inválidas: Usuario no existe' });
        }
        console.log('Usuario ENCONTRADO. Email:', user.email, 'Role:', user.role);
        console.log('Password HASH en BD:', user.password);

        const isValid = await user.validatePassword(password); // Usamos el método del modelo para validar
        
        if (!isValid) {
            console.log('La contraseña NO es válida.');
            return res.status(401).json({ message: 'Credenciales inválidas: Contraseña incorrecta' });
        }

        console.log('Login exitoso. Generando token para userId:', user.id);

        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        await user.update({ lastLogin: new Date() });

        res.json({
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                organizationId: user.organizationId,
                organizationName: user.Organization?.name
            },
            token
        });
    } catch (error) {
        console.error('Login error (catch bloque):', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// --- ¡AÑADE ESTA RUTA PARA /api/auth/me! ---
router.get('/me', authenticateToken, async (req, res) => {
    try {
        // req.user es poblado por el middleware authenticateToken
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'No autenticado o usuario no encontrado.' });
        }

        // Buscar el usuario de nuevo para obtener los datos más recientes y la relación con la organización
        const user = await User.findByPk(req.user.id, {
            include: [{
                model: Organization,
                attributes: ['name']
            }]
        });

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado en la base de datos.' });
        }

        // Eliminar la contraseña antes de enviarla al frontend
        const userWithoutPassword = user.toJSON();
        delete userWithoutPassword.password;

        res.json(userWithoutPassword);

    } catch (error) {
        console.error('Error fetching user /me:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener el perfil.' });
    }
});
// --------------------------------------------------

export default router;