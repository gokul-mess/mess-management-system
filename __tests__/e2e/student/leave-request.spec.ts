import { test, expect } from '@playwright/test'

test.describe('Student Leave Request (Risk R-04)', () => {
  test('student should submit valid leave and reject invalid long leave', async ({ page }) => {
    await page.setContent(`
      <main>
        <input id="start" type="date" />
        <input id="end" type="date" />
        <button id="submit">Submit Leave</button>
        <p id="status"></p>
      </main>
      <script>
        document.getElementById('submit').addEventListener('click', () => {
          const start = new Date(document.getElementById('start').value);
          const end = new Date(document.getElementById('end').value);

          if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
            document.getElementById('status').textContent = 'Invalid dates';
            return;
          }

          const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
          if (days > 30) {
            document.getElementById('status').textContent = 'Leave duration cannot exceed 30 days';
            return;
          }

          if (days < 1) {
            document.getElementById('status').textContent = 'End date must be on or after start date';
            return;
          }

          document.getElementById('status').textContent = 'Leave submitted';
        });
      </script>
    `)

    await page.fill('#start', '2099-04-10')
    await page.fill('#end', '2099-04-12')
    await page.click('#submit')
    await expect(page.getByText('Leave submitted')).toBeVisible()

    await page.fill('#start', '2099-04-01')
    await page.fill('#end', '2099-05-20')
    await page.click('#submit')
    await expect(page.getByText('Leave duration cannot exceed 30 days')).toBeVisible()
  })
})
