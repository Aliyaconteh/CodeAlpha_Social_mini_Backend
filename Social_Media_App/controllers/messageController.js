const db = require('../models/db');

exports.sendMessage = async (req, res) => {
  const { receiver_id, content } = req.body;

  if (!receiver_id || !content) {
    return res.status(400).json({ message: 'Receiver and content are required' });
  }

  try {
    await db.query(
      'INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)',
      [req.user.id, receiver_id, content]
    );

    res.status(201).json({ message: 'Message sent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getMessages = async (req, res) => {
  const { user_id } = req.params;

  try {
    const [messages] = await db.query(`
      SELECT messages.*, users.username as sender_username,
             (SELECT COUNT(*) FROM message_reactions WHERE message_reactions.message_id = messages.id AND reaction_type = 'like') as like_count,
             (SELECT COUNT(*) FROM message_reactions WHERE message_reactions.message_id = messages.id AND reaction_type = 'hate') as hate_count,
             EXISTS(SELECT 1 FROM message_reactions WHERE message_reactions.message_id = messages.id AND message_reactions.user_id = ? AND reaction_type = 'like') as is_liked,
             EXISTS(SELECT 1 FROM message_reactions WHERE message_reactions.message_id = messages.id AND message_reactions.user_id = ? AND reaction_type = 'hate') as is_hated
      FROM messages
      JOIN users ON messages.sender_id = users.id
      WHERE (messages.sender_id = ? AND messages.receiver_id = ?) OR (messages.sender_id = ? AND messages.receiver_id = ?)
      ORDER BY messages.created_at ASC
    `, [req.user.id, req.user.id, req.user.id, user_id, user_id, req.user.id]);

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.reactToMessage = async (req, res) => {
  const { id } = req.params;
  const { reaction_type } = req.body; // 'like' or 'hate'

  if (!['like', 'hate'].includes(reaction_type)) {
    return res.status(400).json({ message: 'Invalid reaction type' });
  }

  try {
    // Check if already reacted
    const [existing] = await db.query(
      'SELECT * FROM message_reactions WHERE message_id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (existing.length > 0) {
      if (existing[0].reaction_type === reaction_type) {
        // Remove reaction
        await db.query(
          'DELETE FROM message_reactions WHERE message_id = ? AND user_id = ?',
          [id, req.user.id]
        );
        res.json({ message: 'Reaction removed' });
      } else {
        // Change reaction
        await db.query(
          'UPDATE message_reactions SET reaction_type = ? WHERE message_id = ? AND user_id = ?',
          [reaction_type, id, req.user.id]
        );
        res.json({ message: 'Reaction updated' });
      }
    } else {
      // Add reaction
      await db.query(
        'INSERT INTO message_reactions (message_id, user_id, reaction_type) VALUES (?, ?, ?)',
        [id, req.user.id, reaction_type]
      );
      res.json({ message: 'Reaction added' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};