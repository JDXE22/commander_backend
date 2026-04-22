import mongoose from 'mongoose';
import 'dotenv/config';
import { CommandModel } from '../src/models/mongo/commandModel.js';
import { commandSchema } from '../src/schemas/mongo-schema/commandSchema.js';
import { BadRequestError } from '../src/utils/errors.js';

const Command = mongoose.model('command', commandSchema, 'commands');

async function testSearch() {
  await mongoose.connect(
    process.env.DATABASE_URL || 'mongodb://localhost:27017/commander',
  );
  console.log('Connected to database');

  const commandModel = new CommandModel();
  let failures = 0;

  const assert = (condition, message) => {
    if (!condition) {
      console.error(`❌ ${message}`);
      failures++;
      return false;
    }
    console.log(`✅ ${message}`);
    return true;
  };

  try {
    const userId = new mongoose.Types.ObjectId();

    const testData = [
      {
        name: 'Exact Match',
        command: '/test',
        text: 'This is an exact match',
        userId,
      },
      {
        name: 'Prefix Match',
        command: '/test-prefix',
        text: 'This starts with /test',
        userId,
      },
      {
        name: 'Contains Match',
        command: '/app/test',
        text: 'This contains /test',
        userId,
      },
      {
        name: 'Content Match 1',
        command: '/c1',
        text: 'Keyword: apple',
        userId,
      },
      {
        name: 'Content Match 2',
        command: '/c2',
        text: 'Keyword: banana',
        userId,
      },
      {
        name: 'Content Match 3',
        command: '/c3',
        text: 'Mixed: apple and banana',
        userId,
      },
    ];

    for (const item of testData) {
      const doc = { ...item };
      doc.commandLower = item.command.toLowerCase();
      doc.textLower = item.text.toLowerCase();
      await Command.create(doc);
    }

    // 1. Test searchTemlates - Validation
    console.log('\n--- Testing Validation ---');
    try {
      await commandModel.searchTemplates({ userId, query: '' });
      assert(false, 'Should have thrown error for empty query');
    } catch (err) {
      assert(
        err instanceof BadRequestError,
        'Throws BadRequestError for empty query',
      );
    }

    try {
      await commandModel.searchTemplates({ userId, query: 'a'.repeat(101) });
      assert(false, 'Should have thrown error for query > 100 chars');
    } catch (err) {
      assert(
        err instanceof BadRequestError,
        'Throws BadRequestError for long query',
      );
    }

    // 2. Test searchCommandTemplates (Command search)
    console.log('\n--- Testing Command Search ---');
    const cmdResult = await commandModel.searchTemplates({
      userId,
      query: '/test',
      limit: 5,
    });
    assert(cmdResult.query === '/test', 'Returns correct query');
    assert(cmdResult.templates.length >= 3, 'Returns at least 3 matches');
    assert(
      cmdResult.templates[0].command === '/test',
      'First result is exact match',
    );
    assert(
      cmdResult.templates[0].match === 'command-exact',
      'First result match type is command-exact',
    );
    assert(
      cmdResult.templates[1].command === '/test-prefix',
      'Second result is prefix match',
    );
    assert(
      cmdResult.templates[1].match === 'command-prefix',
      'Second result match type is command-prefix',
    );
    assert(
      cmdResult.templates[2].command === '/app/test',
      'Third result is contains match',
    );
    assert(
      cmdResult.templates[2].match === 'command-contains',
      'Third result match type is command-contains',
    );

    // 3. Test searchContentTemplates (Keyword search)
    console.log('\n--- Testing Keyword Search ---');
    const contentResult = await commandModel.searchTemplates({
      userId,
      query: 'apple',
      limit: 5,
    });
    assert(
      contentResult.templates.length === 2,
      'Returns 2 matches for "apple"',
    );
    assert(
      contentResult.templates.every((t) =>
        t.content.toLowerCase().includes('apple'),
      ),
      'All results contain keyword',
    );
    assert(
      contentResult.templates.every((t) => t.match === 'content'),
      'All results have "content" match type',
    );

    // 4. Test Limit
    console.log('\n--- Testing Limit ---');
    const limitResult = await commandModel.searchTemplates({
      userId,
      query: 'banana',
      limit: 1,
    });
    assert(limitResult.templates.length === 1, 'Respects limit parameter');

    // 5. Case insensitivity
    console.log('\n--- Testing Case Insensitivity ---');
    const caseResult = await commandModel.searchTemplates({
      userId,
      query: 'APPLE',
      limit: 5,
    });
    assert(
      caseResult.templates.length === 2,
      'Case insensitive search works for keywords',
    );

    const caseCmdResult = await commandModel.searchTemplates({
      userId,
      query: '/TEST',
      limit: 5,
    });
    assert(
      caseCmdResult.templates[0].command === '/test',
      'Case insensitive search works for commands',
    );

    // Cleanup
    await Command.deleteMany({ userId });
  } catch (err) {
    console.error('❌ Unexpected Error:', err);
    failures++;
  } finally {
    await mongoose.disconnect();
    if (failures === 0) {
      console.log('\n✅ ALL SEARCH TESTS PASSED');
    } else {
      console.error(`\n❌ ${failures} TEST(S) FAILED`);
      process.exit(1);
    }
  }
}

testSearch();
