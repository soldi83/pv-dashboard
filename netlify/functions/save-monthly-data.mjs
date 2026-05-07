const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export default async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('', {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }

  try {
    const body = await req.json();
    const { password, data } = body ?? {};

    if (!password || password !== process.env.ADMIN_PASSWORD) {
      return new Response(
        JSON.stringify({ error: 'Ungültiges Admin-Passwort' }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    if (!Array.isArray(data)) {
      return new Response(
        JSON.stringify({ error: 'Ungültige Datenstruktur' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER || 'soldi83';
    const repo = process.env.GITHUB_DATA_REPO || 'pv-dashboard-data';
    const branch = process.env.GITHUB_BRANCH || 'main';
    const path = process.env.GITHUB_DATA_PATH || 'monthlyData.json';

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'GITHUB_TOKEN fehlt' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

    const currentRes = await fetch(`${apiUrl}?ref=${branch}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!currentRes.ok) {
      return new Response(
        JSON.stringify({
          error: `Konnte aktuelle Datei nicht laden (${currentRes.status})`,
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    const currentFile = await currentRes.json();
    const content = Buffer.from(JSON.stringify(data, null, 2) + '\n').toString('base64');

    const updateRes = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Update monthlyData.json via admin panel',
        content,
        sha: currentFile.sha,
        branch,
      }),
    });

    const result = await updateRes.json();

    if (!updateRes.ok) {
      return new Response(
        JSON.stringify({
          error: result.message || 'GitHub-Update fehlgeschlagen',
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        commit: result.commit?.sha || null,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error.message || 'Unbekannter Fehler',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
};