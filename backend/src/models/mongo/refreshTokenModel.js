import mongoose from 'mongoose';
import { refreshTokenSchema } from '../../schemas/mongo-schema/refreshTokenSchema.js';

const RefreshToken = mongoose.model('refresh_token', refreshTokenSchema);

export class RefreshTokenModel {
  create({ tokenHash, userId, familyId, expiresAt }) {
    return RefreshToken.create({ tokenHash, userId, familyId, expiresAt });
  }

  findByHash(tokenHash) {
    return RefreshToken.findOne({ tokenHash, expiresAt: { $gt: new Date() } });
  }

  consumeByHash(tokenHash) {
    return RefreshToken.findOneAndUpdate(
      { tokenHash, isConsumed: false, expiresAt: { $gt: new Date() } },
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
