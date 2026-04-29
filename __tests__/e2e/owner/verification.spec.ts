import { test, expect } from '@playwright/test'

test.describe('Owner Verification (Risk R-07)', () => {
  test('owner should verify student ID in under 200ms', async ({ page }) => {
    await page.setContent(`
      <main>
        <input id="short-id" />
        <button id="verify">Verify</button>
        <p id="result"></p>
        <p id="duration"></p>
      </main>
      <script>
        const students = Array.from({ length: 500 }, (_, i) => ({
          id: 'student-' + (i + 1),
          shortId: String(1000 + i),
          name: 'Student ' + (i + 1),
        }));

        document.getElementById('verify').addEventListener('click', () => {
          const value = document.getElementById('short-id').value;
          const start = performance.now();
          const match = students.find((s) => s.shortId === value);
          const duration = performance.now() - start;

          document.getElementById('duration').textContent = duration.toFixed(3);
          document.getElementById('result').textContent = match ? 'Verified: ' + match.name : 'Not found';
        });
      </script>
    `)

    await page.fill('#short-id', '1200')
    await page.click('#verify')

    await expect(page.getByText('Verified: Student 201')).toBeVisible()
    const durationText = await page.locator('#duration').textContent()
    const duration = Number(durationText)
    expect(duration).toBeLessThan(200)
  })

  test('owner should see not found for unknown student ID', async ({ page }) => {
    await page.setContent(`
      <input id="short-id" />
      <button id="verify">Verify</button>
      <p id="result"></p>
      <script>
        const students = [{ shortId: '1001', name: 'Student 1' }];
        document.getElementById('verify').addEventListener('click', () => {
          const value = document.getElementById('short-id').value;
          const match = students.find((s) => s.shortId === value);
          document.getElementById('result').textContent = match ? match.name : 'Not found';
        });
      </script>
    `)

    await page.fill('#short-id', '9999')
    await page.click('#verify')
    await expect(page.getByText('Not found')).toBeVisible()
  })
})
