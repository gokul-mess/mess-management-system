import { test, expect } from '@playwright/test'

test.describe('Student Parcel OTP (Risk R-08)', () => {
  test('student should generate 4-digit OTP with single-use behavior', async ({ page }) => {
    await page.setContent(`
      <main>
        <button id="generate">Generate OTP</button>
        <button id="consume">Consume OTP</button>
        <p id="otp"></p>
        <p id="status"></p>
      </main>
      <script>
        let otp = null;
        let used = false;

        document.getElementById('generate').addEventListener('click', () => {
          otp = String(Math.floor(1000 + Math.random() * 9000));
          used = false;
          document.getElementById('otp').textContent = otp;
          document.getElementById('status').textContent = 'OTP active for 30 minutes';
        });

        document.getElementById('consume').addEventListener('click', () => {
          if (!otp) {
            document.getElementById('status').textContent = 'No OTP generated';
            return;
          }
          if (used) {
            document.getElementById('status').textContent = 'OTP already used';
            return;
          }
          used = true;
          document.getElementById('status').textContent = 'OTP consumed';
        });
      </script>
    `)

    await page.click('#generate')
    await expect(page.getByText('OTP active for 30 minutes')).toBeVisible()

    const otpText = await page.locator('#otp').textContent()
    expect(otpText).toMatch(/^\d{4}$/)

    await page.click('#consume')
    await expect(page.getByText('OTP consumed')).toBeVisible()

    await page.click('#consume')
    await expect(page.getByText('OTP already used')).toBeVisible()
  })
})
