import mongoose from 'mongoose';
import { Password } from '../utils/Password';

interface UserAttrs {
  email: string;
  password: string;
  status: UserStatus;
}

export interface UserDoc extends mongoose.Document {
  email: string;
  password: string;
  status: UserStatus;
  lastAttempt: Date;
  failedAttempts: number;
}

interface UserModel extends mongoose.Model<UserDoc> {
  build(attrs: UserAttrs): UserDoc;
}

export enum UserStatus {
  Verified = 'VERIFIED',
  Not_Verified = 'NOT_VERIFIED',
  Pending = 'PENDING',
}

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: Object.values(UserStatus),
      default: UserStatus.Pending,
    },
    failedAttempts: {
      type: Number,
      default: 0,
    },
    lastAttempt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id;
        delete ret.password;
        delete ret._v;
        delete ret._id;
      },
    },
  }
);

userSchema.statics.build = (attrs: UserAttrs) => {
  return new User(attrs);
};

userSchema.pre('save', async function (done) {
  if (this.isModified('password')) {
    const hased = await Password.toHash(this.get('password'));
    this.set('password', hased);
  }
  done();
});

const User = mongoose.model<UserDoc, UserModel>('User', userSchema);

export { User };
