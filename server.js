import express from 'express';
import environment from 'dotenv';
import cors from 'cors';

import fileUpload from 'express-fileupload';

import connectDB from './config/db.js';
import { errorHandler } from './middlewares/errorMiddleware.js';
import routes from './routes/routes.js';
import morgan from 'morgan';

environment.config();
const port = process.env.PORT;
connectDB();
const app = express();

app.use(cors());
app.use(morgan('dev'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  fileUpload({
    limits: { fileSize: 5 * 1024 * 1024 }, //5MB max file(s) size
  }),
);

app.get('/', (_req, res) => {
  res.status(200).json({
    message: 'BACKEND IS RUNNING!',
  });
});

app.use('/api', routes);

app.use(express.static('public'));

app.use(errorHandler);
app.listen(port, () => console.log(`Server started on port ${port}.`));
