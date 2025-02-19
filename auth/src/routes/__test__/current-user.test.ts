import request from 'supertest';
import { app } from '../../app';
import { Email } from '../../utils/Email';

jest.mock('../../utils/Email');
beforeEach(() => {
  jest.clearAllMocks();
});

it('responds with details about the current user', async () => {
  const cookiee = await global.signin();
  console.log(cookiee);
  const response = await request(app)
    .get('/api/currentuser')
    .send()
    .set('Cookie', cookiee)
    .expect(200);

  expect(response.body.currentUser?.email).toEqual('test@test.com');
});

it('responds with null if not authenticated', async () => {
  const response = await request(app)
    .get('/api/currentuser')
    .send()
    .expect(200);

  expect(response.body.currentUser).toEqual(null);
});

