const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { createPost, getPosts, likePost, hatePost, getPostLikeInfo } = require('../controllers/postController');
const { getComments, addComment } = require('../controllers/commentController');

const upload = require('../middleware/uploadMiddleware');

router.post('/', auth, upload.single('image'), createPost);
router.get('/', auth, getPosts);
router.get('/:id/like-info', auth, getPostLikeInfo);
router.post('/:id/like', auth, likePost);
router.post('/:id/hate', auth, hatePost);
router.delete('/:id', auth, require('../controllers/postController').deletePost);
router.get('/:id/comments', getComments);
router.post('/:id/comments', auth, addComment);

module.exports = router;
