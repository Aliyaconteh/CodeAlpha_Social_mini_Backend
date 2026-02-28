const db = require('../models/db');

exports.getAllUsers = async (req, res) => {
  const { search } = req.query;
  const currentUserId = req.user.id;

  let query = `
    SELECT
      u.id,
      u.username,
      u.bio,
      u.profile_picture,
      u.created_at,
      (SELECT COUNT(*) FROM followers WHERE following_id = u.id) as followers_count,
      (SELECT COUNT(*) FROM followers WHERE follower_id = u.id) as following_count,
      EXISTS(SELECT 1 FROM followers WHERE follower_id = ? AND following_id = u.id) as is_following
    FROM users u
    WHERE u.id != ?
  `;

  const params = [currentUserId, currentUserId];

  if (search) {
    query += ' AND u.username LIKE ?';
    params.push(`%${search}%`);
  }

  query += ' ORDER BY u.created_at DESC';

  try {
    const [users] = await db.query(query, params);
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.followUser = async (req, res) => {
  const { id } = req.params;
  const currentUserId = req.user.id;

  if (id == currentUserId) {
    return res.status(400).json({ message: 'Cannot follow yourself' });
  }

  try {
    // Check if already following
    const [existing] = await db.query(
      'SELECT * FROM followers WHERE follower_id = ? AND following_id = ?',
      [currentUserId, id]
    );

    if (existing.length > 0) {
      // Unfollow
      await db.query(
        'DELETE FROM followers WHERE follower_id = ? AND following_id = ?',
        [currentUserId, id]
      );
      res.json({ message: 'User unfollowed', action: 'unfollow' });
    } else {
      // Follow
      await db.query(
        'INSERT INTO followers (follower_id, following_id) VALUES (?, ?)',
        [currentUserId, id]
      );
      res.json({ message: 'User followed', action: 'follow' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};