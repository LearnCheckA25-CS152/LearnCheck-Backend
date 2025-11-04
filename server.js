import express from 'express';
import dotenv from 'dotenv';
import router from './router/materialRoutes.js';

dotenv.config();

const app = express();
app.use(express.json());
app.use(router);

app.use('/api', router);

const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`Server is running on PORT: ${PORT}`);
});