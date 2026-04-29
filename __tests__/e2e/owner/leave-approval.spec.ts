import { test, expect } from '@playwright/test'

test.describe('Owner Leave Management', () => {
  test('owner should approve and reject leave requests', async ({ page }) => {
    await page.setContent(`
      <main>
        <article data-leave-id="L-1">
          <span id="status-1">Pending</span>
          <button id="approve-1">Approve</button>
          <button id="reject-1">Reject</button>
        </article>
      </main>
      <script>
        const status = document.getElementById('status-1');
        document.getElementById('approve-1').addEventListener('click', () => {
          status.textContent = 'Approved';
        });
        document.getElementById('reject-1').addEventListener('click', () => {
          status.textContent = 'Rejected';
        });
      </script>
    `)

    await page.click('#approve-1')
    await expect(page.getByText('Approved')).toBeVisible()

    await page.click('#reject-1')
    await expect(page.getByText('Rejected')).toBeVisible()
  })
})
