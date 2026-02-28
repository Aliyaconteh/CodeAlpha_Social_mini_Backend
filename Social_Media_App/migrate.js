require('dotenv').config();
const db = require('./models/db');

async function migrate() {
    try {
        console.log('Starting migration...');

        // Add media_url column
        try {
            await db.query('ALTER TABLE posts ADD COLUMN media_url VARCHAR(255)');
            console.log('Added media_url column.');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('media_url column already exists.');
            } else {
                console.error('Error adding media_url:', err);
            }
        }

        // Add media_type column
        try {
            await db.query("ALTER TABLE posts ADD COLUMN media_type ENUM('image', 'video', 'none') DEFAULT 'none'");
            console.log('Added media_type column.');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('media_type column already exists.');
            } else {
                console.error('Error adding media_type:', err);
            }
        }

        console.log('Migration complete.');
        process.exit();
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
