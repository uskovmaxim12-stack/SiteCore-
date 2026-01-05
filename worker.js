// Основной обработчик
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

// Разрешенные источники (CORS)
const allowedOrigins = [
  'https://uskovmaxim12-stack.github.io/SiteCore-/',
  'http://localhost:3000',
  'http://127.0.0.1:5500'
]

// Обработка запросов
async function handleRequest(request) {
  const url = new URL(request.url)
  const path = url.pathname
  const method = request.method
  
  // Настройка CORS
  const origin = request.headers.get('origin')
  const corsHeaders = {
    'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  }

  // Обработка предварительного запроса OPTIONS
  if (method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Маршрутизация
    switch (path) {
      case '/api/database':
        return await handleDatabaseRequest(request, corsHeaders)
      case '/api/orders':
        return await handleOrdersRequest(request, corsHeaders)
      case '/api/users':
        return await handleUsersRequest(request, corsHeaders)
      case '/api/messages':
        return await handleMessagesRequest(request, corsHeaders)
      default:
        return new Response(JSON.stringify({ error: 'Not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}

// Обработка запросов к базе данных
async function handleDatabaseRequest(request, corsHeaders) {
  const method = request.method
  
  switch (method) {
    case 'GET':
      const data = await SITECORE_DB.get('database', 'json')
      return new Response(JSON.stringify(data || {
        users: {
          clients: [],
          developers: [
            { id: 'dev_1', name: 'Максим', password: '140612', avatar: 'М', email: 'maxim@sitecore.ru' },
            { id: 'dev_2', name: 'Александр', password: '789563', avatar: 'А', email: 'alexander@sitecore.ru' }
          ]
        },
        orders: [],
        messages: [],
        settings: {
          discountActive: true,
          discountPercent: 15,
          lastUpdated: new Date().toISOString()
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
      
    case 'POST':
      const newData = await request.json()
      await SITECORE_DB.put('database', JSON.stringify(newData))
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
      
    default:
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
  }
}

// Обработка запросов заказов
async function handleOrdersRequest(request, corsHeaders) {
  const method = request.method
  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  
  let database = await SITECORE_DB.get('database', 'json') || { orders: [] }
  
  switch (method) {
    case 'GET':
      if (id) {
        const order = database.orders.find(o => o.id === id)
        return new Response(JSON.stringify(order || null), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      return new Response(JSON.stringify(database.orders), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
      
    case 'POST':
      const newOrder = await request.json()
      database.orders.push({
        ...newOrder,
        id: 'order_' + Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      await SITECORE_DB.put('database', JSON.stringify(database))
      return new Response(JSON.stringify({ success: true, id: newOrder.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
      
    case 'PUT':
      const updatedOrder = await request.json()
      const orderIndex = database.orders.findIndex(o => o.id === id)
      if (orderIndex === -1) {
        return new Response(JSON.stringify({ error: 'Order not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      database.orders[orderIndex] = {
        ...database.orders[orderIndex],
        ...updatedOrder,
        updatedAt: new Date().toISOString()
      }
      await SITECORE_DB.put('database', JSON.stringify(database))
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
      
    case 'DELETE':
      database.orders = database.orders.filter(o => o.id !== id)
      await SITECORE_DB.put('database', JSON.stringify(database))
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
      
    default:
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
  }
}

// Обработка запросов пользователей
async function handleUsersRequest(request, corsHeaders) {
  const method = request.method
  const url = new URL(request.url)
  const type = url.searchParams.get('type')
  const email = url.searchParams.get('email')
  
  let database = await SITECORE_DB.get('database', 'json') || { users: { clients: [], developers: [] } }
  
  switch (method) {
    case 'GET':
      if (email) {
        const user = database.users.clients.find(c => c.email === email) || 
                     database.users.developers.find(d => d.email === email)
        return new Response(JSON.stringify(user || null), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      if (type === 'clients') {
        return new Response(JSON.stringify(database.users.clients), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      } else if (type === 'developers') {
        return new Response(JSON.stringify(database.users.developers), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
    case 'POST':
      const newUser = await request.json()
      if (newUser.type === 'client') {
        // Проверка на существующего пользователя
        if (database.users.clients.find(c => c.email === newUser.email)) {
          return new Response(JSON.stringify({ error: 'User already exists' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
        database.users.clients.push({
          ...newUser,
          id: 'client_' + Date.now(),
          createdAt: new Date().toISOString()
        })
      }
      await SITECORE_DB.put('database', JSON.stringify(database))
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
      
    default:
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
  }
}

// Обработка запросов сообщений
async function handleMessagesRequest(request, corsHeaders) {
  const method = request.method
  const url = new URL(request.url)
  const orderId = url.searchParams.get('orderId')
  
  let database = await SITECORE_DB.get('database', 'json') || { messages: [] }
  
  switch (method) {
    case 'GET':
      const messages = orderId 
        ? database.messages.filter(m => m.orderId === orderId)
        : database.messages
      return new Response(JSON.stringify(messages), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
      
    case 'POST':
      const newMessage = await request.json()
      database.messages.push({
        ...newMessage,
        id: 'msg_' + Date.now(),
        timestamp: new Date().toISOString(),
        read: false
      })
      await SITECORE_DB.put('database', JSON.stringify(database))
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
      
    default:
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
  }
}
