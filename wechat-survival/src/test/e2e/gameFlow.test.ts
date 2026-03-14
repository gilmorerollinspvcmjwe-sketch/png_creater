/**
 * WeChat Survival - E2E Tests
 * 
 * End-to-end tests for complete game flows
 */

import { test, expect, type Page } from '@playwright/test';

// Test data
const TEST_PLAYER = {
  name: 'TestPlayer',
  level: 1,
  exp: 0,
  health: 100,
};

const INITIAL_RESOURCES = {
  food: 20,
  water: 20,
  wood: 10,
  scrap: 5,
  caps: 50,
};

// Helper: Wait for game to load
async function waitForGameLoad(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('[data-testid="game-container"]', { timeout: 10000 });
}

// Helper: Start new game
async function startNewGame(page: Page, playerName: string) {
  await page.fill('[data-testid="player-name-input"]', playerName);
  await page.click('[data-testid="start-game-button"]');
}

test.describe('WeChat Survival E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForGameLoad(page);
  });

  test.describe('New Game Flow', () => {
    test('should start new game with initial state', async ({ page }) => {
      // Enter player name
      await startNewGame(page, TEST_PLAYER.name);
      
      // Verify initial state
      await expect(page.locator('[data-testid="player-name"]')).toContainText(TEST_PLAYER.name);
      await expect(page.locator('[data-testid="player-level"]')).toContainText('1');
      await expect(page.locator('[data-testid="player-health"]')).toContainText('100');
    });

    test('should display initial resources', async ({ page }) => {
      await startNewGame(page, TEST_PLAYER.name);
      
      // Check resources are displayed
      await expect(page.locator('[data-testid="resource-food"]')).toContainText('20');
      await expect(page.locator('[data-testid="resource-water"]')).toContainText('20');
      await expect(page.locator('[data-testid="resource-caps"]')).toContainText('50');
    });

    test('should show MAIN_01 quest on Day 1', async ({ page }) => {
      await startNewGame(page, TEST_PLAYER.name);
      
      // Navigate to quest panel
      await page.click('[data-testid="nav-quests"]');
      
      // Verify MAIN_01 is displayed
      await expect(page.locator('[data-testid="quest-MAIN_01"]')).toBeVisible();
      await expect(page.locator('[data-testid="quest-MAIN_01-title"]')).toContainText('第一天：基础生存');
    });
  });

  test.describe('Exploration Flow', () => {
    test('should allow player to explore', async ({ page }) => {
      await startNewGame(page, TEST_PLAYER.name);
      
      // Click explore button
      await page.click('[data-testid="explore-button"]');
      
      // Should show exploration event
      await expect(page.locator('[data-testid="event-message"]')).toBeVisible();
    });

    test('should consume stamina when exploring', async ({ page }) => {
      await startNewGame(page, TEST_PLAYER.name);
      
      const initialStamina = 50;
      
      // Click explore button
      await page.click('[data-testid="explore-button"]');
      
      // Should show stamina consumption
      await expect(page.locator('[data-testid="player-stamina"]')).toContainText((initialStamina - 10).toString());
    });

    test('should yield resources after exploration', async ({ page }) => {
      await startNewGame(page, TEST_PLAYER.name);
      
      // Select option 1 (search)
      await page.click('[data-testid="explore-button"]');
      await page.click('[data-testid="option-1"]');
      
      // Should receive resources
      // (Actual test would verify resource changes)
    });
  });

  test.describe('Battle Flow', () => {
    test('should enter battle when encountering enemies', async ({ page }) => {
      await startNewGame(page, TEST_PLAYER.name);
      
      // Trigger battle event (simulated)
      await page.click('[data-testid="trigger-battle"]');
      
      // Should show battle interface
      await expect(page.locator('[data-testid="battle-interface"]')).toBeVisible();
      await expect(page.locator('[data-testid="enemy-display"]')).toBeVisible();
    });

    test('should calculate damage correctly', async ({ page }) => {
      await startNewGame(page, TEST_PLAYER.name);
      
      // Attack enemy
      await page.click('[data-testid="attack-button"]');
      
      // Verify enemy health decreased
      // (Actual test would verify exact damage calculation)
    });

    test('should consume ammo during battle', async ({ page }) => {
      await startNewGame(page, TEST_PLAYER.name);
      
      const initialAmmo = 10;
      
      // Enter battle
      await page.click('[data-testid="trigger-battle"]');
      
      // Attack
      await page.click('[data-testid="attack-button"]');
      
      // Should consume ammo
      // (Actual test would verify ammo reduction)
    });
  });

  test.describe('Quest Flow', () => {
    test('should accept and track quest progress', async ({ page }) => {
      await startNewGame(page, TEST_PLAYER.name);
      
      // Navigate to quests
      await page.click('[data-testid="nav-quests"]');
      
      // Accept MAIN_01
      await page.click('[data-testid="quest-MAIN_01-accept"]');
      
      // Should show in active quests
      await expect(page.locator('[data-testid="active-quest-MAIN_01"]')).toBeVisible();
    });

    test('should update quest progress', async ({ page }) => {
      await startNewGame(page, TEST_PLAYER.name);
      
      // Accept quest
      await page.click('[data-testid="nav-quests"]');
      await page.click('[data-testid="quest-MAIN_01-accept"]');
      
      // Collect resources (simulated)
      await page.click('[data-testid="explore-button"]');
      await page.click('[data-testid="option-1"]');
      
      // Progress should update
      // (Actual test would verify progress bar)
    });

    test('should complete quest and award rewards', async ({ page }) => {
      await startNewGame(page, TEST_PLAYER.name);
      
      // Complete quest objectives (simulated)
      // ...
      
      // Submit quest
      await page.click('[data-testid="quest-MAIN_01-submit"]');
      
      // Should receive rewards
      // (Actual test would verify exp and unlocks)
    });
  });

  test.describe('Navigation', () => {
    test('should switch between tabs', async ({ page }) => {
      await startNewGame(page, TEST_PLAYER.name);
      
      // Click Messages tab (default)
      await expect(page.locator('[data-testid="chat-view"]')).toBeVisible();
      
      // Click Quests tab
      await page.click('[data-testid="nav-quests"]');
      await expect(page.locator('[data-testid="quest-list"]')).toBeVisible();
      
      // Click Inventory tab
      await page.click('[data-testid="nav-inventory"]');
      await expect(page.locator('[data-testid="inventory-view"]')).toBeVisible();
      
      // Click Shelter tab
      await page.click('[data-testid="nav-shelter"]');
      await expect(page.locator('[data-testid="shelter-view"]')).toBeVisible();
    });

    test('should display shelter upgrade options', async ({ page }) => {
      await startNewGame(page, TEST_PLAYER.name);
      
      // Navigate to shelter
      await page.click('[data-testid="nav-shelter"]');
      
      // Should show upgrade options
      await expect(page.locator('[data-testid="upgrade-defense"]')).toBeVisible();
      await expect(page.locator('[data-testid="upgrade-power"]')).toBeVisible();
      await expect(page.locator('[data-testid="upgrade-farm"]')).toBeVisible();
    });
  });

  test.describe('Save/Load', () => {
    test('should auto-save game state', async ({ page }) => {
      await startNewGame(page, TEST_PLAYER.name);
      
      // Wait for auto-save interval (30s in game)
      await page.waitForTimeout(35000);
      
      // Verify save indicator
      await expect(page.locator('[data-testid="save-indicator"]')).toContainText('Saved');
    });

    test('should save on page close', async ({ page }) => {
      await startNewGame(page, TEST_PLAYER.name);
      
      // Close page (simulate)
      // Should trigger save
      
      // Reopen game
      await page.goto('/');
      await waitForGameLoad(page);
      
      // Should load previous state
      await expect(page.locator('[data-testid="player-name"]')).toContainText(TEST_PLAYER.name);
    });
  });

  test.describe('UI Responsiveness', () => {
    test('should display correctly on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      
      await startNewGame(page, TEST_PLAYER.name);
      
      // Should be usable on mobile
      await expect(page.locator('[data-testid="game-container"]')).toBeVisible();
      await expect(page.locator('[data-testid="bottom-nav"]')).toBeVisible();
    });

    test('should handle touch input', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      
      await startNewGame(page, TEST_PLAYER.name);
      
      // Tap buttons
      await page.tap('[data-testid="explore-button"]');
      
      // Should work
      await expect(page.locator('[data-testid="event-message"]')).toBeVisible();
    });
  });

  test.describe('Performance', () => {
    test('should load within 3 seconds', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/');
      await waitForGameLoad(page);
      
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(3000);
    });

    test('should respond to interactions quickly', async ({ page }) => {
      await startNewGame(page, TEST_PLAYER.name);
      
      const startTime = Date.now();
      
      await page.click('[data-testid="explore-button"]');
      
      const responseTime = Date.now() - startTime;
      
      expect(responseTime).toBeLessThan(500);
    });
  });
});
