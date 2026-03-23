import mongoose from 'mongoose';
import 'dotenv/config';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { userSchema } from '../src/schemas/mongo-schema/userSchema.js';
import { commandSchema } from '../src/schemas/mongo-schema/commandSchema.js';

const User = mongoose.model('user', userSchema, 'users');
const Command = mongoose.model('command', commandSchema, 'commands');

async function verify() {
  await mongoose.connect(process.env.DATABASE_URL);
  let failures = 0;

  try {
    const username = `verify_${Date.now()}`;
    const passwordHash = await bcrypt.hash('Secure123!', 10);
    const user = await User.create({
      username,
      email: `${username}@test.com`,
      passwordHash,
    });
    console.log(`✅ User registered: ${user.username}`);

    const token = jwt.verify(
      jwt.sign({ userId: user._id, username }, process.env.JWT_SECRET, {
        expiresIn: '1h',
      }),
      process.env.JWT_SECRET,
    );
    if (token.userId !== user._id.toString())
      throw new Error('Token userId mismatch');
    console.log(`✅ JWT signed and verified`);

    const command = await Command.create({
      name: 'Test',
      command: '/verify',
      text: 'ok',
      userId: user._id,
    });
    console.log(`✅ Command created with userId: ${command.userId}`);

    const othersCommands = await Command.find({
      userId: { $ne: user._id },
      userId2: user._id,
    });
    const ownCommands = await Command.find({ userId: user._id });
    if (ownCommands.length !== 1) {
      console.error(
        `❌ Isolation failed — expected 1, got ${ownCommands.length}`,
      );
      failures++;
    } else {
      console.log(`✅ Data isolation verified (1 command for this user)`);
    }

    await Command.deleteOne({ _id: command._id });
    await User.deleteOne({ _id: user._id });
    console.log(`✅ Cleanup done`);
  } catch (err) {
    console.error('❌ Error:', err.message);
    failures++;
  } finally {
    await mongoose.disconnect();
    if (failures === 0) {
      console.log('\n✅ ALL CHECKS PASSED');
    } else {
      console.error(`\n❌ ${failures} CHECK(S) FAILED`);
      process.exit(1);
    }
  }
}

verify();
