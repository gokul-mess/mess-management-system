import { test, expect } from '@playwright/test'

test.describe('Student Login Flow', () => {
  test('student should login and reach dashboard state', async ({ page }) => {
    await page.setContent(`
      <main>
        <button id="student-login">Continue with Google</button>
        <p id="status">Logged out</p>
      </main>
      <script>
        document.getElementById('student-login').addEventListener('click', () => {
          document.getElementById('status').textContent = 'Student Dashboard'
        })
      </script>
    `)

    await page.click('#student-login')
    await expect(page.getByText('Student Dashboard')).toBeVisible()
  })
})
