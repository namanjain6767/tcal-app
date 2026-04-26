const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('ALTER TABLE workflow_assignments ADD COLUMN IF NOT EXISTS jo_number VARCHAR(100);')
  .then(() => { console.log('Migration successful'); process.exit(0); })
  .catch(e => { console.error(e); process.exit(1); });
