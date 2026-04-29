import { test, expect } from '@playwright/test'

test.describe('Student Meal History', () => {
  test('student should filter meal history by type', async ({ page }) => {
    await page.setContent(`
      <main>
        <select id="filter">
          <option value="ALL" selected>All</option>
          <option value="LUNCH">Lunch</option>
          <option value="DINNER">Dinner</option>
        </select>
        <ul id="history"></ul>
      </main>
      <script>
        const logs = [
          { meal_type: 'LUNCH', label: 'Lunch - 10 Apr' },
          { meal_type: 'DINNER', label: 'Dinner - 10 Apr' },
          { meal_type: 'LUNCH', label: 'Lunch - 11 Apr' }
        ];
        const history = document.getElementById('history');
        const filter = document.getElementById('filter');

        function render() {
          const value = filter.value;
          const items = value === 'ALL' ? logs : logs.filter((l) => l.meal_type === value);
          history.innerHTML = items.map((item) => '<li>' + item.label + '</li>').join('');
        }

        filter.addEventListener('change', render);
        render();
      </script>
    `)

    await expect(page.getByText('Dinner - 10 Apr')).toBeVisible()
    await page.selectOption('#filter', 'LUNCH')

    await expect(page.getByText('Lunch - 10 Apr')).toBeVisible()
    await expect(page.getByText('Lunch - 11 Apr')).toBeVisible()
    await expect(page.getByText('Dinner - 10 Apr')).toBeHidden()
  })
})
