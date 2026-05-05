export async function loadMonthlyData() {
  const url =
    "https://api.github.com/repos/soldi83/pv-dashboard-data/contents/monthlyData.json?ref=main";

  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github.object+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Fehler beim Laden der Monatsdaten: ${res.status}`);
  }

  const file = await res.json();
  const text = atob(file.content.replace(/\n/g, ""));
  return JSON.parse(text);
}
