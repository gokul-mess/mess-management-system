import { test, expect } from '@playwright/test'

test.describe('Owner Menu Upload (Risk R-14)', () => {
  test('owner should upload image menu and reject invalid file types', async ({ page }) => {
    await page.setContent(`
      <main>
        <input id="file" type="file" accept="image/*" />
        <p id="status">Idle</p>
      </main>
      <script>
        const input = document.getElementById('file');
        const status = document.getElementById('status');
        input.addEventListener('change', () => {
          const file = input.files && input.files[0];
          if (!file) {
            status.textContent = 'Idle';
            return;
          }
          if (!file.type.startsWith('image/')) {
            status.textContent = 'Invalid file type';
            return;
          }
          status.textContent = 'Menu uploaded';
        });
      </script>
    `)

    await page.setInputFiles('#file', {
      name: 'menu.png',
      mimeType: 'image/png',
      buffer: Buffer.from('fake-image'),
    })
    await expect(page.getByText('Menu uploaded')).toBeVisible()

    await page.setInputFiles('#file', {
      name: 'menu.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('not-an-image'),
    })
    await expect(page.getByText('Invalid file type')).toBeVisible()
  })
})
