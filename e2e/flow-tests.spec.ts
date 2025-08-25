import { test, expect, Page, type Locator } from '@playwright/test';

import { MUITestHelpers } from './mui-test-helpers';

/**
 * Tests for the react flow fields
 * 
 */
test.describe('Editing Equipment Context Menu', () => {
  let muiHelpers: MUITestHelpers;
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    muiHelpers = new MUITestHelpers(page);
  });

  test('should open edit form when double-clicking on equipment', async ({ page }) => {
    // Double-click on an existing equipment item

    const element = page.getByTestId('rf__node-1');
    await element.dblclick();

    // Verify the edit form appears
    const popover = page.locator('.MuiPopover-root');
    await expect(popover.getByText('Edit Generator: Generator 1')).toBeVisible();
  });

  test('should allow editing existing Generator', async ({ page }) => {
    // Click on an existing generator to select it for editing
    
    const element = page.getByTestId('rf__node-1');
    await element.dblclick();

    const popover = page.locator('.MuiPopover-root').first();
    await expect(popover.getByText('Edit Generator: Generator 1')).toBeVisible();
    // Update the generator name
    await popover.getByLabel('Generator Name').fill('Updated Generator 1');

    // Update capacity
    await popover.getByLabel('Capacity (MW)').fill('250');


    // Update efficiency
    const field = popover.getByLabel('Efficiency (%)');
    await expect(field).toBeVisible();
    await field.fill('95');

    // Update fuel type
    await muiHelpers.selectOption('Fuel Type', 'SOLAR');

    // Verify the updated values are displayed
    await expect(popover.getByLabel('Generator Name')).toHaveValue('Updated Generator 1');
    await expect(popover.getByLabel('Capacity (MW)')).toHaveValue('250');
    await expect(popover.getByLabel('Efficiency (%)')).toHaveValue('95');
    await expect(popover.getByText('SOLAR')).toBeVisible();

    // Save changes
    await popover.getByRole('button', { name: 'Save Changes' }).click();
    await page.keyboard.press('Escape');
    
    await expect(page.getByText('Updated Generator 1')).toBeVisible();

    // close the edit form, escape
    await page.keyboard.press('Escape');

    // Verify the changes are reflected
    await expect(page.locator('text=Updated Generator 1')).toBeVisible();
  });

  test('Open context menu on right click', async ({ page }) => {
    // Right-click on an existing equipment item
    const element = page.getByTestId('rf__node-1');
    await element.click({ button: 'right' });
  
    // Verify the context menu appears
    await expect(page.getByRole('menuitem', { name: 'Edit' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Delete' })).toBeVisible();
  });

  test("Open context menu on edge", async ({ page }) => {
    const edge = page.getByTestId('rf__edge-4-6');
    await edge.click({ button: 'right', force: true, timeout: 3000 });

    await expect(page.getByRole('menuitem', { name: 'Delete' })).toBeVisible();

    // Note that  
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    await expect(edge).not.toBeVisible({ timeout: 8000 });
  });

  test('should open edit form from context menu', async ({ page }) => {
    // Right-click on an existing equipment item
    const element = page.getByTestId('rf__node-1');
    await element.click({ button: 'right' });
  
    // Verify the context menu appears
    await expect(page.getByRole('menuitem', { name: 'Edit' })).toBeVisible();
  
    // Click the Edit option
    await page.getByRole('menuitem', { name: 'Edit' }).click();
  
    // Verify the edit form appears
    await expect(page.locator('text=Edit Generator: Generator 1')).toBeVisible();
  });
  
  test('should close context menu when pressing escape', async ({ page }) => {
    // Right-click on an existing equipment item
    const element = page.getByTestId('rf__node-1');
    await element.click({ button: 'right' });

    // Verify the context menu appears
    await expect(page.getByRole('menuitem', { name: 'Edit' })).toBeVisible();

    // Press escape to close the menu
    await page.keyboard.press('Escape');

    // Verify the context menu disappears
    await expect(page.getByRole('menuitem', { name: 'Edit' })).not.toBeVisible();
  });
});

test.describe('Flow Nodes and Edges', () => {
  let muiHelpers: MUITestHelpers;
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    muiHelpers = new MUITestHelpers(page);
    
    // Open the equipment creator drawer for equipment creation tests
    await page.locator('[data-testid="BuildIcon"]').first().click();
    await expect(page.locator('text=Equipment Creator')).toBeVisible();
  });

  const handleCloseDrawer = async (page: Page) => {
    await page.locator('#close-drawer').click();
    await page.getByRole('button', { name: 'Fit View' }).click();
  };

  // Helper function to calculate position from source/target configuration
  const calculatePosition = async (
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

  const dragElementTo = async (
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

  test('should be drag and droppable', async ({ page }) => {
    await page.locator('#close-drawer').click();
    
    await page.waitForSelector('[data-testid="rf__node-3"]', { state: 'visible' });
    await page.waitForTimeout(1000);

    const node = page.getByTestId('rf__node-3');
    const nodePositionOrig = await node.boundingBox();

    if (!nodePositionOrig) {
      throw new Error("Could not get initial node position");
    }

    // Test dragging with relative position
    console.log("Testing drag with relative position...");
    const dragSuccess = await dragElementTo(page, { node }, {
      node,
      relativePosition: { x: 150, y: 100 }
    });

    // Verify the node moved to a new position
    const nodePositionNew = await node.boundingBox();
    expect(nodePositionNew).toBeTruthy();
    expect(nodePositionNew!.x).not.toBe(nodePositionOrig.x);
    expect(nodePositionNew!.y).not.toBe(nodePositionOrig.y);

    // Test dragging with absolute position
    console.log("Testing drag with absolute position...");
    const viewport = page.viewportSize() || { width: 1280, height: 720 };
    await dragElementTo(page, { node }, {
      absolutePosition: { x: viewport.width - 200, y: 100 } // Top-right corner
    });

    // Verify the node moved to the absolute position
    const nodePositionFinal = await node.boundingBox();
    expect(nodePositionFinal).toBeTruthy();
    expect(nodePositionFinal!.x).not.toBe(nodePositionNew!.x);
    expect(nodePositionFinal!.y).not.toBe(nodePositionNew!.y);

  });

  test('should create a new Bus node', async ({ page }) => {
    // Create new Bus equipment using the equipment creator
    await page.getByLabel('Equipment Name').fill('Test Bus 1');
    await muiHelpers.selectOption('Equipment Type', 'Bus');

    await page.getByRole('button', { name: 'Create Equipment' }).click();

    await handleCloseDrawer(page);

    await expect(page.locator('text=Test Bus 1')).toBeVisible();
    await expect(page.getByTestId('rf__node-bus_2')).toBeVisible();
  });

  test('should create a new Generator node', async ({ page }) => {
    await page.getByLabel('Equipment Name').fill('Test Generator 1');
    await muiHelpers.selectOption('Equipment Type', 'Generator');
    
    await page.getByLabel('Capacity (MW)').fill('100');
    await page.getByLabel('Voltage (kV)').fill('11');
    await page.getByLabel('Efficiency (%)').fill('85');

    await page.getByRole('button', { name: 'Create Equipment' }).click();

    await handleCloseDrawer(page);

    await expect(page.locator('text=Test Generator 1')).toBeVisible();
    await expect(page.getByTestId('rf__node-generator_3')).toBeVisible();
  });

  test('should create connection by dragging from source handle to target handle', async ({ page }) => {
    // Create a second node using the equipment creator
    await page.getByLabel('Equipment Name').fill('Test Bus 2');
    await muiHelpers.selectOption('Equipment Type', 'Bus');
    await page.getByLabel('Voltage (kV)').fill('11');

    await page.getByRole('button', { name: 'Create Equipment' }).click();
    await handleCloseDrawer(page);

    // Wait for nodes to be visible
    await expect(page.getByTestId('rf__node-4')).toBeVisible();
    await expect(page.getByTestId('rf__node-bus_2')).toBeVisible();

    const sourceNode = page.locator('[data-testid="rf__node-4"]');
    const targetNode = page.locator('[data-testid="rf__node-bus_2"]');

    const nodePositionOrig = await targetNode.boundingBox() || { x: 0, y: 0, width: 0, height: 0 };

    // First, explicitly position the target node to ensure proper spacing
    // This ensures they don't overlap and makes the connection more reliable in Firefox
    console.log("Positioning target node to ensure proper spacing...");
    
    // Use absolute positioning to place target node in a clear area
    const viewport = page.viewportSize() || { width: 1280, height: 720 };
    await dragElementTo(page, { 
      node: targetNode, 
      relativePosition: { 
        x: nodePositionOrig?.width / 3, 
        y: nodePositionOrig?.height / 3
      } }, {
      absolutePosition: { x: viewport.width - 300, y: viewport.height / 2 } // Right side of viewport
    });

    // Wait a moment for the position to settle
    await page.waitForTimeout(500);

    // Verify the node moved to a new position
    const nodePositionNew = await targetNode.boundingBox();
    if (!nodePositionOrig) {
      throw new Error("Could not get initial node position");
    }

    expect(nodePositionNew).toBeTruthy();
    expect(nodePositionNew!.x).not.toBe(nodePositionOrig.x);
    expect(nodePositionNew!.y).not.toBe(nodePositionOrig.y);

    // Find handles - try different strategies
    let sourceHandle = sourceNode.locator('.react-flow__handle-source').first();
    let targetHandle = targetNode.locator('.react-flow__handle-target').first();

    // Fallback to any available handles if specific types not found
    if ((await sourceHandle.count()) === 0) {
      sourceHandle = sourceNode.locator('.react-flow__handle').first();
    }
    if ((await targetHandle.count()) === 0) {
      targetHandle = targetNode.locator('.react-flow__handle').first();
    }

    // Validate handles exist
    await expect(sourceHandle).toBeVisible();
    await expect(targetHandle).toBeVisible();

    const sourceBBox = await sourceHandle.boundingBox() || { x: 0, y: 0, width: 0, height: 0 };
    const targetBBox = await targetHandle.boundingBox() || { x: 0, y: 0, width: 0, height: 0 };

    // Use custom drag handler for handle connections
    console.log("Creating edge connection using custom drag handler...");
    await dragElementTo(page, { 
      node: sourceHandle,
      relativePosition: { x: sourceBBox.width/3, y: sourceBBox.height *4 / 5 }
     }, {
      node: targetHandle,
      relativePosition: { x: targetBBox.width/3, y: targetBBox.height *4 / 5 }
    });

    // wait
    await page.waitForTimeout(500);

    // Verify edge is created
    await expect(page.getByTestId('rf__edge-4-bus_2')).toBeVisible({ timeout: 8000 });
  });

  test('should delete specific edge while retaining other edges', async ({ page }) => {
    // Create node using the equipment creator
    await page.getByLabel('Equipment Name').fill('Test Bus 2');
    await muiHelpers.selectOption('Equipment Type', 'Bus');
    await page.getByLabel('Voltage (kV)').fill('11');
    await page.getByRole('button', { name: 'Create Equipment' }).click();

    await handleCloseDrawer(page);

    // Verify nodes are created
    await expect(page.getByTestId('rf__node-bus_2')).toBeVisible();

    const sourceNode = page.locator('[data-testid="rf__node-4"]');
    const targetNode1 = page.locator('[data-testid="rf__node-bus_2"]');

    // Find handles using the same strategy as the working test
    let targetHandle1 = targetNode1.locator('.react-flow__handle-top').first();

    if ((await targetHandle1.count()) === 0) {
      targetHandle1 = targetNode1.locator('.react-flow__handle').first();
    }

    let sourceHandle = sourceNode.locator('.react-flow__handle-bottom').first();
    // Fallback to any available handles if specific types not found
    if ((await sourceHandle.count()) === 0) {
      sourceHandle = sourceNode.locator('.react-flow__handle').first();
    }

    await dragElementTo(page, { node: sourceHandle }, {
      node: targetHandle1
    });

    const edge1 = page.getByTestId('rf__edge-4-bus_2');
    await expect(edge1).toBeVisible({ timeout: 8000 });

    // delete an existing edge
    const edgeEx = page.getByTestId('rf__edge-4-6');
    await expect(edgeEx).toBeVisible({ timeout: 8000 });
    await edgeEx.click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    
    await expect(edgeEx).not.toBeVisible({ timeout: 8000 });
    await expect(edge1).toBeVisible({ timeout: 8000 });
  });

});