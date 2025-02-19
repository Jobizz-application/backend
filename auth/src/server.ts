import mongoose from 'mongoose';
import { app } from './app';

const startup = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL!, {});
    console.log('DB connected successfully');
  } catch (err) {
    console.log(err);
  }

  app.listen(3000, () => {
    console.log('listening on port 3000');
  });
};

startup();