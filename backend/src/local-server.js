import { createApp } from './app.js';
import { CommandModel } from './models/local-system/commandModel.js';
import { PORT } from './config/config.js';

const app = createApp({ commandModel: new CommandModel() });
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
