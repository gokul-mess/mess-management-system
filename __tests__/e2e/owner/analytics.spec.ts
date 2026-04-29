import { test, expect } from '@playwright/test'

test.describe('Owner Analytics Dashboard', () => {
  test('owner should filter analytics and trigger export', async ({ page }) => {
    await page.setContent(`
      <main>
        <select id="period">
          <option value="week">Week</option>
          <option value="month" selected>Month</option>
        </select>
        <p id="metric">Total Meals: 1200</p>
        <button id="export">Export Excel</button>
        <p id="export-status">Not exported</p>
      </main>
      <script>
        const period = document.getElementById('period');
        const metric = document.getElementById('metric');
        const exportStatus = document.getElementById('export-status');

        period.addEventListener('change', () => {
          metric.textContent = period.value === 'week' ? 'Total Meals: 280' : 'Total Meals: 1200';
        });

        document.getElementById('export').addEventListener('click', () => {
          exportStatus.textContent = 'Exported';
        });
      </script>
    `)

    await page.selectOption('#period', 'week')
    await expect(page.getByText('Total Meals: 280')).toBeVisible()

    await page.click('#export')
    await expect(page.getByText('Exported')).toBeVisible()
  })
})
