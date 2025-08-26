import { Page, Locator } from '@playwright/test';

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

export const calculatePosition = async (
  page: Page,
  config: {
    node?: Locator;
    relativePosition?: { x: number; y: number };
    absolutePosition?: { x: number; y: number };
  }
): Promise<{ x: number; y: number; node?: Locator } | null> => {
  let result: { x: number; y: number; node?: Locator } | null = null;

  // Absolute position takes highest priority
  if (config.absolutePosition) {
    result = {
      x: config.absolutePosition.x,
      y: config.absolutePosition.y
    };
  }
  // Relative position is relative to upper left corner (0, 0) of passed node
  else if (config.relativePosition && config.node) {
    const nodePosition = await config.node.boundingBox();
    if (!nodePosition) {
      return null;
    }
    result = {
      x: nodePosition.x + config.relativePosition.x,
      y: nodePosition.y + config.relativePosition.y
    };
  }
  // Node position - get center of the node
  else if (config.node) {
    const nodePosition = await config.node.boundingBox();
    if (!nodePosition) {
      return null;
    }
    result = {
      x: nodePosition.x + nodePosition.width / 2,
      y: nodePosition.y + nodePosition.height / 2,
      node: config.node
    };
  }

  // Debug: log element under the calculated position
  if (result) {
    const elementInfo = await page.evaluate((pos) => {
      let element = document.elementFromPoint(pos.x, pos.y);
      
      // If the element doesn't have a testid, traverse up the parent elements until we find one with a data-testid
      while (element && !element.hasAttribute('data-testid')) {
        console.log("Traversing up to find data-testid", element);
        element = element.parentElement;
      }

      return element ? {
        tagName: element.tagName,
        className: element.className,
        id: element.id,
        testId: element.getAttribute('data-testid'),
        outerHTML: element.outerHTML.substring(0, 200) // First 200 chars for debugging
      } : null;
    }, { x: result.x, y: result.y });

    // console.log(`Element at calculated position (${result.x}, ${result.y}):`, elementInfo);
  }

  return result;
};

export const dragElementTo = async (
  page: Page, 
  source: {
    node?: Locator;
    relativePosition?: { x: number; y: number };
    absolutePosition?: { x: number; y: number };
  }, 
  target?: { 
    node?: Locator; 
    relativePosition?: { x: number; y: number };
    absolutePosition?: { x: number; y: number };
  }
) => {
  // Calculate source position using the new abstraction
  const sourcePos = await calculatePosition(page, source);
  if (!sourcePos) {
    console.error("Could not determine source position");
    return false;
  }

  // Calculate target position using the same abstraction
  let targetX: number;
  let targetY: number;
  let targetNode: Locator | undefined;

  if (target) {
    const targetPos = await calculatePosition(page, target);
    if (!targetPos) {
      console.error("Could not determine target position");
      return false;
    }
    targetX = targetPos.x;
    targetY = targetPos.y;
    targetNode = targetPos.node;
  } else {
    // Default fallback position
    targetX = sourcePos.x + 150;
    targetY = sourcePos.y + 100;
  }

  // Perform the actual drag operation with element validation
  try {
    // Move to source position first
    await page.mouse.move(sourcePos.x, sourcePos.y);
    await page.waitForTimeout(100); // Small delay to ensure position is reached
    
    // Verify we're at the right position by checking what's under the mouse
    const elementUnderMouse = await page.evaluate((pos) => {
      const element = document.elementFromPoint(pos.x, pos.y);
      return element ? {
        tagName: element.tagName,
        className: element.className,
        id: element.id,
        testId: element.getAttribute('data-testid')
      } : null;
    }, { x: sourcePos.x, y: sourcePos.y });
    
    // console.log("Element under mouse at source:", JSON.stringify(elementUnderMouse));
    
    // Press mouse down
    await page.mouse.down();
    await page.waitForTimeout(50);
    
    // Move to target position with steps for smooth dragging
    await page.mouse.move(targetX, targetY, { steps: 10 });
    await page.waitForTimeout(100);
    
    // Verify target position
    const targetElementUnderMouse = await page.evaluate((pos) => {
      const element = document.elementFromPoint(pos.x, pos.y);
      return element ? {
        tagName: element.tagName,
        className: element.className,
        id: element.id,
        testId: element.getAttribute('data-testid')
      } : null;
    }, { x: targetX, y: targetY });
    
    // console.log("Element under mouse at target:", JSON.stringify(targetElementUnderMouse));
    
    // Release mouse
    await page.mouse.up();
    await page.waitForTimeout(500);
    
    return true;
    
  } catch (error) {
    console.error("Error during drag operation:", error);
    return false;
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
