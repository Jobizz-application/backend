import request from 'supertest';
import { app } from '../../app';
import { Email } from '../../utils/Email';

jest.mock('../../utils/Email');
beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/signout', () => {
  it('clears the cookie after signing out', async () => {
    // First, sign in to set a cookie
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
    await request(app).post('/api/verify-otp').send({
      email: testEmail,
      otp,
    });

    const response = await request(app)
      .post('/api/signout')
      .send({})
      .expect(200);

    // Check that the cookie is cleared
    expect(response.get('Set-Cookie')).toBeDefined();
  });
});
