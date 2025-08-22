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

  const dragElementTo = async (
    page: Page, 
    source: Locator, 
    target?: { 
      node?: Locator; 
      relativePosition?: { x: number; y: number };
      absolutePosition?: { x: number; y: number };
    }
  ) => {
    const sourcePosition = await source.boundingBox();

    if (!sourcePosition) {
      console.error("Source position not found");
      return false;
    }

    console.log("Source position:", JSON.stringify(sourcePosition));

    // Calculate source center for dragging
    const sourceCenter = {
      x: sourcePosition.x + sourcePosition.width / 2,
      y: sourcePosition.y + sourcePosition.height / 2
    };

    let targetX: number;
    let targetY: number;

    // Determine target position based on provided options
    if (target?.node) {
      // Drag to another node (or handle)

      source.dragTo(target.node, {
        force: true,
        timeout: 5000,
      });
      // const targetNodePosition = await target.node.boundingBox();
      // if (!targetNodePosition) {
      //   console.error("Target node position not found");
      //   return false;
      // }
      // targetX = targetNodePosition.x + targetNodePosition.width / 2;
      // targetY = targetNodePosition.y + targetNodePosition.height / 2;

    } else if (target?.relativePosition) {
      targetX = sourceCenter.x + target.relativePosition.x;
      targetY = sourceCenter.y + target.relativePosition.y;

    } else if (target?.absolutePosition) {
      targetX = target.absolutePosition.x;
      targetY = target.absolutePosition.y;

    } else {
      targetX = sourceCenter.x + 150;
      targetY = sourceCenter.y + 100;

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

    const dragSuccess = await dragElementTo(page, node, {
      relativePosition: { x: 150, y: 100 }
    });
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

    // Use custom drag handler for handle connections
    console.log("Creating edge connection using custom drag handler...");
    const connectionSuccess = await dragElementTo(page, sourceHandle, {
      node: targetHandle
    });

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

    dragElementTo(page, sourceHandle, {
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