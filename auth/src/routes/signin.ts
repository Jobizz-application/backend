import { BadRequestError, validateRequest } from '@jobizzapp/common';
import express, { Request, Response } from 'express';
import { body } from 'express-validator';
import { User } from '../models/user';
import { Password } from '../utils/Password';
import jwt from 'jsonwebtoken';

const router = express.Router();

const MAX_FAILED_ATTEMPTS = 2;
const COOLDOWN_PERIOD = 5 * 60 * 1000; // 5 minutes

router.post(
  '/api/signin',
  [
    body('email')
      .not()
      .isEmpty()
      .isEmail()
      .withMessage('please provide a valid email'),
    body('password').not().isEmpty().withMessage('please provide a password'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    const { email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      throw new BadRequestError('Invalid Credentials');
    }

    if (existingUser.failedAttempts >= MAX_FAILED_ATTEMPTS) {
      const timeSinceLastAttempt =
        Date.now() - existingUser.lastAttempt.getTime();

      if (timeSinceLastAttempt < COOLDOWN_PERIOD) {
        res.status(429).json({
          status: 'fails',
          message: `Too many failed attempts. Please try again after ${
            COOLDOWN_PERIOD / 1000 / 60
          } minutes`,
        });
        return;
      } else {
        existingUser.failedAttempts = 0;
        await existingUser.save();
      }
    }

    const isPasswordMatch = await Password.compare(
      existingUser.password,
      password
    );
    if (!isPasswordMatch) {
      existingUser.failedAttempts += 1;
      existingUser.lastAttempt = new Date();
      await existingUser.save();
      throw new BadRequestError('Invalid Credentials');
    }

    const userJwt = jwt.sign(
      {
        id: existingUser._id,
        email: email,
      },
      process.env.JWT_SECRET!
    );

    req.session = { jwt: userJwt };
    res.status(200).send(existingUser);
  }
);

export { router as signinRouter };
