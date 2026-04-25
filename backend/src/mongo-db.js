import { setDefaultResultOrder } from 'dns';
setDefaultResultOrder('ipv4first');

import { createApp } from './app.js';
import { CommandModel } from './models/mongo/commandModel.js';
import { UserModel } from './models/mongo/userModel.js';
import { RefreshTokenModel } from './models/mongo/refreshTokenModel.js';
import { PORT } from './config/config.js';

const app = createApp({
  commandModel: new CommandModel(),
  userModel: new UserModel(),
  refreshTokenModel: new RefreshTokenModel(),
});
app.listen(PORT);
