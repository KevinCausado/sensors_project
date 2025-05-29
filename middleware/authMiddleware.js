// src/middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import { User } from '../models/index.js'; // Asegúrate de que la ruta a tus modelos sea correcta

export const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return res.status(401).json({ message: 'Acceso denegado: No se proporcionó token de autenticación.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        const user = await User.findByPk(decoded.userId);

        if (!user) {
            return res.status(404).json({ message: 'Usuario asociado al token no encontrado.' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Error al verificar el token:', error.message);
        return res.status(403).json({ message: 'Acceso denegado: Token inválido o expirado.' });
    }
};