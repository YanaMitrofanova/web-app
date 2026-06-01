// Импорт стилей (Vite сам добавит их на страницу)
import './style.css';

const API_URL = 'web-app-production-656b.up.railway.app';

// Система роутинга
function navigate(pageId) {
    const currentUser = localStorage.getItem('currentUser');
    
    if (!currentUser && pageId !== 'login') {
        return navigate('login');
    }

    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(`page-${pageId}`).classList.add('active');

    const nav = document.getElementById('main-nav');
    if (pageId === 'login') {
        nav.style.display = 'none';
    } else {
        nav.style.display = 'flex';
        document.getElementById('user-info').innerText = currentUser;
    }

    if (pageId === 'feed') renderFeed();
    if (pageId === 'profile') renderMyItems();
}

// Авторизация (Локальная сессия пользователя сохраняется, но товары грузятся с сервера)
document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    if (username) {
        localStorage.setItem('currentUser', username);
        document.getElementById('login-form').reset();
        navigate('feed');
    }
});

// Выход
function logout() {
    localStorage.removeItem('currentUser');
    navigate('login');
}

// Шаблон разметки для карточки товара
function createCardHTML(item, isMyItem = false) {
  const defaultImg = 'https://placeholder.com';
  
  // Создаем кнопку удаления, если это объявление текущего пользователя
  const deleteButtonHTML = isMyItem 
      ? `<button class="delete-btn" data-id="${item.id}">Удалить объявление</button>` 
      : '';

  return `
      <div class="card">
          <img src="${item.img || defaultImg}" alt="${item.title}">
          <h4>${item.title}</h4>
          <div class="price">${item.price} ₽</div>
          <p style="font-size:12px; color:#666;">${item.desc || ''}</p>
          <div style="font-size:11px; color:#999; margin-top:5px;">Продавец: ${item.user}</div>
          ${deleteButtonHTML}
      </div>
  `;
}

// Отображение ленты (Запрос к базе данных)
async function renderFeed() {
  const filter = document.getElementById('filter-category').value;
  const container = document.getElementById('feed-items');
  const currentUser = localStorage.getItem('currentUser');
  
  try {
      // Отправляем GET-запрос с фильтром категории на бэкенд
      const response = await fetch(`${API_URL}/products?category=${filter}`);
      const products = await response.json();
      
      container.innerHTML = products.length 
          ? products.map(item => {
              // Так как в SQLite ID числовой, приводим типы к строке на всякий случай
              const isMyItem = String(item.user) === String(currentUser);
              return createCardHTML(item, isMyItem);
            }).join('') 
          : '<p>Объявлений пока нет.</p>';
  } catch (error) {
      console.error('Ошибка загрузки ленты:', error);
      container.innerHTML = '<p style="color: red;">Не удалось загрузить объявления.</p>';
  }
}

// Создание объявления (POST запрос к бэкенду)
document.getElementById('create-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const newProduct = {
        title: document.getElementById('prod-title').value,
        price: Number(document.getElementById('prod-price').value),
        category: document.getElementById('prod-category').value,
        img: document.getElementById('prod-img').value,
        desc: document.getElementById('prod-desc').value,
        user: localStorage.getItem('currentUser')
    };

    try {
        const response = await fetch(`${API_URL}/products`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newProduct)
        });

        if (response.ok) {
            document.getElementById('create-form').reset();
            navigate('feed');
        } else {
            alert('Ошибка при сохранении объявления на сервере');
        }
    } catch (error) {
        console.error('Ошибка отправки формы:', error);
        alert('Сервер недоступен');
    }
});

// Мои объявления в личном кабинете (Запрос к БД + фильтрация)
async function renderMyItems() {
  const currentUser = localStorage.getItem('currentUser');
  const container = document.getElementById('my-items');
  
  try {
      // Запрашиваем все товары и фильтруем по текущему пользователю
      const response = await fetch(`${API_URL}/products`);
      const products = await response.json();
      
      const myProducts = products.filter(p => String(p.user) === String(currentUser));
      
      container.innerHTML = myProducts.length 
          ? myProducts.map(item => createCardHTML(item, true)).join('') 
          : '<p>У вас еще нет объявлений.</p>';
  } catch (error) {
      console.error('Ошибка загрузки личных объявлений:', error);
      container.innerHTML = '<p style="color: red;">Не удалось загрузить ваши объявления.</p>';
  }
}

// Функция удаления объявления (DELETE запрос к бэкенду)
async function deleteItem(id) {
  if (confirm('Вы уверены, что хотите удалить это объявление?')) {
      try {
          const response = await fetch(`${API_URL}/products/${id}`, {
              method: 'DELETE'
          });

          if (response.ok) {
              // Проверяем какая страница активна и обновляем её контент
              const activePage = document.querySelector('.page.active').id;
              if (activePage === 'page-feed') renderFeed();
              if (activePage === 'page-profile') renderMyItems();
          } else {
              alert('Не удалось удалить объявление на сервере');
          }
      } catch (error) {
          console.error('Ошибка удаления:', error);
          alert('Сервер недоступен');
      }
  }
}

// Делегирование событий клика для кнопок удаления (Для обоих контейнеров)
document.getElementById('feed-items').addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-btn')) {
        const itemId = Number(e.target.getAttribute('data-id'));
        deleteItem(itemId);
    }
});

document.getElementById('my-items').addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-btn')) {
        const itemId = Number(e.target.getAttribute('data-id'));
        deleteItem(itemId);
    }
});

// НАЗНАЧЕНИЕ СОБЫТИЙ (вместо onclick в HTML)
document.getElementById('nav-feed').addEventListener('click', () => navigate('feed'));
document.getElementById('nav-create').addEventListener('click', () => navigate('create'));
document.getElementById('nav-profile').addEventListener('click', () => navigate('profile'));
document.getElementById('nav-logout').addEventListener('click', logout);
document.getElementById('filter-category').addEventListener('change', renderFeed);

// Проверка сессии при загрузке
if (localStorage.getItem('currentUser')) {
    navigate('feed');
} else {
    navigate('login');
}
