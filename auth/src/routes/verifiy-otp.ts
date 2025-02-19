import express, { Request, Response } from 'express';
import { body } from 'express-validator';
import { NotFoundError, validateRequest } from '@jobizzapp/common';
import { User, UserStatus } from '../models/user';
import speakeasy from 'speakeasy';
import jwt from 'jsonwebtoken';
import { PendingVerification } from '../models/pending-verification';

const router = express.Router();

const MAX_FAILED_ATTEMPTS = 3;
const COOLDOWN_PERIOD = 5 * 60 * 1000; // 5 minutes

router.post(
  '/api/verify-otp',
  [
    body('email')
      .isEmail()
      .not()
      .isEmpty()
      .withMessage('provide email address'),
    body('otp')
      .not()
      .isEmpty()
      .withMessage('provide otp to validate the email address'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    const { email, otp } = req.body;

    const pendingVerification = await PendingVerification.findOne({ email });

    if (!pendingVerification) {
      throw new NotFoundError();
    }

    // Check if the OTP is expired
    if (pendingVerification.expiresAt < new Date()) {
      res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP',
      });
      return;
    }

    // Check for maximum failed attempts and cooldown period
    if (pendingVerification.failedAttempts >= MAX_FAILED_ATTEMPTS) {
      const timeSinceLastAttempt =
        Date.now() - pendingVerification.lastAttempt.getTime();
      if (timeSinceLastAttempt < COOLDOWN_PERIOD) {
        res.status(429).json({
          success: false,
          message: `Too many failed attempts. Please try again after ${
            COOLDOWN_PERIOD / 1000 / 60
          } minutes`,
        });
        return;
      } else {
        pendingVerification.failedAttempts = 0; // Reset failed attempts after cooldown
        await pendingVerification.save();
      }
    }

    const isValid = speakeasy.totp.verify({
      secret: pendingVerification.secret,
      encoding: 'base32',
      token: otp,
      step: 180,
      window: 2,
    });

    if (isValid) {
      // Create the actual user only after OTP verification
      const user = User.build({
        email: pendingVerification.email,
        password: pendingVerification.password,
        status: UserStatus.Verified,
      });

      await user.save();

      // Delete the pending verification
      await pendingVerification.deleteOne();

      const userJwt = jwt.sign(
        {
          id: user._id,
          email: user.email,
        },
        process.env.JWT_SECRET!
      );

      req.session = { jwt: userJwt };

      res.status(201).send({
        message: 'Email verified successfully',
        user,
      });
    } else {
      pendingVerification.failedAttempts += 1;
      pendingVerification.lastAttempt = new Date();
      await pendingVerification.save();
      res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP',
      });
    }
  }
);

export { router as verifiyOtpRouter };
