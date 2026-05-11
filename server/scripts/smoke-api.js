const baseUrl = process.env.API_BASE_URL ?? 'http://127.0.0.1:4000';

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-user-role': 'cio',
      'x-user-id': 'smoke-cio',
      ...(options.headers ?? {})
    }
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(`${options.method ?? 'GET'} ${path} failed: ${response.status} ${JSON.stringify(json)}`);
  }
  return json;
}

const health = await request('/api/health');
console.log('health:', health.data.services.map((service) => `${service.service}:${service.status}`).join(', '));

const risk = await request('/api/risk/GLOBAL-MACRO-01');
console.log('risk:', risk.data.severity, risk.data.pressureScore);

const workflow = await request('/api/workflows/run', {
  method: 'POST',
  body: JSON.stringify({ workflow: 'morning_macro_brief', portfolioId: 'GLOBAL-MACRO-01' })
});
console.log('workflow:', workflow.data.workflow.status, workflow.data.approval.id);

const approvals = await request('/api/approvals');
console.log('approvals:', approvals.data.length);

const audit = await request('/api/audit?limit=5');
console.log('audit events:', audit.data.length);

