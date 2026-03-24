import mongoose from 'mongoose';
import { UserModel } from '../src/models/mongo/userModel.js';
import { AuthController } from '../src/controllers/authController.js';
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import 'dotenv/config';

const res = {
  status: function (code) {
    this.statusCode = code;
    return this;
  },
  json: function (data) {
    this.data = data;
    return this;
  },
};
const next = (err) => {
  if (err) console.error('Error in next:', err);
};

async function runTest() {
  await mongoose.connect(process.env.DATABASE_URL);
  console.log('Connected to MongoDB');

  const userModel = new UserModel();
  const authController = new AuthController({ userModel });

  const testEmail = 'test_forgot@example.com';
  const testUsername = 'testforgotuser';
  const testPassword = 'oldPassword123';
  const newPassword = 'newPassword123';

  try {
    const existing = await userModel.findOne({ email: testEmail });
    if (existing) {
      await mongoose.connection.db
        .collection('users')
        .deleteOne({ _id: existing._id });
    }

    const passwordHash = await bcrypt.hash(testPassword, 10);
    const user = await userModel.create({
      input: { username: testUsername, email: testEmail, passwordHash },
    });

    const reqForgot = { body: { email: testEmail } };
    await authController.forgotPassword(reqForgot, res, next);

    const userWithToken = await userModel.findByEmail(testEmail);
    const hashedTokenInDb = userWithToken.resetPasswordToken;
    console.log('Token exists in DB:', !!hashedTokenInDb);
    console.log('3. Testing resetPassword endpoint...');
    const plainToken = 'manual-test-token';
    const hashedToken = crypto
      .createHash('sha256')
      .update(plainToken)
      .digest('hex');
    await userModel.updateResetFields(user._id, {
      resetToken: hashedToken,
      resetExpires: Date.now() + 3600000,
    });

    const reqReset = {
      params: { token: plainToken },
      body: { newPassword: newPassword },
    };
    await authController.resetPassword(reqReset, res, next);

    const updatedUser = await userModel.findOne({ username: testUsername });
    const isNewPasswordValid = await bcrypt.compare(
      newPassword,
      updatedUser.passwordHash,
    );

    if (isNewPasswordValid) {
      console.log('SUCCESS: Forgot Password flow verified!');
    } else {
      console.log('FAILURE: Password was not updated.');
    }
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

runTest();
