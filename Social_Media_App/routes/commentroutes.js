const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { addComment, getComments } = require('../controllers/commentController');

router.post('/:postId', auth, addComment);
router.get('/:id/comments', getComments);

module.exports = router;
