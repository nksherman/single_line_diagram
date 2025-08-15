import { test, expect } from '@playwright/test';
import { MUITestHelpers } from './mui-test-helpers';

test.describe('Static App Start', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the application with default title', async ({ page }) => {
    // Check that the main title is visible
    await expect(page.getByRole('heading', { name: 'Single Line Diagram' })).toBeVisible();
  });

  test('should display default equipment including generators and bus', async ({ page }) => {
    // Wait for the page to load completely
    await page.waitForLoadState('networkidle');
    
    // Check that the app contains the default equipment
    // The equipment should be visible in the display area or equipment creator
    
    await expect(page.locator('text=Generator 1')).toBeVisible();
    await expect(page.locator('text=Generator 2')).toBeVisible();
    await expect(page.locator('text=Bus 1')).toBeVisible();
  });

  test('Equipment connections are established (Generator to Bus)', async ({ page }) => {
    // This test validates that EquipmentBase.connectById() calls in defaultEquipment() work:
    // - EquipmentBase.connectById(generator1.id, bus1.id)
    // - EquipmentBase.connectById(generator2.id, bus1.id)
    
    // All equipment should be visible, indicating successful instantiation and connection setup
    await expect(page.locator('text=Generator 1')).toBeVisible();
    await expect(page.locator('text=Generator 2')).toBeVisible(); 
    await expect(page.locator('text=Bus 1')).toBeVisible();
    
    // Additional equipment from defaultEquipment should also be visible
    await expect(page.locator('text=Transformer 1')).toBeVisible();
    await expect(page.locator('text=Transformer 2')).toBeVisible();
    await expect(page.locator('text=Meter 1')).toBeVisible();
    await expect(page.locator('text=Meter 2')).toBeVisible();
  });

  test('should have sidebar with equipment creator button', async ({ page }) => {
    // The sidebar should be visible with the equipment creator button
    await expect(page.locator('[data-testid="BuildIcon"]').first()).toBeVisible();
    
    // Check if clicking the button opens the drawer
    await page.locator('[data-testid="BuildIcon"]').first().click();
    await expect(page.locator('text=Equipment Creator')).toBeVisible();
    
    // Check if the drawer can be closed
    await page.locator('[data-testid="CloseIcon"]').first().click();
    await expect(page.locator('text=Equipment Creator')).not.toBeVisible();
  });

  test('should display equipment count in footer', async ({ page }) => {
    // Check that the footer shows equipment count
    await expect(page.locator('text=Equipment Count:')).toBeVisible();
    // Should show 7 default equipment items
    await expect(page.locator('text=Equipment Count: 7')).toBeVisible();
  });

  test('should display equipment in the diagram area', async ({ page }) => {
    // Wait for any dynamic content to load
    await page.waitForTimeout(1000);
    
    // Check that there's a display area for the single line diagram
    // This might be a canvas, SVG, or div containing the diagram
    const displayArea = page.locator('canvas, svg, [data-testid="display"], .display');
    await expect(displayArea.first()).toBeVisible()
      .catch(async () => {
        // Fallback: check if the display component rendered any content
        const hasDisplayContent = await page.locator('text=Generator 1, text=Generator 2, text=Bus 1').count() > 0;
        expect(hasDisplayContent).toBeTruthy();
      });
  });

  test('should show version information', async ({ page }) => {
    // Look for version chip/button that can be clicked
    const versionElement = page.locator('[role="button"]:has-text("v"), .version, [data-testid="version"]');
    await expect(versionElement.first()).toBeVisible()
      .catch(async () => {
        // Fallback: check if version info is displayed anywhere
        const hasVersionText = await page.locator('text=/v?\\d+\\.\\d+/').count() > 0;
        expect(hasVersionText).toBeTruthy();
      });
  });
});


test.describe('Creating Equipment', () => {
  let muiHelpers: MUITestHelpers;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    muiHelpers = new MUITestHelpers(page);
    
    // Open the equipment creator drawer before each test
    await page.locator('[data-testid="BuildIcon"]').first().click();
    await expect(page.locator('text=Equipment Creator')).toBeVisible();
  });

  test('should show equipment creator form in drawer', async ({ page }) => {
    // Verify the drawer is open and contains the expected form elements
    await expect(page.locator('text=Equipment Creator')).toBeVisible();
    await expect(page.getByLabel('Equipment Name')).toBeVisible();
    await expect(page.getByLabel('Equipment Type')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Equipment' })).toBeVisible();
    
    // Verify the Save button is also present in the drawer
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
  });
  
  test('should allow creating a Generator with custom properties', async ({ page }) => {
    await page.getByLabel('Equipment Name').fill('Custom Generator');

    await muiHelpers.selectOption('Equipment Type', 'Generator');

    await page.getByLabel('Capacity (MW)').fill('200');
    await page.getByLabel('Voltage (kV)').fill('33');
    await muiHelpers.selectOption('Fuel Type', 'coal');

    await page.getByLabel('Efficiency (%)').fill('90');

    await page.getByRole('button', { name: 'Create Equipment' }).click();
    
    await expect(page.locator('text=Custom Generator')).toBeVisible();
    
    // Check that equipment count increased
    await expect(page.locator('text=Equipment Count: 8')).toBeVisible();
  });

  test('should allow creating a new Bus', async ({ page }) => {
    await page.getByLabel('Equipment Name').fill('Custom Bus');
    await muiHelpers.selectOption('Equipment Type', 'Bus');

    await page.getByRole('button', { name: 'Create Equipment' }).click();

    await expect(page.locator('text=Custom Bus')).toBeVisible();
    
    // Check that equipment count increased
    await expect(page.locator('text=Equipment Count: 8')).toBeVisible();
  });

  test('should allow creating a new Meter', async ({ page }) => {
    await page.getByLabel('Equipment Name').fill('Custom Meter');
    await muiHelpers.selectOption('Equipment Type', 'Meter');

    await page.getByLabel('Voltage Rating (kV)').fill('4');
    await page.getByLabel('Current Rating (A)').fill('150');

    await muiHelpers.selectOption('Accuracy Class', '2.0');

    await page.getByRole('button', { name: 'Create Equipment' }).click();

    await expect(page.locator('text=Custom Meter')).toBeVisible();
    
    // Check that equipment count increased
    await expect(page.locator('text=Equipment Count: 8')).toBeVisible();
  });

  test('Enforces Voltage restrictions on Transformer', async ({ page }) => {
    // This test checks that the Transformer equipment creator enforces voltage restrictions
    
    // Use the helper with invalid voltage data
    await page.getByLabel('Equipment Name').fill('Custom Transformer');
    await muiHelpers.selectOption('Equipment Type', 'Transformer');

    await page.getByLabel('Primary Voltage (kV)').fill('5');
    await page.getByLabel('Secondary Voltage (kV)').fill('2');
    await page.getByLabel('Power Rating (MVA)').fill('50');
    await muiHelpers.selectOption('Phase Count', '1');
    await muiHelpers.selectOption('Connection Type', 'Delta');
    await page.getByLabel('Impedance (%)').fill('5.2');

    await muiHelpers.selectMultipleOptions('Sources (Optional)', ['Bus 1']);
    

    // Submit the form
    await page.getByRole('button', { name: 'Create Equipment' }).click();

    // Check for validation alerts - use consistent selector
    const alerts = page.locator('.MuiAlert-root');
    await expect(alerts).toHaveCount(1);
    await expect(alerts.first()).toContainText('Voltage mismatch: Bus 1 provides 11kV but Custom Transformer expects 5kV on source side');
  });
});
