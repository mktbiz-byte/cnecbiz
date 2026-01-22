/**
 * GitHub 커밋 히스토리를 가져오는 Netlify Function
 * 날짜별/기능별로 업데이트 내역을 조회합니다.
 */

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    const { page = 1, per_page = 50, since, until } = event.queryStringParameters || {}

    // GitHub 레포지토리 정보
    const owner = 'mktbiz-byte'
    const repo = 'cnecbiz'

    // GitHub API URL 구성
    let apiUrl = `https://api.github.com/repos/${owner}/${repo}/commits?page=${page}&per_page=${per_page}`

    if (since) apiUrl += `&since=${since}`
    if (until) apiUrl += `&until=${until}`

    // GitHub API 호출
    const fetchOptions = {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'cnecbiz-admin'
      }
    }

    // GitHub 토큰이 있으면 사용 (rate limit 증가)
    if (process.env.GITHUB_TOKEN) {
      fetchOptions.headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`
    }

    const response = await fetch(apiUrl, fetchOptions)

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
    }

    const commits = await response.json()

    // 커밋 데이터 가공
    const processedCommits = commits.map(commit => {
      const message = commit.commit.message
      const lines = message.split('\n')
      const title = lines[0]
      const description = lines.slice(1).filter(l => l.trim()).join('\n')

      // 커밋 타입 추출 (feat:, fix:, chore:, refactor:, docs:, style:, test:)
      const typeMatch = title.match(/^(feat|fix|chore|refactor|docs|style|test|perf|ci|build)(\(.+?\))?:\s*(.+)$/i)
      let type = 'other'
      let scope = null
      let subject = title

      if (typeMatch) {
        type = typeMatch[1].toLowerCase()
        scope = typeMatch[2] ? typeMatch[2].replace(/[()]/g, '') : null
        subject = typeMatch[3]
      }

      // 타입별 한글 라벨 및 색상
      const typeInfo = {
        feat: { label: '새 기능', color: 'emerald', emoji: '✨' },
        fix: { label: '버그 수정', color: 'red', emoji: '🐛' },
        chore: { label: '기타 작업', color: 'gray', emoji: '🔧' },
        refactor: { label: '리팩토링', color: 'blue', emoji: '♻️' },
        docs: { label: '문서', color: 'purple', emoji: '📚' },
        style: { label: '스타일', color: 'pink', emoji: '💄' },
        test: { label: '테스트', color: 'yellow', emoji: '🧪' },
        perf: { label: '성능 개선', color: 'orange', emoji: '⚡' },
        ci: { label: 'CI/CD', color: 'indigo', emoji: '👷' },
        build: { label: '빌드', color: 'amber', emoji: '📦' },
        other: { label: '기타', color: 'slate', emoji: '📝' }
      }

      return {
        sha: commit.sha,
        shortSha: commit.sha.substring(0, 7),
        author: {
          name: commit.commit.author.name,
          email: commit.commit.author.email,
          avatar: commit.author?.avatar_url || null,
          username: commit.author?.login || null
        },
        date: commit.commit.author.date,
        message: {
          full: message,
          title,
          subject,
          description
        },
        type,
        typeInfo: typeInfo[type] || typeInfo.other,
        scope,
        url: commit.html_url,
        stats: {
          additions: commit.stats?.additions || 0,
          deletions: commit.stats?.deletions || 0,
          total: commit.stats?.total || 0
        }
      }
    })

    // 날짜별 그룹화
    const groupedByDate = {}
    processedCommits.forEach(commit => {
      const date = new Date(commit.date).toISOString().split('T')[0]
      if (!groupedByDate[date]) {
        groupedByDate[date] = []
      }
      groupedByDate[date].push(commit)
    })

    // 타입별 통계
    const typeStats = {}
    processedCommits.forEach(commit => {
      typeStats[commit.type] = (typeStats[commit.type] || 0) + 1
    })

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          commits: processedCommits,
          groupedByDate,
          typeStats,
          pagination: {
            page: parseInt(page),
            per_page: parseInt(per_page),
            hasMore: commits.length === parseInt(per_page)
          }
        }
      })
    }
  } catch (error) {
    console.error('[fetch-github-commits] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    }
  }
}
