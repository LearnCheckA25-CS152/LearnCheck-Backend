import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import materialRouter from './router/materialRoutes.js';
import userRouter from './router/userRoutes.js';
import questionRouter from './router/questionRoutes.js';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

app.use(materialRouter);
app.use(userRouter);
app.use(questionRouter);

app.use('/api', materialRouter);
app.use('/api', userRouter);
app.use('/api', questionRouter);

const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`Server is running on PORT: ${PORT}`);
});
