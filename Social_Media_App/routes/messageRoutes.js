const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { sendMessage, getMessages, reactToMessage } = require('../controllers/messageController');

router.post('/', auth, sendMessage);
router.get('/:user_id', auth, getMessages);
router.post('/:id/react', auth, reactToMessage);

module.exports = router;