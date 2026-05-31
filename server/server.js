const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
    origin: [
      'https://web-app-kappa-neon.vercel.app', // Вставьте сюда скопированный адрес из Шага 1
      'http://localhost:5173',                  // Оставляем для локальной разработки
      'http://localhost:3000'
    ],
    credentials: true
  }));
app.use(express.json());

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("❌ ОШИБКА: Забыли заполнить .env файл!");
    process.exit(1);
}

const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation' 
};

app.get('/api/products', async (req, res) => {
    try {
        const { category } = req.query;
        
        const params = new URLSearchParams({ order: 'created_at.desc' });
        
        if (category && category !== 'all') {
            params.append('category', `eq.${category}`);
        }

        const url = `${SUPABASE_URL}/rest/v1/products?${params.toString()}`;
        
        const response = await fetch(url, { headers });
        if (!response.ok) throw new Error(`БД вернула статус ${response.status}`);
        
        const data = await response.json();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/products', async (req, res) => {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/products`, {
            method: 'POST',
            headers,
            body: JSON.stringify(req.body)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Ошибка на стороне базы данных');
        }

        res.status(201).json(data[0] || data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


app.delete('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const url = `${SUPABASE_URL}/rest/v1/products?id=eq.${id}`;

        const response = await fetch(url, {
            method: 'DELETE',
            headers
        });

        if (!response.ok) throw new Error('Ошибка удаления на удаленной БД');
        
        res.json({ message: 'Объявление успешно удалено', id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(port, () => {
    console.log(`🚀 Сервер успешно запущен на порту ${port}`);
    console.log(`📡 Подключено к Supabase REST API без бинарных зависимостей!`);
});
