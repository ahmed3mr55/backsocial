const express = require('express');
const router = express.Router();
const { PostShare } = require('../models/PostShare');
const { Post } = require('../models/Post');
const { User } = require('../models/User');
const { verifyToken } = require('../Middleware/verifyToken');
const Joi = require('joi');

// Create a new post share route
router.post('/create/:postId', verifyToken, async (req, res) => {
    const { content} = req.body;
    const { postId } = req.params;
    const user = req.user;
    // Validate postId and body
    const schema = Joi.object({
        postId: Joi.string().required(),
        content: Joi.string().min(1).max(500).optional(),
    });
    const { error } = schema.validate({ postId, content });
    if (error) return res.status(400).json({ message: error.details[0].message });
    try {
        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: 'Post not found' });
        const postShare = new PostShare({
            post: postId,
            user: user._id,
            content,
        })
        await postShare.save();
        // Update the post shares count
        post.sharesCount + 1;
        await post.save();
        return res.status(201).json({
            message: 'Post shared successfully',
            postShare
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    }
})

// Get all post shares route
router.get('/getAll', async (req, res) => {
    const { limit } = req.query.limit || 10;
    const { page } = req.query.page || 1;
    // Validate limit and page
    const schema = Joi.object({
        limit: Joi.number().integer().min(1).max(100).default(10),
        page: Joi.number().integer().min(1).default(1),
    })
    const { error } = schema.validate({ limit, page });
    if (error) return res.status(400).json({ message: error.details[0].message });
    try {
        const postShares = await PostShare.find()
            .populate('post', 'body likesCount commentsCount sharesCount')
            .populate('user', 'firstName lastName username profilePicture')
            .sort({ createdAt: -1 })
            .lean();
            return res.status(200).json({
                message: 'Post shares fetched successfully',
                postShares,
            });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error });
    }
})

module.exports = router;