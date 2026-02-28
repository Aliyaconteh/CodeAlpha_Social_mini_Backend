const db = require('../models/db');

// ADD COMMENT
exports.addComment = async (req, res) => {
  const { content, parent_id } = req.body;
  const postId = req.params.id; // Changed from { postId } to req.params.id

  if (!postId || isNaN(postId)) {
    return res.status(400).json({ message: 'Invalid post ID' });
  }

  try {
    await db.query(
      'INSERT INTO comments (post_id, user_id, content, parent_id) VALUES (?, ?, ?, ?)',
      [postId, req.user.id, content, parent_id || null]
    );

    res.status(201).json({ message: 'Comment added' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ GET COMMENTS FOR A POST
exports.getComments = async (req, res) => {
  const { id } = req.params;

  try {
    // Get main comments (parent_id IS NULL)
    const [mainComments] = await db.query(`
      SELECT comments.*, users.username
      FROM comments
      JOIN users ON comments.user_id = users.id
      WHERE comments.post_id = ? AND comments.parent_id IS NULL
      ORDER BY comments.created_at ASC
    `, [id]);

    // Get replies for each main comment
    for (let comment of mainComments) {
      const [replies] = await db.query(`
        SELECT comments.*, users.username
        FROM comments
        JOIN users ON comments.user_id = users.id
        WHERE comments.parent_id = ?
        ORDER BY comments.created_at ASC
      `, [comment.id]);
      comment.replies = replies;
    }

    res.json(mainComments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
