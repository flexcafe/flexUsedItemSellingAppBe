import { options as chatOptions, listRoomsScenario, listMessagesScenario, sendMessageScenario, openRoomScenario, transactionalScenario } from './chat-section.js';
import { homeCatalogScenario, options as productOptions, productDetailScenario } from './product-section.js';

export const options = {
  scenarios: {
    ...chatOptions.scenarios,
    ...productOptions.scenarios,
  },
  thresholds: {
    ...chatOptions.thresholds,
    ...productOptions.thresholds,
  },
};

export {
  openRoomScenario,
  listRoomsScenario,
  listMessagesScenario,
  sendMessageScenario,
  transactionalScenario,
  homeCatalogScenario,
  productDetailScenario,
};
