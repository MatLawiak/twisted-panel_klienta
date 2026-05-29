const N8N_BASE = process.env.NEXT_PUBLIC_N8N_WEBHOOK_BASE!
const N8N_SECRET = process.env.NEXT_PUBLIC_N8N_SECRET!

export async function triggerN8N(
  workflow: string,
  payload: Record<string, unknown>
): Promise<boolean> {
  try {
    const res = await fetch(`${N8N_BASE}/${workflow}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': N8N_SECRET,
      },
      body: JSON.stringify(payload),
    })
    return res.ok
  } catch {
    return false
  }
}
