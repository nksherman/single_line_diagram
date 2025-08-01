import { test, expect } from '@playwright/test';
import { MUITestHelpers } from './mui-test-helpers';

/**
 * Tests for the react flow fields
 * 
 */
test.describe('Editing Equipment', () => {
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

  test('should delete equipment from context menu', async ({ page }) => {
    // Right-click on an existing equipment item
    const element = page.getByTestId('rf__node-1');
    await element.click({ button: 'right' });
  
    // Verify the context menu appears
    await expect(page.getByRole('menuitem', { name: 'Delete' })).toBeVisible();
  
    // Click the Delete option
    await page.getByRole('menuitem', { name: 'Delete' }).click();
  
    // Verify the equipment is removed (the node should no longer exist)
    await expect(page.getByTestId('rf__node-1')).not.toBeVisible();
  });

});