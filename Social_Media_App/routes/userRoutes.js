const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const { getProfile, updateProfile, followUser, getUserById } = require('../controllers/userController');
const { getAllUsers, followUser: followUserAction } = require('../controllers/usersController');

router.get('/profile', auth, getProfile);
router.get('/:id', auth, getUserById);
router.put('/profile', auth, upload.single('profilePicture'), updateProfile);
router.post('/:id/follow', auth, followUser);

// New routes for users page
router.get('/', auth, getAllUsers);
router.post('/:id/follow-user', auth, followUserAction);

module.exports = router;
