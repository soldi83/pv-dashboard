export async function loadMonthlyData() {
  // Netlify branch deployments use the corresponding data branch.
  // Production and local builds continue to use main.
  const branch = __DEPLOY_BRANCH__ === 'feature/e-auto' ? 'feature/e-auto' : 'main';
  const url = `https://api.github.com/repos/soldi83/pv-dashboard-data/contents/monthlyData.json?ref=${encodeURIComponent(branch)}`;

  const res = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github.object+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Fehler beim Laden der Monatsdaten: ${res.status}`);
  }

  const file = await res.json();
  const text = atob(file.content.replace(/\n/g, ''));
  return JSON.parse(text);
}