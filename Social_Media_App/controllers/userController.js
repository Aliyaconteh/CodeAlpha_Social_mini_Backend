const db = require('../models/db');

exports.getProfile = async (req, res) => {
  const { id } = req.params;
  const userId = id || req.user.id;

  const [user] = await db.query(
    'SELECT id, username, email, bio, profile_picture FROM users WHERE id = ?',
    [userId]
  );

  if (user.length === 0) {
    return res.status(404).json({ message: 'User not found' });
  }

  // Get follower/following counts
  const [followers] = await db.query(
    'SELECT COUNT(*) as count FROM followers WHERE following_id = ?',
    [userId]
  );
  const [following] = await db.query(
    'SELECT COUNT(*) as count FROM followers WHERE follower_id = ?',
    [userId]
  );

  const profile = {
    ...user[0],
    followers: followers[0].count,
    following: following[0].count
  };

  res.json(profile);
};

exports.updateProfile = async (req, res) => {
  const { username, bio } = req.body;
  let profilePicture = null;

  // Handle profile picture upload
  if (req.file) {
    profilePicture = `/uploads/${req.file.filename}`;
  }

  // Build update query dynamically
  let updateFields = [];
  let values = [];

  if (username !== undefined) {
    updateFields.push('username = ?');
    values.push(username);
  }

  if (bio !== undefined) {
    updateFields.push('bio = ?');
    values.push(bio);
  }

  if (profilePicture) {
    updateFields.push('profile_picture = ?');
    values.push(profilePicture);
  }

  if (updateFields.length === 0) {
    return res.status(400).json({ message: 'No fields to update' });
  }

  values.push(req.user.id);

  await db.query(
    `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
    values
  );

  res.json({ message: 'Profile updated' });
};

exports.followUser = async (req, res) => {
  const { id } = req.params;

  // Check if already following
  const [existing] = await db.query(
    'SELECT * FROM followers WHERE follower_id = ? AND following_id = ?',
    [req.user.id, id]
  );

  if (existing.length > 0) {
    // Unfollow
    await db.query(
      'DELETE FROM followers WHERE follower_id = ? AND following_id = ?',
      [req.user.id, id]
    );
    res.json({ message: 'User unfollowed' });
  } else {
    // Follow
    await db.query(
      'INSERT INTO followers (follower_id, following_id) VALUES (?, ?)',
      [req.user.id, id]
    );
    res.json({ message: 'User followed' });
  }
};

exports.getUserById = async (req, res) => {
  const userId = req.params.id;

  try {
    // Query the user info along with follower/following counts
    const [rows] = await db.query(
      `SELECT id, username, bio, profile_picture,
              (SELECT COUNT(*) FROM followers WHERE following_id = ?) AS followers,
              (SELECT COUNT(*) FROM followers WHERE follower_id = ?) AS following
       FROM users
       WHERE id = ?`,
      [userId, userId, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Optionally, check if the logged-in user follows this user
    const [isFollowingResult] = await db.query(
      'SELECT COUNT(*) AS count FROM followers WHERE follower_id = ? AND following_id = ?',
      [req.user.id, userId]
    );

    const user = rows[0];
    user.is_following = isFollowingResult[0].count > 0;

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
