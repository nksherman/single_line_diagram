// Development helper to expose models for Playwright testing
// This file can be imported in your main app during development to make models available for testing

import Generator from '../src/models/generatorEquipment';
import Bus from '../src/models/busEquipment';
import Transformer from '../src/models/transformerEquipment';
import Meter from '../src/models/meterEquipment';
import { EquipmentBase } from '../src/models/equipmentBase';

// Only expose in development mode
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Make models available on window object for Playwright tests
  (window as any).EquipmentModels = {
    Generator,
    Bus,
    Transformer,
    Meter,
    EquipmentBase
  };
}

export { Generator, Bus, Transformer, Meter, EquipmentBase };
