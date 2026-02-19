import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export default async (request, context) => {
  const url = new URL(request.url)

  // /admin/openclo/* 경로만 제한
  if (!url.pathname.startsWith('/admin/openclo')) {
    return context.next()
  }

  // 정적 파일은 통과
  if (url.pathname.match(/\.(js|css|png|jpg|svg|ico|woff|woff2)$/)) {
    return context.next()
  }

  const clientIP =
    context.ip ||
    request.headers.get('x-nf-client-connection-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'

  try {
    const supabaseUrl = Deno.env.get('VITE_SUPABASE_BIZ_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseKey) {
      // 환경변수 미설정 시 통과 (초기 설정 전)
      return context.next()
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const { data: allowedIPs, error } = await supabase
      .from('oc_allowed_ips')
      .select('ip_address')
      .eq('is_active', true)

    if (error) {
      console.error('[ip-restrict-openclo] DB error:', error)
      return context.next()
    }

    // IP가 하나도 없으면 모든 접근 허용 (초기 설정 전)
    if (!allowedIPs || allowedIPs.length === 0) {
      return context.next()
    }

    const isAllowed = allowedIPs.some(row => {
      const allowed = row.ip_address
      if (allowed.includes('/')) {
        return ipInCIDR(clientIP, allowed)
      }
      return allowed === clientIP
    })

    if (isAllowed) {
      return context.next()
    }

    return new Response(
      `<!DOCTYPE html>
      <html><head><meta charset="utf-8"><title>403 Forbidden</title>
      <style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#f9fafb;}
      .c{text-align:center;padding:2rem;}.c h1{color:#ef4444;font-size:3rem;}.c p{color:#6b7280;margin-top:1rem;}</style></head>
      <body><div class="c"><h1>403</h1><p>접근이 차단되었습니다.</p><p style="font-size:0.875rem;">IP: ${clientIP}</p>
      <p style="font-size:0.75rem;color:#9ca3af;">관리자에게 IP 등록을 요청하세요.</p></div></body></html>`,
      { status: 403, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    )
  } catch (err) {
    console.error('[ip-restrict-openclo] Error:', err)
    return context.next()
  }
}

function ipInCIDR(ip, cidr) {
  try {
    const [range, bits] = cidr.split('/')
    const mask = ~(2 ** (32 - parseInt(bits)) - 1)
    const ipNum = ipToNum(ip)
    const rangeNum = ipToNum(range)
    return (ipNum & mask) === (rangeNum & mask)
  } catch {
    return false
  }
}

function ipToNum(ip) {
  return ip.split('.').reduce((sum, octet) => (sum << 8) + parseInt(octet), 0) >>> 0
}

export const config = { path: '/admin/openclo/*' }
