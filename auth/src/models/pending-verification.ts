import mongoose from 'mongoose';

interface PendingVerificationAttrs {
  email: string;
  password: string;
  secret: string;
  expiresAt: Date;
}

interface PendingVerificationDoc extends mongoose.Document {
  email: string;
  password: string;
  secret: string;
  expiresAt: Date;
  failedAttempts: number;
  lastAttempt: Date;
}

interface PendingVerificationModel
  extends mongoose.Model<PendingVerificationDoc> {
  build(attrs: PendingVerificationAttrs): PendingVerificationDoc;

  replacePendingVerification(
    attrs: PendingVerificationAttrs,
    retries?: number
  ): Promise<PendingVerificationDoc>;
}

const pendingVerificationSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  secret: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    expires: 0, // Enable TTL to automatically delete expired documents
  },
  failedAttempts: {
    type: Number,
    default: 0,
  },
  lastAttempt: {
    type: Date,
    default: Date.now,
  },
});

// Define the build method
pendingVerificationSchema.statics.build = (
  attrs: PendingVerificationAttrs
): PendingVerificationDoc => {
  return new PendingVerification(attrs);
};

// Define the replacePendingVerification method
pendingVerificationSchema.statics.replacePendingVerification = async (
  attrs: PendingVerificationAttrs,
  retries: number = 3
): Promise<PendingVerificationDoc> => {
  try {
    // Delete the existing pending verification (if any)
    await PendingVerification.deleteOne({ email: attrs.email });

    // Create a new pending verification
    const newPendingVerification = PendingVerification.build(attrs);
    await newPendingVerification.save();

    return newPendingVerification;
  } catch (error: any) {
    // Retry if it's a duplicate key error and retries are remaining
    if (retries > 0 && error.code === 11000) {
      return PendingVerification.replacePendingVerification(attrs, retries - 1);
    }

    throw error;
  }
};

const PendingVerification = mongoose.model<
  PendingVerificationDoc,
  PendingVerificationModel
>('PendingVerification', pendingVerificationSchema);

export { PendingVerification };
