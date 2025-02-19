import express, { Request, Response } from 'express';
import { body } from 'express-validator';
import { BadRequestError, validateRequest } from '@jobizzapp/common';
import { User } from '../models/user';
import speakeasy from 'speakeasy';
import { Email } from '../utils/Email';
import { PendingVerification } from '../models/pending-verification';

const router = express.Router();

router.post(
  '/api/signup',
  [
    body('email')
      .isEmail()
      .not()
      .isEmpty()
      .withMessage('please provide a valid email'),
    body('password')
      .isLength({ min: 4, max: 10 })
      .not()
      .isEmpty()
      .withMessage('password must be within 4 to 10 digits'),
    body('passwordConfirm').custom((value, { req }) => {
      return value === req.body.password;
    }),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    const { email, password } = req.body;

    const isEmailExist = await User.findOne({ email });
    if (isEmailExist) {
      throw new BadRequestError('Email already exists');
    }

    const secret = speakeasy.generateSecret({ length: 20 });

    const pendingVerification =
      await PendingVerification.replacePendingVerification({
        email,
        password,
        secret: secret.base32,
        expiresAt: new Date(Date.now() + 180000), // 3 minutes expiry
      });

    await pendingVerification.save();

    const otp = speakeasy.totp({
      secret: secret.base32,
      encoding: 'base32',
      step: 180,
    });

    const emailServices = new Email(email);
    await emailServices.send(otp);

    res.status(200).json({
      status: 'success',
      message:
        'Please verify your email with the OTP sent to your email address',
    });
  }
);

export { router as signupRouter };
