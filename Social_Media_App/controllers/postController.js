const db = require('../models/db');

exports.createPost = async (req, res) => {
  const { content } = req.body;
  const image_url = req.file ? `/uploads/${req.file.filename}` : null;

  // Validation: Must have at least content OR image
  if (!content && !image_url) {
    return res.status(400).json({ message: 'Post must contain text or an image' });
  }

  await db.query(
    'INSERT INTO posts (user_id, content, media_url, media_type) VALUES (?, ?, ?, ?)',
    [req.user.id, content, image_url, image_url ? 'image' : 'none']
  );

  res.status(201).json({ message: 'Post created' });
};

exports.deletePost = async (req, res) => {
  const { id } = req.params;

  try {
    // Check ownership
    const [posts] = await db.query('SELECT * FROM posts WHERE id = ?', [id]);
    if (posts.length === 0) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (posts[0].user_id !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    await db.query('DELETE FROM posts WHERE id = ?', [id]);
    res.json({ message: 'Post deleted' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getPosts = async (req, res) => {
  try {
    const { user_id } = req.query;

    let query = `
      SELECT posts.*, users.username, users.profile_picture,
             (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id) as like_count,
             COALESCE((SELECT GROUP_CONCAT(like_users.username) FROM likes
              JOIN users like_users ON likes.user_id = like_users.id
              WHERE likes.post_id = posts.id LIMIT 3), '') as liked_by_users,
             EXISTS(SELECT 1 FROM likes WHERE likes.post_id = posts.id AND likes.user_id = ?) as is_liked,
             (SELECT COUNT(*) FROM dislikes WHERE dislikes.post_id = posts.id) as hate_count,
             EXISTS(SELECT 1 FROM dislikes WHERE dislikes.post_id = posts.id AND dislikes.user_id = ?) as is_hated
      FROM posts
      JOIN users ON posts.user_id = users.id
    `;

    const params = [req.user.id, req.user.id];

    if (user_id) {
      query += ' WHERE posts.user_id = ?';
      params.push(user_id);
    }

    query += ' ORDER BY posts.created_at DESC';

    const [posts] = await db.query(query, params);
    res.json(posts);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
};

exports.likePost = async (req, res) => {
  const { id } = req.params;

  // Check if already liked
  const [existing] = await db.query(
    'SELECT * FROM likes WHERE post_id = ? AND user_id = ?',
    [id, req.user.id]
  );

  if (existing.length > 0) {
    // Unlike
    await db.query(
      'DELETE FROM likes WHERE post_id = ? AND user_id = ?',
      [id, req.user.id]
    );
    res.json({ message: 'Post unliked' });
  } else {
    // Like
    await db.query(
      'INSERT INTO likes (post_id, user_id) VALUES (?, ?)',
      [id, req.user.id]
    );
    res.json({ message: 'Post liked' });
  }
};

exports.hatePost = async (req, res) => {
  const { id } = req.params;

  // Check if already hated
  const [existing] = await db.query(
    'SELECT * FROM dislikes WHERE post_id = ? AND user_id = ?',
    [id, req.user.id]
  );

  if (existing.length > 0) {
    // Unhate
    await db.query(
      'DELETE FROM dislikes WHERE post_id = ? AND user_id = ?',
      [id, req.user.id]
    );
    res.json({ message: 'Post unhated' });
  } else {
    // Hate
    await db.query(
      'INSERT INTO dislikes (post_id, user_id) VALUES (?, ?)',
      [id, req.user.id]
    );
    res.json({ message: 'Post hated' });
  }
};

exports.getPostLikeInfo = async (req, res) => {
  const { id } = req.params;

  try {
    // Get like count
    const [likeCountResult] = await db.query(
      'SELECT COUNT(*) as like_count FROM likes WHERE post_id = ?',
      [id]
    );

    // Get liked by users (up to 3)
    const [likedUsersResult] = await db.query(
      'SELECT GROUP_CONCAT(u.username) as liked_by_users FROM likes l JOIN users u ON l.user_id = u.id WHERE l.post_id = ? LIMIT 3',
      [id]
    );

    // Check if current user liked
    const [userLikedResult] = await db.query(
      'SELECT COUNT(*) as is_liked FROM likes WHERE post_id = ? AND user_id = ?',
      [id, req.user.id]
    );

    // Get hate count
    const [hateCountResult] = await db.query(
      'SELECT COUNT(*) as hate_count FROM dislikes WHERE post_id = ?',
      [id]
    );

    // Check if current user hated
    const [userHatedResult] = await db.query(
      'SELECT COUNT(*) as is_hated FROM dislikes WHERE post_id = ? AND user_id = ?',
      [id, req.user.id]
    );

    const likeInfo = {
      like_count: likeCountResult[0].like_count,
      liked_by_users: likedUsersResult[0].liked_by_users || '',
      is_liked: userLikedResult[0].is_liked > 0,
      hate_count: hateCountResult[0].hate_count,
      is_hated: userHatedResult[0].is_hated > 0
    };

    res.json(likeInfo);
  } catch (err) {
    console.error('Error getting like info:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
