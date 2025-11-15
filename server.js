import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import materialRouter from './router/materialRoutes.js';
import userRouter from './router/userRoutes.js';
import questionRouter from './router/questionRoutes.js';
import validationRouter from './router/validationRoutes.js';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

app.use('/api', materialRouter);
app.use('/api', userRouter);
app.use('/api', questionRouter);
app.use('/api', validationRouter);

const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`Server is running on PORT: ${PORT}`);
});
