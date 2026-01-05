// Cloudflare Worker для SiteCore Database
addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
    const url = new URL(request.url)
    const path = url.pathname
    
    // CORS заголовки
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    }
    
    // Обработка preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers })
    }
    
    // Маршруты
    switch(path) {
        case '/ping':
            return new Response(JSON.stringify({ status: 'ok', timestamp: Date.now() }), { headers })
        
        case '/db':
            if (request.method === 'GET') {
                const data = await SITECORE_DB.get('data', 'json')
                return new Response(JSON.stringify(data || { 
                    users: { clients: [], developers: [] },
                    orders: [],
                    messages: [],
                    settings: {},
                    stats: {}
                }), { headers })
            } else if (request.method === 'POST') {
                const data = await request.json()
                await SITECORE_DB.put('data', JSON.stringify(data))
                return new Response(JSON.stringify({ status: 'success' }), { headers })
            }
            break
            
        default:
            return new Response(JSON.stringify({ error: 'Not found' }), { 
                status: 404, 
                headers 
            })
    }
    
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
        status: 405, 
        headers 
    })
}
