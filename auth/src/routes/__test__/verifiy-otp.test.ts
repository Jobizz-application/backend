import request from 'supertest';
import { app } from '../../app';
import { Email } from '../../utils/Email';
import { PendingVerification } from '../../models/pending-verification';
import { User } from '../../models/user';
import { UserStatus } from '../../models/user';

jest.mock('../../utils/Email');

describe('POST /api/verify-otp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Validation tests
  it('returns a 400 if email is not provided', async () => {
    await request(app)
      .post('/api/verify-otp')
      .send({
        otp: '132456',
      })
      .expect(400);
  });
  it('returns a 400 if otp is not provided', async () => {
    await request(app)
      .post('/api/verify-otp')
      .send({
        email: 'test@gmail.com',
      })
      .expect(400);
  });
  it('returns a 400 if email is not a valid email format', async () => {
    await request(app)
      .post('/api/verify-otp')
      .send({
        email: 'eslamahmed',
        otp: '132456',
      })
      .expect(400);
  });

  // OTP verification tests
  it('returns a 404 if no pending verification is found for the email', async () => {
    await request(app)
      .post('/api/verify-otp')
      .send({
        email: 'test@gmail.com',
        otp: '123456',
      })
      .expect(404);
  });
  it('returns a 400 if the OTP is invalid', async () => {
    const testEmail = 'test@gmail.com';

    await request(app)
      .post('/api/signup')
      .send({
        email: testEmail,
        password: '25317768',
        passwordConfirm: '25317768',
      })
      .expect(200);

    await request(app)
      .post('/api/verify-otp')
      .send({
        email: testEmail,
        otp: '132456789',
      })
      .expect(400);
  });
  it('returns a 400 if the OTP is expired', async () => {
    const testEmail = 'test@gmail.com';

    await request(app)
      .post('/api/signup')
      .send({
        email: testEmail,
        password: '25317768',
        passwordConfirm: '25317768',
      })
      .expect(200);

    const pendingVerification = await PendingVerification.findOne({
      email: testEmail,
    });

    // Set the expiresAt to a past time to simulate expiration
    pendingVerification?.set({
      expiresAt: new Date(Date.now() - 10000), // 10 seconds in the past
    });

    await pendingVerification?.save();

    const sendMock = (Email as jest.Mock).mock.instances[0].send;
    const firstCall = sendMock.mock.calls[0];
    const otp = firstCall[0];

    await request(app)
      .post('/api/verify-otp')
      .send({
        email: testEmail,
        otp,
      })
      .expect(400);
  });

  // Success case tests
  it('returns a 201 and verifies the user if the OTP is valid', async () => {
    const testEmail = 'test@gmail.com';

    // Sign up to generate OTP
    await request(app)
      .post('/api/signup')
      .send({
        email: testEmail,
        password: '25317768',
        passwordConfirm: '25317768',
      })
      .expect(200);

    // Capture the OTP sent in the email
    const sendMock = (Email as jest.Mock).mock.instances[0].send;
    const firstCall = sendMock.mock.calls[0];
    const otp = firstCall[0];

    // Verify OTP
    const response = await request(app).post('/api/verify-otp').send({
      email: testEmail,
      otp,
    });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('Email verified successfully');

    // Check that the user is created
    const pendingVerification = await PendingVerification.findOne({
      email: testEmail,
    });
    expect(pendingVerification).toBeNull();
  });

  it('creates a user record after successful OTP verification', async () => {
    const testEmail = 'test@gmail.com';

    // Sign up to generate OTP
    await request(app)
      .post('/api/signup')
      .send({
        email: testEmail,
        password: '25317768',
        passwordConfirm: '25317768',
      })
      .expect(200);

    // Capture the OTP sent in the email
    const sendMock = (Email as jest.Mock).mock.instances[0].send;
    const firstCall = sendMock.mock.calls[0];
    const otp = firstCall[0];

    // Verify OTP
    await request(app)
      .post('/api/verify-otp')
      .send({
        email: testEmail,
        otp,
      })
      .expect(201);
    const user = await User.findOne({ email: testEmail });
    expect(user?.email).toEqual(testEmail);
  });

  it('deletes the pending verification after successful OTP verification', async () => {
    const testEmail = 'test@gmail.com';

    // Sign up to generate OTP
    await request(app)
      .post('/api/signup')
      .send({
        email: testEmail,
        password: '25317768',
        passwordConfirm: '25317768',
      })
      .expect(200);

    // Capture the OTP sent in the email
    const sendMock = (Email as jest.Mock).mock.instances[0].send;
    const firstCall = sendMock.mock.calls[0];
    const otp = firstCall[0];

    // Verify OTP
    const response = await request(app)
      .post('/api/verify-otp')
      .send({
        email: testEmail,
        otp,
      })
      .expect(201);

    // Check that the user is created
    const pendingVerification = await PendingVerification.findOne({
      email: testEmail,
    });
    expect(pendingVerification).toBeNull();
  });

  // JWT and session tests
  it('sets a JWT token in the session after successful verification', async () => {
    const testEmail = 'test@gmail.com';

    // Sign up to generate OTP
    await request(app)
      .post('/api/signup')
      .send({
        email: testEmail,
        password: '25317768',
        passwordConfirm: '25317768',
      })
      .expect(200);

    // Capture the OTP sent in the email
    const sendMock = (Email as jest.Mock).mock.instances[0].send;
    const firstCall = sendMock.mock.calls[0];
    const otp = firstCall[0];

    // Verify OTP
    const response = await request(app).post('/api/verify-otp').send({
      email: testEmail,
      otp,
    });

    expect(response.get('Set-Cookie')).toBeDefined();
  });

  it('should return 429 after exceeding maximum failed attempts', async () => {
    const testEmail = 'test@gmail.com';
    await request(app)
      .post('/api/signup')
      .send({
        email: testEmail,
        password: '123456',
        passwordConfirm: '123456',
      })
      .expect(200);

    const pendingVerification = await PendingVerification.findOne({
      email: testEmail,
    });

    pendingVerification?.set({
      failedAttempts: 3,
      lastAttempt: new Date(),
    });
    await pendingVerification?.save();

    const sendMock = (Email as jest.Mock).mock.instances[0].send;
    const firstCall = sendMock.mock.calls[0];
    const otp = firstCall[0];

    // Make the request with an invalid OTP
    await request(app)
      .post('/api/verify-otp')
      .send({
        email: testEmail,
        otp,
      })
      .expect(429);
  });

  // Edge cases
  it('handles verification attempts with different OTPs', async () => {
    const testEmail = 'test@gmail.com';

    // Step 1: Sign up to generate the first OTP
    await request(app)
      .post('/api/signup')
      .send({
        email: testEmail,
        password: '25317768',
        passwordConfirm: '25317768',
      })
      .expect(200);

    // Step 2: Capture the first OTP sent in the email
    const emailInstances = (Email as jest.Mock).mock.instances;
    const firstInstance = emailInstances[0];
    const firstOtp = firstInstance.send.mock.calls[0][0];

    // Step 3: Request a new OTP (simulate user requesting a new OTP)
    await request(app)
      .post('/api/signup')
      .send({
        email: testEmail,
        password: '25317768',
        passwordConfirm: '25317768',
      })
      .expect(200);

    // Step 4: Capture the second OTP sent in the email
    const secondInstance = emailInstances[1];
    const secondOtp = secondInstance.send.mock.calls[0][0];
    // Step 5: Attempt verification with the first OTP (should fail)
    const firstOtpResponse = await request(app)
      .post('/api/verify-otp')
      .send({
        email: testEmail,
        otp: firstOtp,
      })
      .expect(400);

    expect(firstOtpResponse.body.success).toBe(false);
    // expect(firstOtpResponse.body.message).toMatch(/Invalid or expired OTP/);

    // Step 6: Attempt verification with the second OTP (should succeed)
    const secondOtpResponse = await request(app)
      .post('/api/verify-otp')
      .send({
        email: testEmail,
        otp: secondOtp,
      })
      .expect(201);

    // expect(secondOtpResponse.body.message).toMatch(
    //   /Email verified successfully/
    // );

    // Step 7: Check that the user is created
    const user = await User.findOne({ email: testEmail });
    expect(user).not.toBeNull();
    expect(user?.status).toBe(UserStatus.Verified);

    // Step 8: Ensure the pending verification is deleted
    const pendingVerification = await PendingVerification.findOne({
      email: testEmail,
    });
    expect(pendingVerification).toBeNull();

    // Check that a JWT token is set in the session
    expect(secondOtpResponse.get('Set-Cookie')).toBeDefined();
  });
});
