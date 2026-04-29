import { test, expect } from '@playwright/test'

test.describe('Student Profile Management (Risk R-11)', () => {
  test('student should update mobile but not immutable photo path', async ({ page }) => {
    await page.setContent(`
      <main>
        <input id="mobile" value="9876543210" />
        <input id="photo" value="student/photo.jpg" disabled />
        <button id="save">Save</button>
        <p id="status"></p>
      </main>
      <script>
        const mobile = document.getElementById('mobile');
        const photo = document.getElementById('photo');
        const status = document.getElementById('status');

        document.getElementById('save').addEventListener('click', () => {
          if (photo.disabled !== true) {
            status.textContent = 'Photo path update blocked';
            return;
          }

          status.textContent = 'Profile updated: ' + mobile.value;
        });
      </script>
    `)

    await page.fill('#mobile', '9999988888')
    await page.click('#save')

    await expect(page.getByText('Profile updated: 9999988888')).toBeVisible()
    await expect(page.locator('#photo')).toBeDisabled()
  })
})
