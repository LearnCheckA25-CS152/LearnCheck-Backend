import express from 'express';
import dotenv from 'dotenv';
import materialRouter from './router/materialRoutes.js';
import userRouter from './router/userRoutes.js';

dotenv.config();
const app = express();
app.use(express.json());

app.use(materialRouter);
app.use(userRouter);

app.use('/api', materialRouter);
app.use('/api', userRouter);

const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`Server is running on PORT: ${PORT}`);
});