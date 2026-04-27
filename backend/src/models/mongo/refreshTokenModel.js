import mongoose from 'mongoose';
import { refreshTokenSchema } from '../../schemas/mongo-schema/refreshTokenSchema.js';

const RefreshToken = mongoose.model('refresh_token', refreshTokenSchema);

export class RefreshTokenModel {
  create({ tokenHash, userId, familyId, expiresAt }) {
    return RefreshToken.create({ tokenHash, userId, familyId, expiresAt });
  }

  findByHash(tokenHash) {
    return RefreshToken.findOne({ tokenHash });
  }

  consumeByHash(tokenHash) {
    return RefreshToken.findOneAndUpdate(
      { tokenHash },
      { isConsumed: true },
      { new: true },
    );
  }

  revokeFamily(familyId) {
    return RefreshToken.deleteMany({ familyId });
  }

  revokeAllForUser(userId) {
    return RefreshToken.deleteMany({ userId });
  }

  deleteByHash(tokenHash) {
    return RefreshToken.deleteOne({ tokenHash });
  }
}
