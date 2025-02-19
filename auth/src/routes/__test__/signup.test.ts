import request from 'supertest';
import { app } from '../../app';
import { User, UserStatus } from '../../models/user';
import { PendingVerification } from '../../models/pending-verification';
import { Email } from '../../utils/Email';

jest.mock('../../utils/Email');

describe('POST /api/signup', () => {
  beforeEach(() => {
    // Clear sent emails before each test
    jest.clearAllMocks();
  });

  jest.setTimeout(30000); // Increase global timeout to 30 seconds

  // Email validation tests
  it('returns a 400 with an invalid email', async () => {
    await request(app)
      .post('/api/signup')
      .send({
        email: 'eslamahmed',
        password: '12345646',
        passwordConfirm: '12345646',
      })
      .expect(400);
  });
  it('returns a 400 with an empty email', async () => {
    await request(app)
      .post('/api/signup')
      .send({
        password: '12345646',
        passwordConfirm: '12345646',
      })
      .expect(400);
  });

  // Password validation tests
  it('returns a 400 with a password less than 4 characters', async () => {
    await request(app)
      .post('/api/signup')
      .send({
        email: 'test@gmail.com',
        password: '123',
        passwordConfirm: '123',
      })
      .expect(400);
  });
  it('returns a 400 with a password greater than 10 characters', async () => {
    await request(app)
      .post('/api/signup')
      .send({
        email: 'test@gmail.com',
        password: '1234567891312356',
        passwordConfirm: '1234567891312356',
      })
      .expect(400);
  });
  it('returns a 400 with an empty password', async () => {
    await request(app)
      .post('/api/signup')
      .send({
        email: 'test@gmail.com',

        passwordConfirm: '123456',
      })
      .expect(400);
  });

  // Password confirmation tests
  it('returns a 400 when passwords do not match', async () => {
    await request(app)
      .post('/api/signup')
      .send({
        email: 'test@gmail.com',
        password: '1234',
        passwordConfirm: '1235',
      })
      .expect(400);
  });

  // Duplicate email tests
  it('returns a 400 with an existing email', async () => {
    const testEmail = 'test@gmail.com';

    // Create a verified user with the same email
    const user = User.build({
      email: testEmail,
      password: '25317768',
      status: UserStatus.Verified,
    });
    await user.save();

    // Try to signup with same email
    await request(app)
      .post('/api/signup')
      .send({
        email: testEmail,
        password: '25317768',
        passwordConfirm: '25317768',
      })
      .expect(400);
  }, 30000);

  // Success case tests
  it('returns a 200 with valid inputs', async () => {
    await request(app)
      .post('/api/signup')
      .send({
        email: 'test@gmail.com',
        password: '25317768',
        passwordConfirm: '25317768',
      })
      .expect(200);
  }, 15000); // 10 seconds timeout

  it('saves the pending verification to database', async () => {
    const testEmail = 'test@gmail.com';
    await request(app).post('/api/signup').send({
      email: testEmail,
      password: '25317768',
      passwordConfirm: '25317768',
    });

    const pendingVerification = await PendingVerification.findOne({
      email: testEmail,
    });
    expect(pendingVerification?.email).toEqual(testEmail);
  });

  it('sends an OTP email to the user', async () => {
    const testEmail = 'test@gmail.com';

    await request(app)
      .post('/api/signup')
      .send({
        email: testEmail,
        password: '25317768',
        passwordConfirm: '25317768',
      })
      .expect(200);

    // Check if the Email constructor was called with the correct email
    expect(Email).toHaveBeenCalledWith(testEmail);

    // Get the mock instance of Email
    const emailInstance = (Email as jest.Mock).mock.instances[0];

    // Assert: Check if the send method was called
    expect(emailInstance.send).toHaveBeenCalled();
  });

  // Response structure tests
  it('returns success status and message in response', async () => {
    const testEmail = 'test@gmail.com';

    const response = await request(app)
      .post('/api/signup')
      .send({
        email: testEmail,
        password: '25317768',
        passwordConfirm: '25317768',
      })
      .expect(200);

    expect(response.body['status']).toBe('success');
    expect(response.body['message']).toBe(
      'Please verify your email with the OTP sent to your email address'
    );
  });

  // Database state tests
  it('does not create a user record before verification', async () => {
    const testEmail = 'test@gmail.com';

    const usersBefore = await User.find();
    expect(usersBefore.length).toEqual(0);

    await request(app)
      .post('/api/signup')
      .send({
        email: testEmail,
        password: '25317768',
        passwordConfirm: '25317768',
      })
      .expect(200);

    const userAfter = await User.find();
    expect(userAfter.length).toEqual(0);
  });
  it('removes existing pending verification for same email', async () => {
    const testEmail = 'test@gmail.com';

    const pendingVerifications = await PendingVerification.find();
    expect(pendingVerifications.length).toEqual(0);

    await request(app)
      .post('/api/signup')
      .send({
        email: testEmail,
        password: '25317768',
        passwordConfirm: '25317768',
      })
      .expect(200);

    const pendingVerificationsBefore = await PendingVerification.find();
    expect(pendingVerificationsBefore.length).toEqual(1);

    await request(app)
      .post('/api/signup')
      .send({
        email: testEmail,
        password: '25317768',
        passwordConfirm: '25317768',
      })
      .expect(200);

    const pendingVerificationAfter = await PendingVerification.find();
    expect(pendingVerificationAfter.length).toEqual(1);
  });

  // Edge cases
  it('handles concurrent signups for same email', async () => {
    const testEmail = 'test@gmail.com';

    // Simulate concurrent signup requests
    await Promise.all([
      request(app).post('/api/signup').send({
        email: testEmail,
        password: '25317768',
        passwordConfirm: '25317768',
      }),
      request(app).post('/api/signup').send({
        email: testEmail,
        password: '25317768',
        passwordConfirm: '25317768',
      }),
    ]);

    // Check that only one pending verification exists
    const pendingVerifications = await PendingVerification.find({
      email: testEmail,
    });
    expect(pendingVerifications.length).toEqual(1);
  });
  it('handles special characters in email', async () => {
    const specialEmail = 'test+alias@gmail.com';

    await request(app)
      .post('/api/signup')
      .send({
        email: specialEmail,
        password: '25317768',
        passwordConfirm: '25317768',
      })
      .expect(200);

    // Verify that a pending verification is created for the special email
    const pendingVerification = await PendingVerification.findOne({
      email: specialEmail,
    });
    expect(pendingVerification).not.toBeNull();
    expect(pendingVerification?.email).toEqual(specialEmail);
  });
});
