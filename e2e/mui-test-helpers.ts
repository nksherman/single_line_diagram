import { Page } from '@playwright/test';

/**
 * Helper class for interacting with Material-UI components in Playwright tests
 */
export class MUITestHelpers {
  constructor(private page: Page) {}

  /**
   * Fill a MUI TextField by its label
   */
  async fillTextField(label: string, value: string): Promise<void> {
    await this.page.getByLabel(label).fill(value);
  }

  /**
   * Fill a MUI number input field by its label
   */
  async fillNumberField(label: string, value: string): Promise<void> {
    await this.page.getByLabel(label).fill(value);
  }

  /**
   * Select an option from a MUI Select dropdown
   */
  async selectOption(selectLabel: string, optionText: string, container: any = this.page): Promise<void> {
    await container.getByLabel(selectLabel).click();
    await container.getByRole('option', { name: optionText }).click();
  }
  

  /**
   * Select multiple options from a MUI multi-select dropdown
   */
  async selectMultipleOptions(selectLabel: string, optionTexts: string[]): Promise<void> {
    await this.page.getByLabel(selectLabel).click();
    
    for (const optionText of optionTexts) {
      await this.page.getByRole('option', { name: optionText }).click();
    }
    
    await this.page.keyboard.press('Escape');
  }
};

/**
 * Equipment creation test data interfaces
 */
export interface GeneratorTestData {
  name: string;
  capacity?: string;
  voltage?: string;
  fuelType?: string;
  efficiency?: string;
  sources?: string[];
  loads?: string[];
}

export interface TransformerTestData {
  name: string;
  primaryVoltage?: string;
  secondaryVoltage?: string;
  powerRating?: string;
  phaseCount?: string;
  connectionType?: string;
  impedance?: string;
  sources?: string[];
  loads?: string[];
}

export interface BusTestData {
  name: string;
  voltage?: string;
  sources?: string[];
  loads?: string[];
}

export interface MeterTestData {
  name: string;
  accuracy?: string;
  type?: string;
  sources?: string[];
  loads?: string[];
}

/**
 * Common test equipment data
 */
export const TestEquipmentData = {
  validGenerator: {
    name: 'Test Generator',
    capacity: '150',
    voltage: '11',
    fuelType: 'NATURAL_GAS',
    efficiency: '85'
  } as GeneratorTestData,

  invalidTransformer: {
    name: 'Invalid TX',
    primaryVoltage: '5', // Too low - should trigger validation error
    secondaryVoltage: '11',
    powerRating: '10',
    phaseCount: '3',
    connectionType: 'Delta',
    impedance: '5'
  } as TransformerTestData,

  validBus: {
    name: 'Test Bus',
    voltage: '11'
  } as BusTestData,

  validMeter: {
    name: 'Test Meter',
    accuracy: '0.5',
    type: 'ENERGY'
  } as MeterTestData
};
