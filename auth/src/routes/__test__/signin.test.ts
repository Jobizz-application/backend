import request from 'supertest';
import { app } from '../../app';
import { User, UserStatus } from '../../models/user';

describe('POST /api/signin', () => {
  // Validation tests
  it('returns a 400 if email is not provided', async () => {
    await request(app)
      .post('/api/signin')
      .send({
        password: '1231546',
      })
      .expect(400);
  });

  it('returns a 400 if password is not provided', async () => {
    await request(app)
      .post('/api/signin')
      .send({
        email: 'test@gmail.com',
      })
      .expect(400);
  });

  it('returns a 400 if email is not a valid email format', async () => {
    await request(app)
      .post('/api/signin')
      .send({
        email: 'test',
        password: '1231546',
      })
      .expect(400);
  });

  // Authentication tests
  it('returns a 400 if the email does not exist', async () => {
    await request(app)
      .post('/api/signin')
      .send({
        email: 'test@gmail.com',
        password: '1231546',
      })
      .expect(400);
  });

  it('returns a 400 if the password is incorrect', async () => {
    const user = User.build({
      email: 'test@gmail.com',
      password: '1231546',
      status: UserStatus.Verified,
    });

    await user.save();

    await request(app)
      .post('/api/signin')
      .send({
        email: 'test@gmail.com',
        password: '12315406',
      })
      .expect(400);
  });

  it('returns a 200 and sets a cookie if the credentials are valid', async () => {
    const user = User.build({
      email: 'test@gmail.com',
      password: '1231546',
      status: UserStatus.Verified,
    });

    await user.save();

    const response = await request(app).post('/api/signin').send({
      email: 'test@gmail.com',
      password: '1231546',
    });

    expect(response.statusCode).toBe(200);
    expect(response.get('Set-Cookie')).toBeDefined;
  });

  // Edge cases
  it('handles multiple signin attempts with incorrect credentials', async () => {
    const user = User.build({
      email: 'test@gmail.com',
      password: '1231546',
      status: UserStatus.Verified,
    });

    await user.save();

    await request(app)
      .post('/api/signin')
      .send({
        email: 'test@gmail.com',
        password: 'wrongpassword1',
      })
      .expect(400);

    await request(app)
      .post('/api/signin')
      .send({
        email: 'test@gmail.com',
        password: 'wrongpassword2',
      })
      .expect(400);

    await request(app)
      .post('/api/signin')
      .send({
        email: 'test@gmail.com',
        password: 'wrongpassword3',
      })
      .expect(429);
  });

  it('handles signin attempts with special characters in email', async () => {
    const specialEmail = 'test+alias@gmail.com';

    const user = User.build({
      email: specialEmail,
      password: '1231546',
      status: UserStatus.Verified,
    });

    await user.save();

    const response = await request(app).post('/api/signin').send({
      email: specialEmail,
      password: '1231546',
    });

    expect(response.statusCode).toBe(200);
    expect(response.get('Set-Cookie')).toBeDefined;
  });

  it.todo('returns a 400 if the user is not verified');
});
