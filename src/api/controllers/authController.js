import { User } from '../../models/index.js';
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || '1029199197940-02t7h0o5t6c11p1r0sjkc1p9e3tiv80l.apps.googleusercontent.com');

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user by email
        const user = await User.findOne({ email: email });

        if (user && await user.comparePassword(password)) {
            // Update last login
            user.lastLogin = new Date();
            await user.save();

            // Load API key for this user (if present)
            let userApiKey = null;
            if (typeof user.getApiKey === 'function') {
                userApiKey = user.getApiKey();
            }

            req.session.userId = user._id;
            req.session.apiKey = userApiKey || null;
            // Note: currentApiKey global in server.js is not easily accessible here without a singleton or context
            // For now, we rely on session.apiKey

            return res.json({
                success: true,
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    hasApiKey: !!userApiKey
                }
            });
        } else {
            return res.status(401).json({ success: false, error: 'Invalid email or password' });
        }
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ success: false, error: 'An error occurred during login' });
    }
};

export const signup = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email: email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: 'User with this email already exists'
            });
        }

        // Create new user
        const newUser = new User({
            username: name, // Using name as username for now
            email,
            password
        });

        await newUser.save();
        req.session.userId = newUser._id;
        // New users start without an API key
        req.session.apiKey = null;
        return res.json({
            success: true,
            user: {
                id: newUser._id,
                username: newUser.username,
                email: newUser.email,
                hasApiKey: false
            }
        });
    } catch (error) {
        console.error('Signup error:', error);
        return res.status(500).json({ success: false, error: 'An error occurred during signup' });
    }
};

export const logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Session destruction error:', err);
            return res.status(500).json({ success: false, error: 'Failed to logout' });
        }
        res.json({ success: true });
    });
};

export const googleLogin = async (req, res) => {
    try {
        const { credential } = req.body;
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID || '1029199197940-02t7h0o5t6c11p1r0sjkc1p9e3tiv80l.apps.googleusercontent.com',
        });
        const payload = ticket.getPayload();
        const { sub, email, name } = payload;

        let user = await User.findOne({ email: email });

        if (!user) {
            user = new User({
                username: name || email.split('@')[0],
                email: email,
                authProvider: 'google',
                googleId: sub
            });
            await user.save();
        } else if (!user.googleId) {
            user.googleId = sub;
            user.authProvider = 'google';
            await user.save();
        }

        user.lastLogin = new Date();
        await user.save();

        let userApiKey = null;
        if (typeof user.getApiKey === 'function') {
            userApiKey = user.getApiKey();
        }

        req.session.userId = user._id;
        req.session.apiKey = userApiKey || null;

        return res.json({
            success: true,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                hasApiKey: !!userApiKey
            }
        });
    } catch (error) {
        console.error('Google login error:', error);
        return res.status(500).json({ success: false, error: 'Failed to authenticate with Google' });
    }
};
