import 'dotenv/config';
import { createApp } from './src/app.js';
import { connectDB } from './src/Config/db.js';

const app = createApp();
const PORT = process.env.PORT || 4000;

connectDB();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});