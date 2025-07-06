const express = require('express');
const router = express.Router();
const { User } = require('../models/User');
const { FollowRequest } = require('../models/FollowRequest');
const Follow  = require('../models/Follow');
const { verifyToken } = require('../Middleware/verifyToken');
const Joi = require('joi');


// get all follow requests for the current user
router.get('/requests', verifyToken, async (req, res) => {
    const user = req.user;
    if (user.isPrivate === false) return res.status(403).json({ message: 'This account is public' });
    try {
        const requests = await FollowRequest.find({ receiver: user._id })
            .populate('sender', 'firstName lastName username profilePicture')
            .exec();
        return res.status(200).json({ requests });
    } catch (error) {
        return res.status(500).json({ message: 'Server error' });
    }
})

// confirm a follow request transferring it to a follow
router.post('/confirm/:requestId', verifyToken, async (req, res) => {
    const user = req.user;
    const { requestId } = req.params;
    const schema = Joi.object({
        requestId: Joi.string().required(),
    });
    const { error } = schema.validate({ requestId });
    if (error) return res.status(400).json({ message: error.details[0].message });
    try {
        const request = await FollowRequest.findById(requestId)
        if (!request) return res.status(404).json({ message: 'Follow request not found' });
        if (request.receiver.toString() !== user._id.toString()) {
            return res.status(403).json({ message: 'You are not authorized to confirm this request' });
        }
        // Create a new follow relationship
        const follow = new Follow({
            follower: request.sender,
            following: user._id
        })
        await follow.save();
        // Delete the follow request
        await request.deleteOne();
        // Update the user's following count
        const sender = await User.findById(request.sender);
        if (!sender) return res.status(404).json({ message: 'Sender not found' });
        sender.followingCount += 1;
        user.followersCount += 1;
        await sender.save();
        await user.save();
        return res.status(200).json({ message: 'Follow request confirmed and follow relationship created' });
    } catch (error) {
        return res.status(500).json({ message: 'Server error' });
    }
})

// reject a follow request
router.post('/reject/:requestId', verifyToken, async (req, res) => {
    const user = req.user;
    const { requestId } = req.params;
    const schema = Joi.object({
        requestId: Joi.string().required().max(200),
    })
    const { error } = schema.validate({ requestId });
    if (error) return res.status(400).json({ message: error.details[0].message });
    try {
        const request = await FollowRequest.findById(requestId);
        if (!request) return res.status(404).json({ message: 'Follow request not found' });
        if (request.receiver.toString() !== user._id.toString()) {
            return res.status(403).json({ message: 'You are not authorized to reject this request' });
        }
        // Delete the follow request
        await request.deleteOne();
        return res.status(200).json({ message: 'Follow request rejected' });
    } catch (error) {
        return res.status(500).json({ message: 'Server error' });
    }
})

module.exports = router;