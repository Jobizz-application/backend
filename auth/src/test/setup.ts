import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { User, UserStatus } from '../models/user';

declare global {
  var signin: () => Promise<string[]>;
}

let mongo: MongoMemoryServer;
jest.mock('../utils/Email.ts');

beforeAll(async () => {
  // Setup MongoDB Memory Server
  process.env.JWT_KEY = 'asdf'; // Add test JWT key

  mongo = await MongoMemoryServer.create();
  const mongoUri = mongo.getUri();

  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 10000, // Increase timeout for server selection
  });
});

beforeEach(async () => {
  // Clear all collections before each test
  const collections = await mongoose.connection.db!.collections();

  for (let collection of collections) {
    await collection.deleteMany({});
  }
});

afterAll(async () => {
  // Cleanup after all tests
  if (mongo) {
    await mongo.stop();
  }
  await mongoose.connection.close();
});

global.signin = async () => {
  const user = User.build({
    email: 'test@test.com',
    password: '1234565798',
    status: UserStatus.Verified,
  });

  await user.save();

  const payload = {
    id: new mongoose.Types.ObjectId().toHexString(),
    email: 'test@test.com',
  };

  const token = jwt.sign(
    {
      id: user._id,
      email: user.email,
    },
    process.env.JWT_KEY!
  );

  const session = { jwt: token };

  const sessionJson = JSON.stringify(session);

  const base64 = Buffer.from(sessionJson).toString('base64');

  return [`session=${base64}`];
};
