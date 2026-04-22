import mongoose from 'mongoose';
import { commandSchema } from '../../schemas/mongo-schema/commandSchema.js';
import { URL } from '../../config/config.js';
import {
  ConflictError,
  NotFoundError,
  BadRequestError,
} from '../../utils/errors.js';

const clientOptions = {
  serverApi: {
    version: '1',
    strict: true,
    deprecationErrors: true,
  },
};

async function connect() {
  try {
    await mongoose.connect(URL, clientOptions);
    await mongoose.connection.db.admin().command({ ping: 1 });
  } catch (error) {
    console.error('Error connecting to the database');
    console.error(error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

const commandMongooseModel = mongoose.model(
  'command',
  commandSchema,
  'commands',
);
connect();

const buildFilter = (base = {}, userId) =>
  userId !== undefined ? { ...base, userId } : base;

const MATCH_TYPES = {
  COMMAND_EXACT: 'command-exact',
  COMMAND_PREFIX: 'command-prefix',
  COMMAND_CONTAINS: 'command-contains',
  CONTENT: 'content',
};

const SEARCH_CONFIG = {
  MIN_QUERY_LENGTH: 1,
  MAX_QUERY_LENGTH: 100,
  DEFAULT_LIMIT: 8,
  MIN_LIMIT: 1,
  MAX_LIMIT: 20,
};

export class CommandModel {
  getAll = async ({ userId, query }) => {
    const { limit, page } = query;

    const parsedLimit = parseInt(limit);
    const parsedPage = parseInt(page);

    const currentLimit =
      !isNaN(parsedLimit) && parsedLimit > 0 ? parsedLimit : 5;
    const currentPage = !isNaN(parsedPage) && parsedPage > 0 ? parsedPage : 1;
    const skip = (currentPage - 1) * currentLimit;

    const filter = buildFilter({}, userId);

    const result = await commandMongooseModel
      .find(filter)
      .skip(skip)
      .limit(currentLimit);
    const total = await commandMongooseModel.countDocuments(filter);
    const totalPages = Math.ceil(total / currentLimit);

    return {
      commands: result,
      totalPages,
    };
  };

  getById = async ({ id, userId }) => {
    return commandMongooseModel.findOne(buildFilter({ _id: id }, userId));
  };

  getByCommand = async ({ command, userId }) => {
    const result = await commandMongooseModel.findOne(
      buildFilter({ command }, userId),
    );
    return result ?? null;
  };

  createCommand = async ({ input, userId }) => {
    const ownerFilter = buildFilter({ command: input.command }, userId);

    const commandExists = await commandMongooseModel.findOne(ownerFilter);

    if (commandExists) {
      throw new ConflictError(
        'A command with this trigger already exists for this user',
      );
    }

    const doc = userId !== undefined ? { ...input, userId } : { ...input };
    doc.commandLower = input.command?.toLowerCase();
    doc.textLower = input.text?.toLowerCase();
    const command = new commandMongooseModel(doc);
    return command.save();
  };

  updateCommand = async ({ id, input, userId }) => {
    const updatePayload = { ...input };
    if (input.command) {
      updatePayload.commandLower = input.command.toLowerCase();
    }
    if (input.text) {
      updatePayload.textLower = input.text.toLowerCase();
    }

    const updated = await commandMongooseModel.findOneAndUpdate(
      buildFilter({ _id: id }, userId),
      updatePayload,
      { new: true },
    );

    if (!updated) {
      throw new NotFoundError('Command');
    }

    return updated;
  };

  delete = async ({ id, userId }) => {
    const deleted = await commandMongooseModel.findOneAndDelete(
      buildFilter({ _id: id }, userId),
    );

    if (!deleted) {
      throw new NotFoundError('Command');
    }

    return { message: 'Command deleted successfully' };
  };

  /**
   * Search user's templates by keyword or command
   * @param {Object} params
   * @param {string} params.userId - User ID for scoping
   * @param {string} params.query - Search query (keyword or /command)
   * @param {number} params.limit - Max results to return
   * @returns {Promise<Object>} Search results with templates array
   */
  searchTemplates = async ({ userId, query, limit }) => {
    this.validateSearchQuery(query);
    const { trimmedQuery, queryLowercase, isCommandQuery } =
      this.normalizeSearchQuery(query);
    const parsedLimit = this.parseSearchLimit(limit);
    const baseFilter = buildFilter({}, userId);

    if (isCommandQuery) {
      return this.searchCommandTemplates(
        baseFilter,
        queryLowercase,
        trimmedQuery,
        parsedLimit,
      );
    }

    return this.searchContentTemplates(
      baseFilter,
      queryLowercase,
      trimmedQuery,
      parsedLimit,
    );
  };

  /**
   * Validate search query meets minimum requirements
   * @throws {BadRequestError} If query is empty or too long
   */
  validateSearchQuery = (query) => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery || trimmedQuery.length === 0) {
      throw new BadRequestError(
        "Query parameter 'q' must be a non-empty string",
      );
    }

    if (trimmedQuery.length > SEARCH_CONFIG.MAX_QUERY_LENGTH) {
      throw new BadRequestError(
        `Query parameter 'q' must not exceed ${SEARCH_CONFIG.MAX_QUERY_LENGTH} characters`,
      );
    }
  };

  /**
   * Normalize search query for processing
   * @returns {Object} Normalized query with metadata
   */
  normalizeSearchQuery = (query) => {
    const trimmedQuery = query.trim();
    const queryLowercase = trimmedQuery.toLowerCase();
    const isCommandQuery = trimmedQuery.startsWith('/');

    return { trimmedQuery, queryLowercase, isCommandQuery };
  };

  /**
   * Parse and validate search limit parameter
   * @returns {number} Validated limit within allowed range
   */
  parseSearchLimit = (limit) => {
    return Math.min(
      Math.max(
        parseInt(limit) || SEARCH_CONFIG.DEFAULT_LIMIT,
        SEARCH_CONFIG.MIN_LIMIT,
      ),
      SEARCH_CONFIG.MAX_LIMIT,
    );
  };

  /**
   * Search for templates by command (slash-prefixed queries)
   * Results prioritize: exact > prefix > contains
   */
  searchCommandTemplates = async (
    baseFilter,
    queryLowercase,
    originalQuery,
    limit,
  ) => {
    const commandPrefix = queryLowercase;

    const exactMatches = await this.findExactCommandMatches(
      baseFilter,
      commandPrefix,
      limit,
    );

    if (exactMatches.length >= limit) {
      return this.formatSearchResponse(
        originalQuery,
        limit,
        exactMatches,
        MATCH_TYPES.COMMAND_EXACT,
      );
    }

    const remainingLimit = limit - exactMatches.length;
    const prefixMatches = await this.findCommandPrefixMatches(
      baseFilter,
      commandPrefix,
      exactMatches,
      remainingLimit,
    );

    if (exactMatches.length + prefixMatches.length >= limit) {
      const allMatches = [...exactMatches, ...prefixMatches].slice(0, limit);
      return this.formatCommandSearchResponse(
        originalQuery,
        limit,
        exactMatches,
        prefixMatches,
        allMatches,
      );
    }

    const containsLimit = limit - exactMatches.length - prefixMatches.length;
    const containsMatches = await this.findCommandContainsMatches(
      baseFilter,
      commandPrefix,
      [...exactMatches, ...prefixMatches],
      containsLimit,
    );

    const allMatches = [...exactMatches, ...prefixMatches, ...containsMatches];
    return this.formatCommandSearchResponse(
      originalQuery,
      limit,
      exactMatches,
      prefixMatches,
      allMatches,
    );
  };

  /**
   * Find templates with exact command match
   */
  findExactCommandMatches = async (baseFilter, commandPrefix, limit) => {
    return commandMongooseModel
      .find({
        ...baseFilter,
        commandLower: commandPrefix,
      })
      .select('_id name text command')
      .limit(limit);
  };

  /**
   * Find templates with command prefix match
   */
  findCommandPrefixMatches = async (
    baseFilter,
    commandPrefix,
    excludedDocuments,
    limit,
  ) => {
    const excludedIds = excludedDocuments.map((doc) => doc._id);
    return commandMongooseModel
      .find({
        ...baseFilter,
        commandLower: { $regex: `^${commandPrefix}` },
        _id: { $nin: excludedIds },
      })
      .select('_id name text command')
      .limit(limit);
  };

  /**
   * Find templates with command contains match
   */
  findCommandContainsMatches = async (
    baseFilter,
    commandPrefix,
    excludedDocuments,
    limit,
  ) => {
    const excludedIds = excludedDocuments.map((doc) => doc._id);
    return commandMongooseModel
      .find({
        ...baseFilter,
        commandLower: { $regex: commandPrefix },
        _id: { $nin: excludedIds },
      })
      .select('_id name text command')
      .limit(limit);
  };

  /**
   * Search for templates by content (keyword search)
   * Results sorted by most recently updated
   */
  searchContentTemplates = async (
    baseFilter,
    queryLowercase,
    originalQuery,
    limit,
  ) => {
    const contentMatches = await commandMongooseModel
      .find({
        ...baseFilter,
        textLower: { $regex: queryLowercase, $options: 'i' },
      })
      .select('_id name text command')
      .limit(limit)
      .sort({ updatedAt: -1 });

    return this.formatSearchResponse(
      originalQuery,
      limit,
      contentMatches,
      MATCH_TYPES.CONTENT,
    );
  };

  /**
   * Format search response for keyword/content search
   */
  formatSearchResponse = (query, limit, templates, matchType) => {
    return {
      query,
      limit,
      total: templates.length,
      templates: templates.map((doc) => this.formatTemplate(doc, matchType)),
    };
  };

  /**
   * Format search response for command search with mixed match types
   */
  formatCommandSearchResponse = (
    query,
    limit,
    exactMatches,
    prefixMatches,
    allTemplates,
  ) => {
    const exactCount = exactMatches.length;
    const prefixCount = prefixMatches.length;

    return {
      query,
      limit,
      total: allTemplates.length,
      templates: allTemplates.map((doc, index) => {
        let matchType = MATCH_TYPES.COMMAND_CONTAINS;
        if (index < exactCount) matchType = MATCH_TYPES.COMMAND_EXACT;
        else if (index < exactCount + prefixCount)
          matchType = MATCH_TYPES.COMMAND_PREFIX;

        return this.formatTemplate(doc, matchType);
      }),
    };
  };

  /**
   * Convert document to API response template format
   */
  formatTemplate = (document, matchType) => ({
    id: document._id,
    name: document.name,
    content: document.text,
    command: document.command,
    match: matchType,
  });
}
