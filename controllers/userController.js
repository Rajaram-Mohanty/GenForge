import { User } from '../models/index.js';

export const getUser = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        let hasApiKey = false;
        if (user && typeof user.getApiKey === 'function') {
            hasApiKey = !!user.getApiKey();
        }
        res.json({
            success: true,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                hasApiKey
            }
        });
    } catch (error) {
        console.error('User API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user data'
        });
    }
};

export const updateApiKey = (req, res) => {
    try {
        const { apiKey } = req.body;

        if (!apiKey) {
            return res.status(400).json({
                success: false,
                error: 'API key is required'
            });
        }

        // Persist API key encrypted per user
        User.findById(req.session.userId)
            .then((user) => {
                if (!user) {
                    return res.status(404).json({
                        success: false,
                        error: 'User not found'
                    });
                }

                if (typeof user.setApiKey === 'function') {
                    user.setApiKey(apiKey);
                }

                return user.save().then(() => {
                    // Also cache in session
                    req.session.apiKey = apiKey;

                    res.json({
                        success: true,
                        message: 'API key updated successfully'
                    });
                });
            })
            .catch((err) => {
                console.error('API key update DB error:', err);
                res.status(500).json({
                    success: false,
                    error: 'Failed to update API key'
                });
            });

    } catch (error) {
        console.error('API key update error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update API key'
        });
    }
};
