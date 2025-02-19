import express from 'express';
import 'express-async-errors';
import cookieSession from 'cookie-session';
import { currentUser, errorHandler, NotFoundError } from '@jobizzapp/common';
import { signupRouter } from './routes/signup';
import { verifiyOtpRouter } from './routes/verifiy-otp';
import { signinRouter } from './routes/signin';
import { signoutRouter } from './routes/signout';
import { currentUserRouter } from './routes/current-user';

const app = express();
app.set('trust proxy', true);
app.use(express.json());
app.use(
  cookieSession({ signed: false, secure: process.env.NODE_ENV !== 'test' })
);

app.use(currentUser);

app.use(signupRouter);
app.use(verifiyOtpRouter);
app.use(signinRouter);
app.use(signoutRouter);
app.use(currentUserRouter);

app.all('*', async () => {
  throw new NotFoundError();
});

app.use(errorHandler);

export { app };
